/**
 * Datenhaltung lokal
 *
 * Früher Firebase-Anbindung (Anmeldung, Rollen, Geräteabgleich). Die App läuft
 * jetzt ausschließlich lokal: alle Daten liegen im localStorage des Geräts,
 * es gibt keine Datenbank, keine Anmeldung über das Netz und keinen Abgleich
 * zwischen Geräten. Dieses Modul kapselt den lokalen Speicher, die Rollenlogik
 * und das Entschärfen von Benutzertexten.
 */

/* Aus der DK-Nummer eine technische Kennung bilden (nur noch intern verwendet) */
const mailOf = (dk) => dk.toLowerCase().replace(/[^a-z0-9]/g, "") + "@bunte-woche.app";

/*
 * ---------- Entschärfen ----------
 * Eingaben werden an vielen Stellen als HTML ausgegeben. Damit sie nie als
 * Markup wirken, werden  <  >  "  '  durch  ‹  ›  ”  ’  ersetzt – für Werte
 * und Schlüssel. Das ist der zentrale Schutz gegen eingeschleustes Markup.
 */
const ENTSCH = { "<": "‹", ">": "›", '"': "”", "'": "’" };
const entschaerfeText = (t) => String(t).replace(/[<>"']/g, (z) => ENTSCH[z]);
function entschaerfen(v) {
  if (typeof v === "string") return /[<>"']/.test(v) ? entschaerfeText(v) : v;
  if (Array.isArray(v)) return v.map(entschaerfen);
  if (v && typeof v === "object") {
    const o = {};
    Object.keys(v).forEach((k) => {
      o[/[<>"']/.test(k) ? entschaerfeText(k) : k] = entschaerfen(v[k]);
    });
    return o;
  }
  return v;
}

/* Lokaler Speicher – schlägt er fehl, läuft die App trotzdem.
   Online-Version: eigener Namensraum "pvo:", damit sie die Daten der
   Offline-App auf derselben Domain nie berührt. */
const SPEICHER_PRAEFIX = "pvo:";
const store = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(SPEICHER_PRAEFIX + k));
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(SPEICHER_PRAEFIX + k, JSON.stringify(v));
    } catch (e) {}
  },
  del(k) {
    try {
      localStorage.removeItem(SPEICHER_PRAEFIX + k);
    } catch (e) {}
  },
};
const DK_RE = /^(TL-)?DK\d{8}$/;

/*
 * ---------- Verschlüsselung ----------
 * Die Kundendaten (bw-data-<DK>) liegen verschlüsselt auf dem Gerät (AES-GCM).
 * Der eigentliche Datenschlüssel (Master Key) wird zufällig erzeugt und zweimal
 * "umschlossen" gespeichert: einmal mit einem aus dem Passwort abgeleiteten
 * Schlüssel, einmal mit einem aus dem Wiederherstellungs-Code abgeleiteten
 * (PBKDF2). So lässt sich die Datei ohne Passwort bzw. Code nicht entschlüsseln –
 * auch nicht bei Gerätediebstahl. Der Master Key liegt nur im Arbeitsspeicher
 * und nur, solange man angemeldet ist.
 */
const CRYPTO_OK = !!(typeof crypto !== "undefined" && crypto.subtle);
const KDF_ITER = 150000;
let masterKey = null; // CryptoKey der laufenden Sitzung (nie gespeichert)
const _te = new TextEncoder();
const _td = new TextDecoder();
function _b64(buf) {
  let s = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function _unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function _kdfKey(secret, saltBytes) {
  const base = await crypto.subtle.importKey("raw", _te.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: KDF_ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function _aesEnc(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, _te.encode(text));
  return { iv: _b64(iv), ct: _b64(ct) };
}
async function _aesDec(key, env) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: _unb64(env.iv) }, key, _unb64(env.ct));
  return _td.decode(pt);
}
/* Neuen Master Key erzeugen */
async function neuerMasterKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
/* Master Key mit einem Geheimnis (Passwort/Code) umschließen → {salt, iv, ct} */
async function mkUmschliessen(mk, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await _kdfKey(secret, salt);
  const raw = _b64(await crypto.subtle.exportKey("raw", mk));
  const env = await _aesEnc(key, raw);
  return { salt: _b64(salt), iv: env.iv, ct: env.ct };
}
/* Umschlossenen Master Key mit dem Geheimnis öffnen → CryptoKey oder null */
async function mkOeffnen(wrapped, secret) {
  if (!wrapped || !CRYPTO_OK) return null;
  try {
    const key = await _kdfKey(secret, _unb64(wrapped.salt));
    const rawB64 = await _aesDec(key, wrapped); // wirft bei falschem Geheimnis
    return await crypto.subtle.importKey("raw", _unb64(rawB64), { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  } catch (e) {
    return null;
  }
}
/* Wiederherstellungs-Code: 24 Zeichen, gut abschreibbar (ohne 0/O/1/I) */
function neuerWiederherstellungsCode() {
  const AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const z = crypto.getRandomValues(new Uint8Array(24));
  let s = "";
  for (let i = 0; i < 24; i++) {
    if (i && i % 4 === 0) s += "-";
    s += AB[z[i] % AB.length];
  }
  return s; // z. B. ABCD-EFGH-JKLM-NPQR-STUV-WXYZ
}
const codeNorm = (c) =>
  String(c || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/* Zustand (ohne Netz; nur noch als lokale Merker) */
let me = null;
let dataReady = false;
let shadow = {};
let saveTimer = null;
let letzterFehler = "";
var fremdAktiv = false; // true, solange ein Teamleiter fremde (importierte) Daten ansieht
var cloudOk = false; // es gibt keine Cloud mehr – bleibt false

/*
 * ---------- Rollen ----------
 * Es gibt nur zwei Rollen: "KB" (Kundenberater) und "TL" (Teamleiter).
 * Jeder kann sich in den Einstellungen selbst umschalten. Eine Admin-Rolle
 * gibt es nicht mehr. Alte Schreibweisen ("Teamleader", Präfix TL-) werden
 * weiterhin als Teamleiter erkannt.
 */
const ROLLE_TL = "TL",
  ROLLE_KB = "KB";
const istTLSatz = (u) =>
  !!u && (u.rolle === "TL" || u.rolle === "Teamleader" || String(u.dk || "").startsWith("TL-DK"));
const istKBSatz = (u) => !!u && !istTLSatz(u);
const rolleName = (r) => (r === "TL" || r === "Teamleader" ? "Teamleiter" : "Kundenberater");
const istTeamleiter = () => !!me && istTLSatz(me);
const rolleAus = () => ROLLE_KB; // neue Zugänge sind immer Kundenberater
function localUsers() {
  return store.get("bw-users") || {};
}
async function userGet(dk) {
  return localUsers()[dk] || null;
}
/*
 * Nutzer lokal ablegen. "entferne" löscht ausdrücklich genannte Felder,
 * damit sich das Verhalten der früheren Datenbank-Fassung nicht ändert.
 */
async function userSet(u, entferne) {
  const all = localUsers();
  const rec = { ...u };
  (entferne || []).forEach((k) => {
    delete rec[k];
  });
  all[u.dk] = rec;
  store.set("bw-users", all);
}

/* Zeitstempel: ohne Server einfach die Geräteuhr */
function serverJetzt() {
  return Date.now();
}

/* Alle Daten eines Benutzers als ein Paket */
function dataBlob() {
  return {
    entries,
    potenzial,
    empfehlungen,
    interessenten,
    wiedervorlagen,
    papierkorb,
    nachtrag,
    verlauf,
    archiv,
    einkaeufe,
    inventur,
    settings,
    wunsch,
    fahrten,
    jobtickets,
    teamumsatz,
    ts: serverJetzt(),
  };
}
function applyData(d) {
  d = entschaerfen(d); // auch Sicherungsdateien und lokaler Stand
  Object.keys(entries).forEach((k) => delete entries[k]);
  Object.assign(entries, (d && d.entries) || {});
  potenzial.length = 0;
  ((d && d.potenzial) || []).forEach((x) => potenzial.push(x));
  empfehlungen.length = 0;
  ((d && d.empfehlungen) || []).forEach((x) => empfehlungen.push(x));
  wiedervorlagen.length = 0;
  ((d && d.wiedervorlagen) || []).forEach((x) => wiedervorlagen.push(x));
  interessenten.length = 0;
  ((d && d.interessenten) || []).forEach((x) => interessenten.push(x));
  const grenze = serverJetzt() - 30 * 86400000;
  papierkorb.length = 0;
  ((d && d.papierkorb) || []).filter((x) => x.weg > grenze).forEach((x) => papierkorb.push(x));
  verlauf.length = 0;
  ((d && d.verlauf) || []).forEach((x) => verlauf.push(x));
  archiv.length = 0;
  ((d && d.archiv) || []).forEach((x) => archiv.push(x));
  fahrten.length = 0;
  ((d && d.fahrten) || []).forEach((x) => fahrten.push(x));
  Object.keys(jobtickets).forEach((k) => delete jobtickets[k]);
  Object.assign(jobtickets, (d && d.jobtickets) || {});
  Object.keys(teamumsatz).forEach((k) => delete teamumsatz[k]);
  Object.assign(teamumsatz, (d && d.teamumsatz) || {});
  einkaeufe.length = 0;
  ((d && d.einkaeufe) || []).forEach((x) => einkaeufe.push(x));
  Object.keys(inventur).forEach((k) => delete inventur[k]);
  Object.assign(inventur, (d && d.inventur) || {});
  Object.keys(nachtrag).forEach((k) => delete nachtrag[k]);
  Object.assign(nachtrag, (d && d.nachtrag) || {});
  bestandUmstellen();
  /*
   * Erst leeren, dann setzen – sonst vermischen sich beim Wechsel auf ein
   * Teammitglied eigene und fremde Werte.
   */
  Object.keys(settings).forEach((k) => delete settings[k]);
  Object.assign(settings, { bestellrahmen: 0 }, (d && d.settings) || {});
  if (typeof bewegungSetzen === "function") bewegungSetzen();
  Object.assign(wunsch, { einkommen: 0, tage: 5, proAuftrag: 270, quote: 0 }, (d && d.wunsch) || {});
  wunsch.proAuftrag = 270;
  wvUmstellen(); // taggenaue Alt-Termine werden zu Monaten
  interessentenUmziehen(); // Kontakte aus der Terminierung gehören nicht in die Potenzialliste
}
function interessentenUmziehen() {
  for (let i = potenzial.length - 1; i >= 0; i--) {
    const p = potenzial[i];
    if (!p || !p.quelle || p.letzterBesuch) continue;
    if (!["Festgebietsbegehung", "Promotion", "Messe"].includes(p.quelle)) continue;
    const rec = { ...p };
    delete rec.potenzial;
    delete rec.gruende;
    if (rec.grund && !rec.notiz && !/^Angesprochen bei/.test(rec.grund)) rec.notiz = rec.grund;
    delete rec.grund;
    if (!interessenten.some((x) => x.id === rec.id)) interessenten.push(rec);
    potenzial.splice(i, 1);
  }
}

/*
 * ---------- Speicherort der Arbeitsdaten ----------
 * Die (verschlüsselten) Arbeitsdaten liegen als echte private Datei im Origin
 * Private File System (OPFS) des Geräts – stabiler und größer als localStorage,
 * nur für die App selbst sichtbar. Wo OPFS fehlt (sehr alte Geräte), wird
 * localStorage genutzt. Zusätzlich wird dauerhafter Speicher angefragt, damit
 * das System die Datei nicht bei Speicherdruck verwirft.
 */
const OPFS_OK = !!(typeof navigator !== "undefined" && navigator.storage && navigator.storage.getDirectory);
async function _opfsHandle(dk, create) {
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle("pvo-data-" + dk + ".json", { create });
}
async function datenLesen(dk) {
  if (OPFS_OK) {
    try {
      const txt = await (await (await _opfsHandle(dk, false)).getFile()).text();
      if (txt) return JSON.parse(txt);
    } catch (e) {
      /* Datei fehlt noch → unten localStorage (auch zum Übernehmen alter Stände) */
    }
  }
  return store.get("bw-data-" + dk);
}
async function datenSchreiben(dk, obj) {
  if (OPFS_OK) {
    try {
      const w = await (await _opfsHandle(dk, true)).createWritable();
      await w.write(JSON.stringify(obj));
      await w.close();
      store.del("bw-data-" + dk); // in OPFS übernommen → alten localStorage-Stand entfernen
      return;
    } catch (e) {
      /* Rückfall auf localStorage */
    }
  }
  store.set("bw-data-" + dk, obj);
}
/* Dauerhaften Speicher anfragen (reduziert das Verwerfen bei Speicherdruck). */
try {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist)
    navigator.storage.persist().catch(() => {});
} catch (e) {}

/*
 * Lokale Daten laden und entschlüsseln. Verschlüsselte Datensätze sind nur mit
 * dem Master Key der eigenen Sitzung lesbar; fremde verschlüsselte Daten können
 * nicht geöffnet werden (ohne das fremde Passwort). Alles wird entschärft.
 */
async function loadData(dk, fremd) {
  cloudOk = false;
  const roh = await datenLesen(dk);
  if (!roh) return null;
  if (roh.enc === 1) {
    if (fremd || !masterKey || !CRYPTO_OK) return null;
    try {
      return entschaerfen(JSON.parse(await _aesDec(masterKey, roh)));
    } catch (e) {
      return null;
    }
  }
  return entschaerfen(roh); // Klartext (eingespielte Sicherung o. Ä.)
}

/* Undefinierte Werte entfernen, damit gespeicherte Stände sauber bleiben. */
function clean(v) {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const o = {};
    Object.keys(v).forEach((k) => {
      const c = clean(v[k]);
      if (c !== undefined) o[k] = c;
    });
    return o;
  }
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && !isFinite(v)) return undefined;
  return v;
}

function saveState(text, warn) {
  const el = document.getElementById("saveState");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("warn", !!warn);
  el.title = letzterFehler || text;
}

/* Den eigenen Stand lokal sichern – verschlüsselt, sofern möglich. */
async function flushSave() {
  if (!me || !dataReady) return;
  if (fremdAktiv) {
    // Notbremse: niemals fremde Daten unter eigener DK ablegen
    console.warn("Speichern uebersprungen - es lagen fremde Daten im Speicher.");
    return;
  }
  const blob = clean(dataBlob());
  shadow = JSON.parse(JSON.stringify(blob));
  if (masterKey && CRYPTO_OK) {
    try {
      const env = await _aesEnc(masterKey, JSON.stringify(blob));
      await datenSchreiben(me.dk, { enc: 1, iv: env.iv, ct: env.ct });
      saveState("gespeichert");
    } catch (e) {
      saveState("Sichern fehlgeschlagen", true);
    }
    return;
  }
  /* Ohne Verschlüsselung (unsicherer Kontext): Klartext, aber deutlich markiert. */
  await datenSchreiben(me.dk, blob);
  saveState("gespeichert · unverschlüsselt", true);
}

/* kurzes haptisches Signal nach Zählen oder Sichern */
function stups(ms = 8, el) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
  /* Sichtbare Quittung zusätzlich zum Vibrieren - viele haben es aus */
  if (el) {
    el.classList.remove("stups");
    void el.offsetWidth;
    el.classList.add("stups");
  }
}
function saveData() {
  if (!me || !dataReady || fremdAktiv) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}
/* Beim Verlassen der Seite sofort sichern */
addEventListener("pagehide", () => {
  clearTimeout(saveTimer);
  flushSave();
  if (me) store.set("bw-lastseen", Date.now());
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    clearTimeout(saveTimer);
    flushSave();
  }
});
