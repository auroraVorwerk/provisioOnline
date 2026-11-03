/**
 * Provisio Online – Anmeldung über den Server und verschlüsselter Abgleich
 *
 * Ende-zu-Ende-Verschlüsselung:
 *  - Das Passwort verlässt das Gerät nie. Zum Server geht nur ein daraus
 *    abgeleiteter Prüfwert (PBKDF2, 150 000 Runden, eigener Zweck-Salt).
 *  - Alle Daten werden auf dem Gerät mit dem Master Key (AES-256-GCM)
 *    verschlüsselt. Auch die Namen der Datensätze sind verschleiert (HMAC).
 *  - Ohne Netz läuft alles lokal weiter; der Abgleich holt nach.
 *
 * Abgleich je Eintrag: Jeder Termin, Kunde, jede Einstellung … ist ein eigener
 * Datensatz mit Zeitstempel. Neue Einträge von mehreren Geräten bleiben alle
 * erhalten. Wurde derselbe Eintrag auf zwei Geräten geändert, gewinnt die
 * neuere Fassung; die ältere landet unter „Konflikte“ und lässt sich zurückholen.
 * Gelöschtes bleibt überall gelöscht.
 */
(function () {
  const API = "https://provisioonlinensg87iza-api.functions.fnc.fr-par.scw.cloud";
  if (/[?&]demo(?:[=&]|$)/.test(location.search)) return; // Vorschau bleibt rein lokal
  if (typeof lgWeiter !== "function" || typeof flushSave !== "function") return;

  /* Laufzeit-Zustand (nur im Arbeitsspeicher) */
  const O = { dk: null, auth: null, it: 0, token: null, gueltig: 0, einladen: false, nochmal: false };
  let S = null; // Abgleich-Stand (verschlüsselt auf dem Gerät abgelegt)
  let status = { art: "aus", text: "", zeit: 0 };
  let idSchluessel = null;
  const idCache = new Map();

  /* ---------- Hilfen ---------- */
  /* Der Wiederherstellungs-Code hat 24 Zufallszeichen (~120 Bit) – hier zählt die
     Rundenzahl kaum; sie bleibt fest, damit bestehende Codes gültig bleiben. */
  const REC_IT = 150000;
  const itMerken = (dk, it) => store.set("bw-authit-" + dk, it);
  const itGemerkt = (dk) => store.get("bw-authit-" + dk) || KDF_ITER;
  async function ableiten(geheim, zweck, dk, it) {
    const basis = await crypto.subtle.importKey("raw", _te.encode(geheim), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: _te.encode("provisio-online/" + zweck + "/" + dk), iterations: it || KDF_ITER, hash: "SHA-256" },
      basis,
      256,
    );
    return _b64(bits);
  }
  class ApiFehler extends Error {
    constructor(st, text, daten, token) {
      super(text);
      this.status = st;
      this.daten = daten || {};
      this.token = token || null; // mit welchem Token die Anfrage lief
    }
  }
  async function api(pfad, body, mitToken) {
    let r;
    const token = mitToken ? O.token : null;
    try {
      const kopf = { "Content-Type": "application/json" };
      if (token) kopf.Authorization = "Bearer " + token;
      r = await fetch(API + "/" + pfad, {
        method: "POST",
        headers: kopf,
        body: JSON.stringify(body || {}),
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
    } catch (e) {
      throw new ApiFehler(0, "Keine Verbindung zum Server.");
    }
    let d = {};
    try {
      d = await r.json();
    } catch (e) {}
    if (!r.ok) throw new ApiFehler(r.status, d.fehler || "Serverfehler (" + r.status + ").", d, token);
    return d;
  }
  /* Stabile Textform (sortierte Schlüssel) und kurzer Prüfwert */
  function stabil(v) {
    if (Array.isArray(v)) return "[" + v.map(stabil).join(",") + "]";
    if (v && typeof v === "object")
      return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stabil(v[k])).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function pruefwert(str) {
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(36) + "." + (h1 >>> 0).toString(36) + "." + str.length.toString(36);
  }
  const hv = (v) => pruefwert(stabil(v));

  /* ---------- Datensätze ---------- */
  const OBJ = ["entries", "jobtickets", "teamumsatz", "inventur", "nachtrag", "settings", "wunsch"];
  const ARR = ["potenzial", "empfehlungen", "interessenten", "wiedervorlagen", "fahrten", "verlauf", "archiv", "einkaeufe", "papierkorb"];
  const NUR_GERAET = ["einfuehrung"]; // Einstellungen, die je Gerät bleiben
  const TR = "\u0001";
  function zerlegen(blob) {
    const m = new Map();
    OBJ.forEach((c) => {
      const o = (blob && blob[c]) || {};
      Object.keys(o).forEach((k) => {
        if (c === "settings" && NUR_GERAET.includes(k)) return;
        m.set(c + TR + k, o[k]);
      });
    });
    ARR.forEach((c) => {
      const zaehl = {};
      ((blob && blob[c]) || []).forEach((x) => {
        let id = x && typeof x === "object" && x.id != null ? "i:" + x.id : "h:" + hv(x);
        zaehl[id] = (zaehl[id] || 0) + 1;
        if (zaehl[id] > 1) id += "~" + zaehl[id];
        m.set(c + TR + id, x);
      });
    });
    return m;
  }
  function zusammensetzen(m) {
    const b = {};
    OBJ.forEach((c) => (b[c] = {}));
    ARR.forEach((c) => (b[c] = []));
    m.forEach((v, k) => {
      const i = k.indexOf(TR);
      const c = k.slice(0, i);
      if (OBJ.includes(c)) b[c][k.slice(i + 1)] = v;
      else if (ARR.includes(c)) b[c].push(v);
    });
    return b;
  }
  const jetztStand = () => zerlegen(clean(dataBlob()));

  /* Verschleierte Kennung je Datensatz: HMAC mit einem aus dem Master Key abgeleiteten Schlüssel */
  async function kennung(k) {
    if (idCache.has(k)) return idCache.get(k);
    if (!idSchluessel) {
      const roh = await crypto.subtle.exportKey("raw", masterKey);
      const hk = await crypto.subtle.importKey("raw", roh, "HKDF", false, ["deriveKey"]);
      idSchluessel = await crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: _te.encode("provisio-online"), info: _te.encode("kennung") },
        hk,
        { name: "HMAC", hash: "SHA-256", length: 256 },
        false,
        ["sign"],
      );
    }
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", idSchluessel, _te.encode(k)));
    const id = _b64(sig).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 32);
    idCache.set(k, id);
    return id;
  }

  /* ---------- Abgleich-Stand je Konto (verschlüsselt im Gerätespeicher) ---------- */
  const STAND_KEY = (dk) => "bw-sync-" + dk;
  async function standLaden() {
    if (S && S.dk === me.dk) return S;
    S = { dk: me.dk, rev: 0, basis: {}, stempel: {}, konflikte: [], profilOffen: false };
    const roh = store.get(STAND_KEY(me.dk));
    if (roh && roh.ct && masterKey) {
      try {
        Object.assign(S, JSON.parse(await _aesDec(masterKey, roh)), { dk: me.dk });
      } catch (e) {}
    }
    return S;
  }
  async function standSpeichern() {
    if (!S || !masterKey || !me || S.dk !== me.dk) return;
    const { dk, ...rest } = S;
    store.set(STAND_KEY(dk), await _aesEnc(masterKey, JSON.stringify(rest)));
  }
  /* Lokale Änderungen mit Zeitstempel versehen (für die Entscheidung bei Konflikten) */
  function stempeln(m) {
    const jetzt = Date.now();
    let neu = false;
    m.forEach((v, k) => {
      const h = hv(v);
      const s = S.stempel[k];
      if (!s || s[0] !== h) {
        S.stempel[k] = [h, jetzt];
        neu = true;
      }
    });
    Object.keys(S.stempel).forEach((k) => {
      if (!m.has(k) && S.stempel[k][0] !== null) {
        S.stempel[k] = [null, jetzt];
        neu = true;
      }
    });
    return neu;
  }

  /* ---------- Status ---------- */
  function statusSetzen(art, text) {
    status = { art, text: text || "", zeit: art === "ok" ? Date.now() : status.zeit };
    const el = document.getElementById("saveState");
    if (el && me) {
      const t =
        art === "ok"
          ? "gespeichert · online abgeglichen"
          : art === "laeuft"
            ? "gleicht ab …"
            : art === "offline"
              ? "gespeichert · offline, gleicht später ab"
              : art === "anmelden"
                ? "Abgleich pausiert · bitte neu anmelden"
                : art === "fehler"
                  ? "gespeichert · Abgleich fehlgeschlagen"
                  : "";
      if (t) {
        el.textContent = t;
        el.classList.toggle("warn", art === "fehler" || art === "anmelden");
        el.title = text || t;
      }
    }
    const z = document.getElementById("onStatus");
    if (z) z.innerHTML = statusZeile();
  }
  function statusZeile() {
    const uhr = (t) => (t ? new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–");
    if (status.art === "ok") return "Abgeglichen um " + uhr(status.zeit);
    if (status.art === "laeuft") return "Gleicht gerade ab …";
    if (status.art === "offline") return "Offline · zuletzt abgeglichen " + uhr(status.zeit);
    if (status.art === "anmelden") return status.text || "Bitte ab- und wieder anmelden.";
    if (status.art === "fehler") return "Fehler: " + (status.text || "unbekannt");
    return "Noch nicht abgeglichen";
  }

  /* ---------- Bereitschaft ---------- */
  const tutorAktiv = () => !!(window.einfuehrungZustand && window.einfuehrungZustand.aktiv);
  const bereit = () =>
    !!(me && dataReady && masterKey && !fremdAktiv && !viewUser && O.dk && me.dk === O.dk && !tutorAktiv());

  /* Server meldet: Sitzung beendet (anderes Gerät hat „überall abmelden“ gewählt oder Passwort geändert) */
  async function zwangsAbmelden(text) {
    O.dk = null;
    O.auth = null;
    O.token = null;
    try {
      await logout();
    } finally {
      lgErrText = text || "Du wurdest abgemeldet. Bitte neu anmelden.";
      lgStep = "login";
      renderLogin();
    }
  }
  async function tokenSichern() {
    if (O.token && O.gueltig > Date.now() + 60e3) return true;
    if (!O.auth || !O.dk) return false;
    try {
      const a = await api("anmelden", { dk: O.dk, auth: O.auth });
      O.token = a.token;
      O.gueltig = a.gueltig;
      O.einladen = !!a.einladen;
      return true;
    } catch (e) {
      if (e.status === 401) {
        zwangsAbmelden("Dein Passwort wurde geändert. Bitte mit dem neuen Passwort anmelden.");
        return false;
      }
      throw e;
    }
  }

  /* Ferne Fassung in die App übernehmen (nur wenn kein Fenster offen ist) */
  async function uebernehmen(m) {
    const blob = zusammensetzen(m);
    NUR_GERAET.forEach((k) => {
      if (settings[k] !== undefined) blob.settings[k] = settings[k];
    });
    dataReady = false;
    applyData(blob);
    shadow = JSON.parse(JSON.stringify(clean(dataBlob())));
    dataReady = true;
    await flushOhne();
    try {
      renderAll();
    } catch (e) {}
  }
  const fensterOffen = () =>
    (typeof modal !== "undefined" && modal.classList.contains("open")) || !!document.querySelector(".unter .sheet, #modal.open");

  /* ---------- Der Abgleich ---------- */
  /* Läuft schon ein Abgleich, wartet ein weiterer Aufruf darauf und gleicht danach erneut ab */
  let aktuell = null;
  function abgleich() {
    if (aktuell) {
      O.nochmal = true;
      return aktuell;
    }
    aktuell = abgleichLauf().finally(() => (aktuell = null));
    return aktuell;
  }
  async function abgleichLauf() {
    if (!bereit()) return;
    if (!navigator.onLine) return statusSetzen("offline");
    statusSetzen("laeuft");
    try {
      for (let runde = 0; runde < 5; runde++) {
        if (!(await tokenSichern())) {
          if (status.art !== "anmelden") statusSetzen("offline");
          return;
        }
        await standLaden();
        if (S.profilOffen) await profilSenden();
        const h = await api("holen", { seit: S.rev }, true);
        if (h.neu) S.basis = {};
        /* Kennungen der bekannten Datensätze (für Löschungen) */
        let m = jetztStand();
        const ids = new Map();
        for (const k of new Set([...m.keys(), ...Object.keys(S.basis)])) ids.set(await kennung(k), k);
        const rein = [];
        for (const it of h.items) {
          if (it.x === 1) {
            const k = ids.get(it.i);
            if (k) rein.push({ k, del: true, t: it.t });
            continue;
          }
          try {
            const p = JSON.parse(await _aesDec(masterKey, it.c));
            if (typeof p.k === "string") rein.push({ k: p.k, v: entschaerfen(p.v), t: it.t });
          } catch (e) {
            /* nicht lesbar (fremder Schlüssel) → übergehen */
          }
        }
        if (!bereit()) return;
        if (rein.length && fensterOffen()) {
          O.nochmal = true; // nach dem Schließen des Fensters erneut
          statusSetzen("offline");
          return;
        }
        m = jetztStand();
        let geaendert = false;
        for (const r of rein) {
          const lokalH = m.has(r.k) ? hv(m.get(r.k)) : undefined;
          const fernH = r.del ? undefined : hv(r.v);
          if (lokalH === fernH) {
            basisSetzen(r.k, fernH);
            continue;
          }
          if (lokalH !== S.basis[r.k]) {
            /* Auf beiden Seiten geändert → die neuere Fassung gewinnt, die andere wird aufgehoben */
            const lokalT = (S.stempel[r.k] && S.stempel[r.k][1]) || 0;
            if (lokalT > r.t) {
              konfliktMerken(r.k, r.del ? null : r.v, r.t, "vom anderen Gerät");
              basisSetzen(r.k, fernH); // lokale Fassung wird gleich gesendet
              continue;
            }
            konfliktMerken(r.k, m.has(r.k) ? m.get(r.k) : null, lokalT, "von diesem Gerät");
          }
          if (r.del) m.delete(r.k);
          else m.set(r.k, r.v);
          basisSetzen(r.k, fernH);
          S.stempel[r.k] = [fernH === undefined ? null : fernH, r.t];
          geaendert = true;
        }
        if (geaendert) {
          await uebernehmen(m);
          m = jetztStand();
          stempeln(m);
        }
        S.rev = h.neu ? h.rev : Math.max(S.rev, h.rev);
        await standSpeichern();

        /* Eigene Änderungen senden (in Paketen) */
        const raus = [];
        m.forEach((v, k) => {
          const hh = hv(v);
          if (S.basis[k] !== hh) raus.push({ k, v, h: hh });
        });
        Object.keys(S.basis).forEach((k) => {
          if (!m.has(k)) raus.push({ k, del: true });
        });
        let neuerStand = false;
        for (let i = 0; i < raus.length; i += 400) {
          const teil = raus.slice(i, i + 400);
          const items = [];
          for (const x of teil) {
            const t = (S.stempel[x.k] && S.stempel[x.k][1]) || Date.now();
            const id = await kennung(x.k);
            items.push(
              x.del ? { i: id, t, x: 1 } : { i: id, t, c: await _aesEnc(masterKey, JSON.stringify({ k: x.k, v: x.v })) },
            );
          }
          try {
            const r = await api("senden", { basis: S.rev, items }, true);
            S.rev = r.rev;
          } catch (e) {
            if (e.status === 409) {
              neuerStand = true;
              break;
            }
            throw e;
          }
          teil.forEach((x) => basisSetzen(x.k, x.del ? undefined : x.h));
          await standSpeichern();
        }
        if (neuerStand) continue; // ein anderes Gerät war schneller → erst holen
        /* Aufräumen: bestätigte Löschungen brauchen keinen Stempel mehr */
        Object.keys(S.stempel).forEach((k) => {
          if (S.stempel[k][0] === null && S.basis[k] === undefined) delete S.stempel[k];
        });
        await standSpeichern();
        statusSetzen("ok");
        return;
      }
      statusSetzen("fehler", "Zu viele gleichzeitige Änderungen – versuche es gleich noch einmal.");
    } catch (e) {
      if (e.status === 401 && e.daten.grund === "abgemeldet" && e.token === O.token) {
        /* nur wenn das aktuelle Token betroffen ist – nicht bei einem gerade ersetzten (Passwortwechsel) */
        zwangsAbmelden(e.message);
      } else if (e.status === 401) {
        O.token = null;
        O.nochmal = true;
      } else if (e.status === 0) statusSetzen("offline");
      else statusSetzen("fehler", e.message);
    } finally {
      if (O.nochmal) {
        O.nochmal = false;
        setTimeout(abgleich, 1500);
      }
    }
  }
  function basisSetzen(k, h) {
    if (h === undefined) delete S.basis[k];
    else S.basis[k] = h;
  }
  function konfliktMerken(k, v, t, quelle) {
    S.konflikte.unshift({ k, v, t, quelle, wann: Date.now() });
    S.konflikte = S.konflikte.slice(0, 100);
  }

  /* Nach jedem Speichern stempeln und (verzögert) abgleichen */
  const flushOhne = flushSave;
  let planTimer = null;
  flushSave = async function () {
    const r = await flushOhne.apply(this, arguments);
    if (bereit()) {
      await standLaden();
      if (stempeln(jetztStand())) {
        await standSpeichern();
        planen();
      }
    }
    return r;
  };
  function planen(ms) {
    clearTimeout(planTimer);
    planTimer = setTimeout(abgleich, ms || 2500);
  }
  setInterval(() => {
    if (document.visibilityState === "visible") abgleich();
  }, 60e3);
  addEventListener("online", () => planen(500));
  addEventListener("offline", () => me && O.dk && statusSetzen("offline"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") planen(800);
  });
  /* Nach dem Schließen eines Fensters liegengebliebenen Abgleich nachholen */
  if (typeof closeModal === "function") {
    const schliessenOhne = closeModal;
    closeModal = function () {
      const r = schliessenOhne.apply(this, arguments);
      if (O.dk) planen(1500);
      return r;
    };
  }

  /* Erst-Abgleich vor dem Start, wenn das Gerät noch keine Daten hat (neues Gerät) */
  async function erstAbgleich(dk) {
    try {
      if (await datenLesen(dk)) return;
      const h = await api("holen", { seit: 0 }, true);
      const m = new Map();
      const stempel = {},
        basis = {};
      for (const it of h.items) {
        if (it.x === 1) continue;
        try {
          const p = JSON.parse(await _aesDec(masterKey, it.c));
          m.set(p.k, p.v);
          basis[p.k] = hv(p.v);
          stempel[p.k] = [basis[p.k], it.t];
        } catch (e) {}
      }
      if (!m.size) return;
      const blob = zusammensetzen(m);
      const env = await _aesEnc(masterKey, JSON.stringify(blob));
      await datenSchreiben(dk, { enc: 1, iv: env.iv, ct: env.ct });
      S = { dk, rev: h.rev, basis, stempel, konflikte: [], profilOffen: false };
      const { dk: _x, ...rest } = S;
      store.set(STAND_KEY(dk), await _aesEnc(masterKey, JSON.stringify(rest)));
    } catch (e) {
      /* ohne Netz: der normale Abgleich holt es später */
    }
  }

  /* ---------- Profil (Name, Rolle, Team) verschlüsselt ---------- */
  const NICHT_IM_PROFIL = ["mkByPw", "mkByCode", "lastLogin", "dk", "einladen"];
  async function profilChiffrat(u) {
    const p = {};
    Object.keys(u).forEach((k) => {
      if (!NICHT_IM_PROFIL.includes(k)) p[k] = u[k];
    });
    return _aesEnc(masterKey, JSON.stringify(p));
  }
  async function profilLesen(c) {
    try {
      return entschaerfen(JSON.parse(await _aesDec(masterKey, c)));
    } catch (e) {
      return {};
    }
  }
  let letztesProfil = "";
  async function profilSenden() {
    if (!me || !masterKey || !O.token) return;
    const p = {};
    Object.keys(me).forEach((k) => {
      if (!NICHT_IM_PROFIL.includes(k)) p[k] = me[k];
    });
    const s = stabil(p);
    if (s === letztesProfil && !S.profilOffen) return;
    try {
      await api("profil", { profil: await profilChiffrat(me) }, true);
      letztesProfil = s;
      S.profilOffen = false;
    } catch (e) {
      S.profilOffen = true;
    }
    await standSpeichern();
  }
  const userSetOhne = userSet;
  userSet = async function (u) {
    const r = await userSetOhne.apply(this, arguments);
    if (O.dk && me && u && u.dk === me.dk && masterKey && !O.still) {
      await standLaden();
      S.profilOffen = true;
      await standSpeichern();
      planen(1500);
    }
    return r;
  };

  /* ---------- Anmeldung, Registrierung, Passwort vergessen ---------- */
  function sitzungMerken(dk, auth, a, it) {
    O.dk = dk;
    O.auth = auth;
    O.it = it || KDF_ITER;
    O.token = (a && a.token) || null;
    O.gueltig = (a && a.gueltig) || 0;
    O.einladen = !!(a && a.einladen);
    S = null;
    idSchluessel = null;
    idCache.clear();
  }
  async function lokalSichern(u) {
    O.still = true;
    try {
      await userSet(u);
    } finally {
      O.still = false;
    }
  }
  async function serverKontoUebernehmen(dk, a, mk, extra) {
    masterKey = mk;
    const profil = await profilLesen(a.profil);
    const alt = (await userGet(dk)) || {};
    const u = { ...alt, ...profil, ...extra, dk, mkByPw: a.mkByPw || extra.mkByPw, einladen: !!a.einladen };
    if (a.mkByCode) u.mkByCode = a.mkByCode;
    if (!u.rolle) u.rolle = ROLLE_KB;
    if (!Array.isArray(u.team)) u.team = [];
    await lokalSichern(u);
    letztesProfil = "";
    return u;
  }

  async function anmelden(dk, pw) {
    if (!pw) throw new Error(FALSCH);
    let a, auth, it;
    try {
      it = (await api("parameter", { dk })).it;
      auth = await ableiten(pw, "auth", dk, it);
      a = await api("anmelden", { dk, auth });
    } catch (e) {
      if (e.status !== 0) throw e;
      it = itGemerkt(dk);
      auth = await ableiten(pw, "auth", dk, it);
      /* Ohne Netz: mit dem zuletzt auf diesem Gerät bestätigten Zugang */
      const u = await userGet(dk);
      if (!u || !u.mkByPw)
        throw new Error("Keine Verbindung. Auf diesem Gerät warst du noch nicht angemeldet – dafür braucht es einmal Internet.");
      const mk = await kontoOeffnenMitPw(u, pw);
      if (!mk) throw new Error(FALSCH);
      sitzungMerken(dk, auth, null, it);
      store.set("bw-session", { dk });
      setTimeout(() => statusSetzen("offline"), 300);
      return starteSitzung(u);
    }
    const mk = await mkOeffnen(a.mkByPw, pw);
    if (!mk) throw new Error(FALSCH);
    /* Konto aus Online 1.0: Prüfwert und Umschlag auf 600.000 Runden heben */
    if (it < KDF_ITER || umschlagAlt(a.mkByPw)) {
      const auth2 = await ableiten(pw, "auth", dk, KDF_ITER);
      const mkByPw2 = await mkUmschliessen(mk, pw);
      O.token = a.token;
      const r = await api("passwort", { alt: auth, auth: auth2, mkByPw: mkByPw2 }, true);
      Object.assign(a, { token: r.token, gueltig: r.gueltig, mkByPw: mkByPw2 });
      auth = auth2;
      it = KDF_ITER;
    }
    itMerken(dk, it);
    sitzungMerken(dk, auth, a, it);
    const u = await serverKontoUebernehmen(dk, a, mk, {});
    store.set("bw-session", { dk });
    await erstAbgleich(dk);
    await starteSitzung(u);
    planen(1200);
  }

  async function registrieren(dk, pw, pw2) {
    if (!lg.vor || !lg.nach) throw new Error("Bitte Vor- und Nachnamen eintragen.");
    const einl = String(lg.einl || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .replace(/^PV/, "");
    if (einl.length !== 8) throw new Error("Bitte den Einladungscode eintragen (z. B. PV-AB12-CD34).");
    const pf = pwRegelFehler(pw);
    if (pf) throw new Error(pf);
    if (pw !== pw2) throw new Error("Die beiden Passwörter stimmen nicht überein.");
    const code = neuerWiederherstellungsCode();
    const u = { dk, vorname: lg.vor, nachname: lg.nach, rolle: ROLLE_KB, team: [] };
    await kontoKryptoAnlegen(u, pw, code); // setzt masterKey
    const auth = await ableiten(pw, "auth", dk, KDF_ITER);
    const rec = await ableiten(codeNorm(code), "rec", dk, REC_IT);
    const a = await api("registrieren", {
      dk,
      einladung: einl,
      auth,
      rec,
      mkByPw: u.mkByPw,
      mkByCode: u.mkByCode,
      profil: await profilChiffrat(u),
    });
    u.einladen = !!a.einladen;
    itMerken(dk, KDF_ITER);
    sitzungMerken(dk, auth, a, KDF_ITER);
    await lokalSichern(u);
    store.set("bw-session", { dk });
    loginEl.hidden = true;
    await zeigeWiederherstellungsCode(code);
    await starteSitzung(u);
    planen(1200);
  }

  async function wiederherstellen(dk, pw, pw2) {
    const cn = codeNorm(lg.code);
    if (!cn) throw new Error("Bitte den Wiederherstellungs-Code eintragen.");
    const pf = pwRegelFehler(pw);
    if (pf) throw new Error(pf);
    if (pw !== pw2) throw new Error("Die beiden neuen Passwörter stimmen nicht überein.");
    const rec = await ableiten(cn, "rec", dk, REC_IT);
    const w = await api("wiederherstellen", { dk, rec });
    const mk = await mkOeffnen(w.mkByCode, cn);
    if (!mk) throw new Error("Der Wiederherstellungs-Code stimmt nicht.");
    const mkByPw = await mkUmschliessen(mk, pw);
    const auth = await ableiten(pw, "auth", dk, KDF_ITER);
    const a = await api("passwort-neu", { reset: w.reset, auth, mkByPw });
    itMerken(dk, KDF_ITER);
    sitzungMerken(dk, auth, a, KDF_ITER);
    const u = await serverKontoUebernehmen(dk, { ...a, mkByPw, mkByCode: w.mkByCode }, mk, { mkByPw });
    store.set("bw-session", { dk });
    await erstAbgleich(dk);
    await starteSitzung(u);
    planen(1200);
  }

  const lgWeiterLokal = lgWeiter;
  lgWeiter = async function () {
    if (lgBusy) return;
    if (!["login", "reg1", "forgot"].includes(lgStep)) return lgWeiterLokal();
    merkeEingaben();
    lgErrText = "";
    const dk = lg.dk || "";
    const pw = wert("lgPw"),
      pw2 = wert("lgPw2");
    if (!/^DK\d{8}$/.test(dk)) return lgFehler("Die DK-Nummer besteht aus DK und acht Ziffern.");
    if (!CRYPTO_OK) return lgFehler("Für die Verschlüsselung muss die App über https:// laufen.");
    lgBusy = true;
    renderLogin();
    try {
      if (lgStep === "login") await anmelden(dk, pw);
      else if (lgStep === "reg1") await registrieren(dk, pw, pw2);
      else await wiederherstellen(dk, pw, pw2);
    } catch (err) {
      masterKey = me ? masterKey : null;
      lgBusy = false;
      return lgFehler((err && err.message) || FALSCH);
    }
  };
  const merkeOhne = merkeEingaben;
  merkeEingaben = function () {
    merkeOhne.apply(this, arguments);
    if (document.getElementById("lgEinl")) lg.einl = wert("lgEinl");
  };
  const renderLoginOhne = renderLogin;
  renderLogin = function () {
    renderLoginOhne.apply(this, arguments);
    const mark = loginBox.querySelector(".lgmark");
    if (mark && !mark.querySelector(".lgonline")) mark.insertAdjacentHTML("beforeend", ' <span class="lgonline">Online</span>');
    const sub = loginBox.querySelector(".lgsub");
    if (lgStep === "start" && sub) sub.textContent = "Melde dich an oder registriere dich mit einem Einladungscode.";
    if (lgStep === "login" && sub) sub.textContent = "Mit DK-Nummer und Passwort. Deine Daten werden verschlüsselt zwischen deinen Geräten abgeglichen.";
    if (lgStep === "reg1") {
      if (sub) sub.textContent = "Mit dem Einladungscode deiner Teamleitung und einem selbst gewählten Passwort.";
      const dkFeld = document.getElementById("lgDk");
      if (dkFeld && !document.getElementById("lgEinl"))
        dkFeld
          .closest(".field")
          .insertAdjacentHTML(
            "afterend",
            feld("lgEinl", "Einladungscode", lg.einl || "", 'placeholder="PV-XXXX-XXXX" autocapitalize="characters" spellcheck="false"'),
          );
    }
    if (lgStep === "forgot") {
      const hinweis = loginBox.querySelectorAll(".lgsub")[1];
      if (hinweis)
        hinweis.textContent =
          "Kein Code mehr? Ohne Passwort und ohne Code lassen sich die verschlüsselten Daten nicht mehr öffnen – auch nicht von uns.";
    }
    const fuss = loginBox.querySelector(".lghint:last-child");
    if (fuss)
      fuss.innerHTML =
        "DK-Nummer: DK und acht Ziffern ohne Leerzeichen.<br>Ende-zu-Ende-verschlüsselt · gespeichert in der EU (Paris).";
  };

  /* Abmelden: vorher noch abgleichen (höchstens 5 Sekunden), dann alles vergessen */
  const logoutOhne = logout;
  logout = async function () {
    if (bereit()) {
      clearTimeout(saveTimer);
      await flushSave();
      await Promise.race([abgleich(), new Promise((ok) => setTimeout(ok, 5000))]);
    }
    clearTimeout(planTimer);
    /* Sitzung auch auf dem Server beenden (abgefangene Token werden wertlos) */
    if (O.token) await Promise.race([api("abmelden", {}, true).catch(() => {}), new Promise((ok) => setTimeout(ok, 3000))]);
    const r = await logoutOhne.apply(this, arguments);
    Object.assign(O, { dk: null, auth: null, it: 0, token: null, gueltig: 0, einladen: false });
    S = null;
    idSchluessel = null;
    idCache.clear();
    status = { art: "aus", text: "", zeit: 0 };
    return r;
  };

  /* ---------- Passwort / Code in den Einstellungen ändern ---------- */
  window.onlinePasswort = async function (alt, neu, mkByPw) {
    if (!O.dk) return;
    if (!navigator.onLine) throw new Error("Dafür braucht es eine Internetverbindung.");
    await tokenSichern();
    const altAuth = await ableiten(alt, "auth", O.dk, O.it);
    const neuAuth = await ableiten(neu, "auth", O.dk, KDF_ITER);
    const a = await api("passwort", { alt: altAuth, auth: neuAuth, mkByPw }, true).catch((e) => {
      throw new Error(e.status === 0 ? "Dafür braucht es eine Internetverbindung." : e.message);
    });
    /* Token und Prüfwert gemeinsam ersetzen, damit ein laufender Abgleich nicht dazwischenfunkt */
    Object.assign(O, { token: a.token, gueltig: a.gueltig, auth: neuAuth, it: KDF_ITER });
    itMerken(O.dk, KDF_ITER);
  };
  window.onlineCode = async function (pw, code, mkByCode) {
    if (!O.dk) return;
    if (!navigator.onLine) throw new Error("Dafür braucht es eine Internetverbindung.");
    await tokenSichern();
    await api(
      "code",
      { auth: await ableiten(pw, "auth", O.dk, O.it), rec: await ableiten(codeNorm(code), "rec", O.dk, REC_IT), mkByCode },
      true,
    ).catch((e) => {
      throw new Error(e.status === 0 ? "Dafür braucht es eine Internetverbindung." : e.message);
    });
  };

  /* ---------- Einstellungen → Online-Konto ---------- */
  const NAMEN = {
    entries: "Termin",
    jobtickets: "Jobtickets",
    teamumsatz: "Teamumsatz",
    inventur: "Inventur",
    nachtrag: "Nachtrag",
    settings: "Einstellung",
    wunsch: "Provisionswunsch",
    potenzial: "Potenzial",
    empfehlungen: "Empfehlung",
    interessenten: "Interessent",
    wiedervorlagen: "Wiedervorlage",
    fahrten: "Fahrt",
    verlauf: "Verlauf",
    archiv: "Archiv",
    einkaeufe: "Einkauf",
    papierkorb: "Papierkorb",
  };
  function konfliktTitel(x) {
    const i = x.k.indexOf(TR);
    const c = x.k.slice(0, i),
      sub = x.k.slice(i + 1);
    const v = x.v || {};
    let det = "";
    if (c === "entries") {
      const [tag, h] = sub.split("|");
      det = (tag ? tag.split("-").reverse().join(".") : "") + (h ? ", " + h + " Uhr" : "");
      const n = [v.vorname, v.nachname].filter(Boolean).join(" ");
      if (n) det += " · " + n;
    } else if (v.name || v.nachname) det = v.name || [v.vorname, v.nachname].filter(Boolean).join(" ");
    else if (!/^[ih]:/.test(sub)) det = sub;
    return (NAMEN[c] || c) + (det ? " – " + det : "");
  }
  const esc = (t) => String(t == null ? "" : t).replace(/[<>&"']/g, (z) => ({ "<": "‹", ">": "›", "&": "&amp;", '"': "”", "'": "’" })[z]);

  function onlineUnterseite() {
    const kl = () => (S && S.konflikte) || [];
    const konfliktHTML = () =>
      kl().length
        ? kl()
            .map(
              (x, i) => `<div class="onkf"><div><b>${esc(konfliktTitel(x))}</b>
              <small>${x.v === null ? "gelöschte Fassung" : "ältere Fassung"} ${esc(x.quelle)} · ${new Date(x.t || x.wann).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</small></div>
              <div class="onkfk"><button type="button" class="btn" data-kfauf="${i}">Wiederherstellen</button>
              <button type="button" class="btn" data-kfweg="${i}">Verwerfen</button></div></div>`,
            )
            .join("")
        : `<p class="esfuss" style="margin:8px 4px">Keine Konflikte. Wenn derselbe Eintrag auf zwei Geräten geändert wird, findest du hier die ältere Fassung.</p>`;
    unterseiteOeffnen(
      "Online-Konto",
      "Einstellungen",
      `<div class="esgrp espad"><p class="onzeile"><b>${esc(me.dk)}</b><span id="onStatus">${statusZeile()}</span></p>
        <button type="button" class="btn primary" id="onJetzt" style="width:100%">Jetzt abgleichen</button></div>
      <p class="esfuss">Deine Daten werden auf dem Gerät verschlüsselt und erst dann übertragen. Der Server
        in Paris (Scaleway, EU) sieht nur unlesbare Daten – nie dein Passwort.</p>
      ${
        O.einladen
          ? `<p class="esgh">Einladen</p>
        <div class="esgrp espad"><label class="esz" style="padding:0"><span class="eszt">Darf selbst einladen<small>Für Teamleitungen</small></span>
          <input type="checkbox" role="switch" class="ioswitch" id="onTL"></label>
          <button type="button" class="btn" id="onEinl" style="width:100%;margin-top:10px">Einladungscode erstellen</button></div>
        <p class="esfuss">Jeder Code gilt einmal und 7 Tage. Ohne Code kann sich niemand registrieren.</p>`
          : ""
      }
      <p class="esgh">Konflikte</p>
      <div class="esgrp espad" id="onKf">${konfliktHTML()}</div>
      <p class="esgh">Konto</p>
      <div class="esgrp">${esZeile("onAlle", "Auf allen Geräten abmelden")}</div>
      <p class="esfuss">Beendet die Sitzungen auf allen Geräten, auch auf diesem. Nützlich, wenn ein Gerät verloren gegangen ist.</p>
      <div class="esgrp">${esZeile("onLoeschen", "Online-Konto löschen", "", "rot")}</div>
      <p class="esfuss">Löscht dein Konto und alle Daten auf dem Server endgültig. Die Daten auf diesem Gerät bleiben, bis du dich abmeldest.</p>`,
      async (ebene) => {
        await standLaden();
        ebene.querySelector("#onKf").innerHTML = konfliktHTML();
        ebene.querySelector("#onJetzt").onclick = () => abgleich();
        const e = ebene.querySelector("#onEinl");
        if (e) e.onclick = () => einladungDialog(ebene.querySelector("#onTL").checked);
        ebene.querySelector("#onAlle").onclick = alleAbmeldenDialog;
        ebene.querySelector("#onKf").onclick = async (ev) => {
          const auf = ev.target.closest("[data-kfauf]"),
            weg = ev.target.closest("[data-kfweg]");
          if (!auf && !weg) return;
          const i = +(auf || weg).dataset[auf ? "kfauf" : "kfweg"];
          const x = S.konflikte[i];
          if (!x) return;
          if (auf) {
            const m = jetztStand();
            if (x.v === null) m.delete(x.k);
            else m.set(x.k, x.v);
            await uebernehmen(m);
            stempeln(jetztStand());
          }
          S.konflikte.splice(i, 1);
          await standSpeichern();
          ebene.querySelector("#onKf").innerHTML = konfliktHTML();
          planen(500);
        };
        ebene.querySelector("#onLoeschen").onclick = kontoLoeschenDialog;
      },
    );
  }
  /* Einladungscode gilt nur für die eingetragene DK-Nummer */
  function einladungDialog(tl) {
    simpleDialog(
      "Einladungscode erstellen",
      "Für wen ist der Code?",
      `<div class="grp">${fld("onEinlDk", "DK-Nummer der Person", "", "text", 'placeholder="DK00000000" autocapitalize="characters" spellcheck="false" autocomplete="off"')}</div>
       <p class="hinweis bleibt">Der Code funktioniert nur mit dieser DK-Nummer – so kann sich niemand unter fremdem Namen registrieren.</p>
       <p class="err" id="onEinlErr" hidden></p>`,
      () => {
        const dk = document.getElementById("onEinlDk").value.toUpperCase().replace(/\s/g, "").replace(/^TL-/, "");
        if (!/^DK\d{8}$/.test(dk)) {
          const err = document.getElementById("onEinlErr");
          err.textContent = "Die DK-Nummer besteht aus DK und acht Ziffern.";
          err.hidden = false;
          return;
        }
        closeModal();
        setTimeout(() => einladungErstellen(tl, dk), 380);
      },
      "Code erstellen",
    );
  }
  async function einladungErstellen(tl, dk) {
    try {
      if (!(await tokenSichern())) throw new Error("Bitte neu anmelden.");
      const r = await api("einladung", { einladen: !!tl, dk }, true);
      const bis = new Date(r.bis).toLocaleDateString("de-DE");
      simpleDialog(
        "Einladungscode",
        "Gilt einmal · bis " + bis,
        `<div class="grp"><div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.3rem;letter-spacing:2px;padding:16px;background:var(--surface-2);border-radius:12px;text-align:center;-webkit-user-select:all;user-select:all">${esc(r.code)}</div>
          <p class="hinweis">Gilt nur für <b>${esc(dk)}</b>. Gib den Code deinem Teammitglied – es registriert sich damit in Provisio Online.${tl ? " Dieser Zugang darf selbst weitere Codes erstellen." : ""}</p>
          <div class="actions"><button type="button" class="btn" id="onKopie">Code kopieren</button></div></div>`,
        () => closeModal(),
        "Fertig",
      );
      const k = document.getElementById("onKopie");
      if (k)
        k.onclick = () =>
          navigator.clipboard
            .writeText(r.code)
            .then(() => (k.textContent = "Kopiert"))
            .catch(() => (k.textContent = "Kopieren nicht möglich"));
    } catch (e) {
      simpleDialog("Einladungscode", "", `<p class="err">${esc(e.status === 0 ? "Keine Verbindung." : e.message)}</p>`, () => closeModal(), "OK");
    }
  }
  function alleAbmeldenDialog() {
    simpleDialog(
      "Auf allen Geräten abmelden",
      "Auch dieses Gerät",
      `<p class="hinweis bleibt">Alle Sitzungen werden sofort beendet. Danach meldest du dich überall neu an. Noch nicht abgeglichene Änderungen auf anderen Geräten bleiben dort gespeichert und werden beim nächsten Anmelden übertragen.</p><p class="err" id="onAlleErr" hidden></p>`,
      async () => {
        try {
          await abgleich();
          await tokenSichern();
          await api("abmelden-alle", {}, true);
          closeModal();
          if (typeof unterseiteSchliessen === "function") unterseiteSchliessen();
          O.token = null;
          zwangsAbmelden("Du wurdest auf allen Geräten abgemeldet.");
        } catch (e) {
          const err = document.getElementById("onAlleErr");
          err.textContent = e.status === 0 ? "Keine Verbindung." : e.message;
          err.hidden = false;
        }
      },
      "Abmelden",
    );
  }
  function kontoLoeschenDialog() {
    simpleDialog(
      "Online-Konto löschen",
      "Das lässt sich nicht rückgängig machen",
      `<div class="grp"><input type="text" name="username" autocomplete="username" value="${esc(me.dk)}" readonly tabindex="-1" aria-hidden="true" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">${fld("onPw", "Dein Passwort", "", "password", 'autocomplete="current-password"')}</div>
       <p class="hinweis bleibt">Konto und alle Daten auf dem Server werden sofort gelöscht. Sichere vorher deine Daten, wenn du sie behalten möchtest.</p>
       <p class="err" id="onErr" hidden></p>`,
      async () => {
        const err = document.getElementById("onErr");
        try {
          await tokenSichern();
          await api("konto-loeschen", { auth: await ableiten(document.getElementById("onPw").value, "auth", O.dk, O.it) }, true);
          O.auth = null;
          O.token = null;
          closeModal();
          if (typeof unterseiteSchliessen === "function") unterseiteSchliessen();
          O.dk = null; // nicht mehr abgleichen
          logout();
        } catch (e) {
          err.textContent = e.status === 0 ? "Keine Verbindung." : e.message;
          err.hidden = false;
        }
      },
      "Endgültig löschen",
    );
  }

  if (typeof renderProfil === "function") {
    const profilOhne = renderProfil;
    renderProfil = async function () {
      const r = await profilOhne.apply(this, arguments);
      if (!O.dk || document.getElementById("esOnline")) return r;
      const sicher = [...document.querySelectorAll(".esgh")].find((p) => p.textContent.trim() === "Sicherheit");
      if (sicher) {
        sicher.insertAdjacentHTML(
          "beforebegin",
          `<p class="esgh">Online</p><div class="esgrp">${esZeile("esOnline", "Online-Konto", S && S.konflikte && S.konflikte.length ? S.konflikte.length + " Konflikt" + (S.konflikte.length === 1 ? "" : "e") : "")}</div>`,
        );
        document.getElementById("esOnline").onclick = onlineUnterseite;
      }
      document.querySelectorAll(".esfuss").forEach((p) => {
        if (/liegen verschlüsselt nur auf diesem Gerät/.test(p.textContent))
          p.textContent =
            "Deine Daten liegen verschlüsselt auf diesem Gerät und werden Ende-zu-Ende-verschlüsselt mit deinen anderen Geräten abgeglichen.";
      });
      const marke = document.querySelector(".esmarke span");
      if (marke) marke.textContent = marke.textContent.replace("lokal · verschlüsselt · offline", "online · Ende-zu-Ende-verschlüsselt");
      return r;
    };
  }

  /* Für Tests: nur Zustand, keine Geheimnisse */
  window.onlineInfo = () => ({
    dk: O.dk,
    angemeldet: !!O.token,
    einladen: O.einladen,
    status: status.art,
    text: status.text,
    rev: S ? S.rev : null,
    konflikte: S ? S.konflikte.length : 0,
  });
  window.onlineAbgleich = abgleich;
})();
