/**
 * Provisio Online – Schnittstelle (Scaleway Serverless Function, fr-par)
 *
 * Grundsatz: Ende-zu-Ende-Verschlüsselung. Der Server sieht nie das Passwort,
 * nie den Wiederherstellungs-Code und nie Klartextdaten. Er speichert nur:
 *  - einen aus dem Passwort abgeleiteten Prüfwert (auf dem Gerät mit PBKDF2
 *    erzeugt, hier zusätzlich mit einem geheimen Pepper per HMAC gehasht),
 *  - den mit dem Passwort bzw. Code umschlossenen Datenschlüssel (Ciphertext),
 *  - verschlüsselte Datensätze mit zufällig wirkenden Kennungen.
 *
 * Ablage (privater Bucket): k/<uid> Konto · d/<uid> Daten · l/<uid> Sperre ·
 * e/<hash> Einladung · s/<hash> Zähler je IP. <uid> = HMAC(Pepper, DK).
 */
"use strict";
const crypto = require("crypto");
const { s3 } = require("./s3.js");

const ENV = process.env;
const ORIGINS = String(ENV.ALLOWED_ORIGINS || "https://auroravorwerk.github.io").split(",");
const PEPPER = ENV.PEPPER || "";
const TOKEN_KEY = ENV.TOKEN_SECRET || "";
let ablage = null;
const speicher = () => (ablage = ablage || s3(ENV.BUCKET, ENV.S3_ACCESS, ENV.S3_SECRET));

const TOKEN_DAUER = 12 * 3600e3; // Sitzung: 12 Stunden
const RESET_DAUER = 10 * 60e3; // Passwort neu setzen: 10 Minuten
const EINLADUNG_DAUER = 7 * 86400e3; // Einladungscode: 7 Tage
const MAX_FEHL = 5; // je Konto und Gerät/IP, danach Sperre
const MAX_FEHL_KONTO = 50; // je Konto über alle IPs in 24 Stunden
const KDF_NEU = 600000; // PBKDF2-Runden für neue Prüfwerte (OWASP 2023)
const KDF_ALT = 150000; // Konten aus Online 1.0 (werden beim Anmelden hochgestuft)
const IP_FENSTER = 15 * 60e3,
  IP_MAX = 30; // Anmelde-Versuche je IP und Fenster
const MAX_DATEN = 25 * 1024 * 1024; // Obergrenze Datenbestand je Konto

const DK_RE = /^DK\d{8}$/;
const B64_32 = /^[A-Za-z0-9+/]{43}=$/; // 32 Byte Base64
const ID_RE = /^[A-Za-z0-9_-]{22,64}$/;

class Fehler extends Error {
  constructor(status, text, extra) {
    super(text);
    this.status = status;
    this.extra = extra;
  }
}
const hm = (k, d) => crypto.createHmac("sha256", k).update(d).digest("hex");
const gleich = (a, b) => {
  const x = Buffer.from(String(a)),
    y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const uidVon = (dk) => hm(PEPPER, "uid|" + dk).slice(0, 40);
const authHash = (auth) => hm(PEPPER, "auth|" + auth);
const recHash = (rec) => hm(PEPPER, "rec|" + rec);
const b64u = (s) => Buffer.from(s).toString("base64url");

/* ---------- Token (zustandslos, HMAC-signiert) ---------- */
function tokenBauen(art, uid, gen, dauer) {
  const j = crypto.randomBytes(9).toString("base64url");
  const kopf = b64u(JSON.stringify({ a: art, u: uid, g: gen, j, x: Date.now() + dauer }));
  return kopf + "." + hm(TOKEN_KEY, kopf);
}
function tokenPruefen(t, art) {
  const [kopf, sig] = String(t || "").split(".");
  if (!kopf || !sig || !gleich(sig, hm(TOKEN_KEY, kopf))) throw new Error();
  const p = JSON.parse(Buffer.from(kopf, "base64url").toString());
  if (p.a !== art || !(p.x > Date.now())) throw new Error();
  return p;
}
/* Ändert sich mit jedem Passwort und mit „Auf allen Geräten abmelden“ */
const generation = (konto) => konto.auth.slice(0, 12) + ":" + (konto.sg || 0);

/* ---------- Prüfen von Eingaben ---------- */
function umschlag(w) {
  if (!w || typeof w !== "object") return false;
  if (w.it !== undefined && !(Number.isInteger(w.it) && w.it >= 100000 && w.it <= 5000000)) return false;
  if (Object.keys(w).some((k) => !["salt", "iv", "ct", "it"].includes(k))) return false;
  return (
    /^[A-Za-z0-9+/=]{20,32}$/.test(w.salt || "") &&
    /^[A-Za-z0-9+/=]{16}$/.test(w.iv || "") &&
    /^[A-Za-z0-9+/=]{40,200}$/.test(w.ct || "")
  );
}
function chiffrat(c, max) {
  return (
    c &&
    typeof c === "object" &&
    /^[A-Za-z0-9+/=]{16}$/.test(c.iv || "") &&
    typeof c.ct === "string" &&
    c.ct.length <= max &&
    /^[A-Za-z0-9+/=]+$/.test(c.ct)
  );
}
const muss = (ok, text) => {
  if (!ok) throw new Error400(text);
};
function Error400(text) {
  return new Fehler(400, text || "Ungültige Anfrage.");
}

/* ---------- Begrenzung je IP ---------- */
async function ipBremse(ip) {
  const key = "s/" + hm(PEPPER, "ip|" + ip).slice(0, 32) + ".json";
  const st = speicher();
  const alt = await st.lesen(key);
  const jetzt = Date.now();
  let z = alt && alt.daten.bis > jetzt ? alt.daten : { n: 0, bis: jetzt + IP_FENSTER };
  z.n++;
  await st.schreiben(key, z).catch(() => {});
  if (z.n > IP_MAX) throw new Fehler(429, "Zu viele Versuche. Bitte später erneut probieren.");
}

/*
 * ---------- Sperre je Konto UND Gerät/IP ----------
 * Fehlversuche sperren nur die Kombination aus Konto und Absender. So kann ein
 * Angreifer ein fremdes Konto nicht absichtlich für die Inhaberin sperren.
 * Zusätzlich gilt eine hohe Obergrenze je Konto über alle Absender (verteilte
 * Angriffe). Auch für nicht vorhandene DK-Nummern – keine Auskunft.
 */
async function sperreLesen(uid) {
  const r = await speicher().lesen("l/" + uid + ".json");
  const s = r ? r.daten : {};
  s.ip = s.ip || {};
  s.tag = s.tag && s.tag.bis > Date.now() ? s.tag : { n: 0, bis: Date.now() + 86400e3 };
  return s;
}
const minuten = (bis) => {
  const min = Math.ceil((bis - Date.now()) / 60e3);
  return `Zu viele Fehlversuche. Bitte in ${min} Minute${min === 1 ? "" : "n"} erneut versuchen.`;
};
async function sperrePruefen(uid, ip) {
  const s = await sperreLesen(uid);
  const ih = hm(PEPPER, "ip|" + ip).slice(0, 16);
  const e = s.ip[ih];
  if (e && e.bis > Date.now()) throw new Fehler(429, minuten(e.bis));
  if (s.tag.n >= MAX_FEHL_KONTO) throw new Fehler(429, minuten(s.tag.bis));
  s.ih = ih;
  return s;
}
async function fehlversuch(uid, s) {
  const e = (s.ip[s.ih] = s.ip[s.ih] || { fehl: 0, bis: 0 });
  e.fehl++;
  if (e.fehl % MAX_FEHL === 0) {
    const runde = e.fehl / MAX_FEHL; // 15, 30, 60 … Minuten
    e.bis = Date.now() + Math.min(24 * 60, 15 * 2 ** (runde - 1)) * 60e3;
  }
  e.zuletzt = Date.now();
  s.tag.n++;
  /* alte Einträge aufräumen */
  Object.keys(s.ip).forEach((k) => {
    if (s.ip[k].zuletzt < Date.now() - 2 * 86400e3) delete s.ip[k];
  });
  const { ih, ...rest } = s;
  await speicher().schreiben("l/" + uid + ".json", rest);
}
async function erfolg(uid, s) {
  if (s.ip[s.ih]) {
    delete s.ip[s.ih];
    const { ih, ...rest } = s;
    await speicher().schreiben("l/" + uid + ".json", rest);
  }
}

const FALSCH = "DK-Nummer oder Passwort falsch.";

async function kontoLesen(uid) {
  const r = await speicher().lesen("k/" + uid + ".json");
  return r ? { konto: r.daten, etag: r.etag } : null;
}
async function angemeldet(ev) {
  const roh = (ev.headers.authorization || ev.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  let p;
  try {
    p = tokenPruefen(roh, "s");
  } catch (e) {
    throw new Fehler(401, "Bitte erneut anmelden.");
  }
  const k = await kontoLesen(p.u);
  if (!k) throw new Fehler(401, "Bitte erneut anmelden.");
  if (generation(k.konto) !== p.g) throw new Fehler(401, "Du wurdest abgemeldet. Bitte neu anmelden.", { grund: "abgemeldet" });
  if ((k.konto.widerrufen || []).some((w) => w.j === p.j)) throw new Fehler(401, "Bitte erneut anmelden.", { grund: "abgemeldet" });
  return { uid: p.u, j: p.j, x: p.x, ...k };
}
const sitzung = (uid, konto) => ({
  token: tokenBauen("s", uid, generation(konto), TOKEN_DAUER),
  gueltig: Date.now() + TOKEN_DAUER,
});

/* ---------- Einladungscodes ---------- */
const EINL_AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function einladungNeu() {
  const z = crypto.randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += EINL_AB[z[i] % 32];
  return "PV-" + s.slice(0, 4) + "-" + s.slice(4);
}
const einlNorm = (c) =>
  String(c || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^PV/, "");
const einlKey = (c) => "e/" + hm(PEPPER, "einl|" + einlNorm(c)).slice(0, 40) + ".json";

/* ---------- Aktionen ---------- */
const AKTIONEN = {
  async "POST /registrieren"(b, ev) {
    await ipBremse(ev.ip);
    muss(DK_RE.test(b.dk || ""), "Die DK-Nummer besteht aus DK und acht Ziffern.");
    muss(B64_32.test(b.auth || "") && B64_32.test(b.rec || ""));
    muss(umschlag(b.mkByPw) && umschlag(b.mkByCode) && chiffrat(b.profil, 8000));
    const st = speicher();
    const ek = einlKey(b.einladung);
    const e = await st.lesen(ek);
    const uid = uidVon(b.dk);
    /* Codes aus der App gelten nur für die DK-Nummer, für die sie erstellt wurden */
    const passt = e && (e.daten.fuer ? gleich(e.daten.fuer, uid) : e.daten.von === "admin");
    if (!e || !passt || e.daten.benutzt || !(e.daten.bis > Date.now()))
      throw new Fehler(403, "Der Einladungscode ist ungültig, abgelaufen oder gilt für eine andere DK-Nummer.");
    const konto = {
      v: 1,
      it: KDF_NEU,
      auth: authHash(b.auth),
      rec: recHash(b.rec),
      mkByPw: b.mkByPw,
      mkByCode: b.mkByCode,
      profil: b.profil,
      einladen: !!e.daten.einladen,
      erstellt: Date.now(),
    };
    /* Einladung zuerst verbrauchen (bedingt) – so gilt jeder Code genau einmal */
    const verbraucht = await st.schreiben(ek, { ...e.daten, benutzt: Date.now() }, { etag: e.etag });
    if (!verbraucht) throw new Fehler(403, "Der Einladungscode ist ungültig, abgelaufen oder gilt für eine andere DK-Nummer.");
    const neu = await st.schreiben("k/" + uid + ".json", konto, { neu: true });
    if (!neu) {
      await st.schreiben(ek, e.daten).catch(() => {}); // Code wieder freigeben
      throw new Fehler(409, "Zu dieser DK-Nummer gibt es schon einen Zugang. Bitte anmelden.");
    }
    await st.schreiben("d/" + uid + ".json", { rev: 0, items: {} }, { neu: true });
    return { ...sitzung(uid, konto), einladen: konto.einladen };
  },

  /* Runden für die Ableitung des Prüfwerts – für unbekannte DK derselbe Standard (keine Auskunft) */
  async "POST /parameter"(b, ev) {
    await ipBremse(ev.ip);
    muss(DK_RE.test(b.dk || ""));
    const k = await kontoLesen(uidVon(b.dk));
    return { it: k ? k.konto.it || KDF_ALT : KDF_NEU };
  },

  async "POST /anmelden"(b, ev) {
    await ipBremse(ev.ip);
    muss(DK_RE.test(b.dk || "") && B64_32.test(b.auth || ""), FALSCH);
    const uid = uidVon(b.dk);
    const sp = await sperrePruefen(uid, ev.ip);
    const k = await kontoLesen(uid);
    const h = authHash(b.auth);
    if (!k || !gleich(k.konto.auth, h)) {
      await fehlversuch(uid, sp);
      throw new Fehler(401, FALSCH);
    }
    await erfolg(uid, sp);
    return {
      ...sitzung(uid, k.konto),
      it: k.konto.it || KDF_ALT,
      mkByPw: k.konto.mkByPw,
      mkByCode: k.konto.mkByCode,
      profil: k.konto.profil,
      einladen: !!k.konto.einladen,
    };
  },

  /* Passwort vergessen, Schritt 1: Code prüfen → umschlossener Schlüssel + Kurzzeit-Token */
  async "POST /wiederherstellen"(b, ev) {
    await ipBremse(ev.ip);
    muss(DK_RE.test(b.dk || "") && B64_32.test(b.rec || ""), "Code oder DK-Nummer falsch.");
    const uid = uidVon(b.dk);
    const sp = await sperrePruefen(uid, ev.ip);
    const k = await kontoLesen(uid);
    if (!k || !gleich(k.konto.rec, recHash(b.rec))) {
      await fehlversuch(uid, sp);
      throw new Fehler(401, "Code oder DK-Nummer falsch.");
    }
    await erfolg(uid, sp);
    return { reset: tokenBauen("r", uid, generation(k.konto), RESET_DAUER), mkByCode: k.konto.mkByCode };
  },

  /* Passwort vergessen, Schritt 2: neues Passwort setzen */
  async "POST /passwort-neu"(b, ev) {
    await ipBremse(ev.ip);
    let p;
    try {
      p = tokenPruefen(b.reset, "r");
    } catch (e) {
      throw new Fehler(401, "Die Zeit ist abgelaufen. Bitte noch einmal beginnen.");
    }
    muss(B64_32.test(b.auth || "") && umschlag(b.mkByPw));
    const k = await kontoLesen(p.u);
    if (!k || generation(k.konto) !== p.g) throw new Fehler(401, "Die Zeit ist abgelaufen. Bitte noch einmal beginnen.");
    const konto = { ...k.konto, it: KDF_NEU, auth: authHash(b.auth), mkByPw: b.mkByPw, widerrufen: [] };
    if (!(await speicher().schreiben("k/" + p.u + ".json", konto, { etag: k.etag })))
      throw new Fehler(409, "Bitte noch einmal versuchen.");
    return { ...sitzung(p.u, konto), profil: konto.profil, einladen: !!konto.einladen };
  },

  /* Passwort ändern (angemeldet; altes Passwort nötig) */
  async "POST /passwort"(b, ev) {
    const a = await angemeldet(ev);
    muss(B64_32.test(b.alt || "") && B64_32.test(b.auth || "") && umschlag(b.mkByPw));
    if (!gleich(a.konto.auth, authHash(b.alt))) throw new Fehler(403, "Das bisherige Passwort stimmt nicht.");
    const konto = { ...a.konto, it: KDF_NEU, auth: authHash(b.auth), mkByPw: b.mkByPw, widerrufen: [] };
    if (!(await speicher().schreiben("k/" + a.uid + ".json", konto, { etag: a.etag })))
      throw new Fehler(409, "Bitte noch einmal versuchen.");
    return sitzung(a.uid, konto);
  },

  /* Abmelden: diese Sitzung serverseitig ungültig machen */
  async "POST /abmelden"(b, ev) {
    const a = await angemeldet(ev);
    const liste = (a.konto.widerrufen || []).filter((w) => w.x > Date.now()).slice(-200);
    liste.push({ j: a.j, x: a.x });
    await speicher().schreiben("k/" + a.uid + ".json", { ...a.konto, widerrufen: liste }, { etag: a.etag });
    return { ok: true };
  },

  /* Auf allen Geräten abmelden: alle Sitzungen des Kontos ungültig */
  async "POST /abmelden-alle"(b, ev) {
    const a = await angemeldet(ev);
    const konto = { ...a.konto, sg: (a.konto.sg || 0) + 1, widerrufen: [] };
    if (!(await speicher().schreiben("k/" + a.uid + ".json", konto, { etag: a.etag })))
      throw new Fehler(409, "Bitte noch einmal versuchen.");
    return { ok: true };
  },

  /* Neuer Wiederherstellungs-Code (angemeldet; Passwort nötig) */
  async "POST /code"(b, ev) {
    const a = await angemeldet(ev);
    muss(B64_32.test(b.auth || "") && B64_32.test(b.rec || "") && umschlag(b.mkByCode));
    if (!gleich(a.konto.auth, authHash(b.auth))) throw new Fehler(403, "Das Passwort stimmt nicht.");
    const konto = { ...a.konto, rec: recHash(b.rec), mkByCode: b.mkByCode };
    if (!(await speicher().schreiben("k/" + a.uid + ".json", konto, { etag: a.etag })))
      throw new Fehler(409, "Bitte noch einmal versuchen.");
    return { ok: true };
  },

  /* Verschlüsseltes Profil (Name, Rolle, Team) ablegen */
  async "POST /profil"(b, ev) {
    const a = await angemeldet(ev);
    muss(chiffrat(b.profil, 8000));
    const konto = { ...a.konto, profil: b.profil };
    if (!(await speicher().schreiben("k/" + a.uid + ".json", konto, { etag: a.etag })))
      throw new Fehler(409, "Bitte noch einmal versuchen.");
    return { ok: true };
  },

  /* Abgleich lesen: alles mit Revision > seit */
  async "POST /holen"(b, ev) {
    const a = await angemeldet(ev);
    const seit = Number.isInteger(b.seit) && b.seit >= 0 ? b.seit : 0;
    const r = await speicher().lesen("d/" + a.uid + ".json");
    const d = r ? r.daten : { rev: 0, items: {} };
    if (seit > d.rev) return { rev: d.rev, neu: true, items: alle(d) }; // Server zurückgesetzt
    return { rev: d.rev, items: alle(d).filter((x) => x.r > seit) };
  },

  /* Abgleich schreiben: nur wenn der Stand des Geräts aktuell ist (sonst 409 → erst holen) */
  async "POST /senden"(b, ev) {
    const a = await angemeldet(ev);
    muss(Number.isInteger(b.basis) && Array.isArray(b.items) && b.items.length <= 5000);
    b.items.forEach((x) => {
      muss(x && ID_RE.test(x.i || "") && Number.isFinite(x.t));
      muss(x.x === 1 ? !x.c : chiffrat(x.c, 400000));
    });
    const st = speicher();
    const key = "d/" + a.uid + ".json";
    const r = await st.lesen(key);
    const d = r ? r.daten : { rev: 0, items: {} };
    if (d.rev !== b.basis) throw new Fehler(409, "Neuer Stand auf dem Server.", { rev: d.rev });
    if (!b.items.length) return { rev: d.rev };
    d.rev++;
    b.items.forEach((x) => {
      d.items[x.i] = x.x === 1 ? { r: d.rev, t: x.t, x: 1 } : { r: d.rev, t: x.t, c: x.c };
    });
    const text = JSON.stringify(d);
    if (text.length > MAX_DATEN) throw new Fehler(413, "Der Datenbestand ist zu groß.");
    const ok = await st.schreiben(key, d, r ? { etag: r.etag } : { neu: true });
    if (!ok) throw new Fehler(409, "Neuer Stand auf dem Server.", { rev: -1 });
    return { rev: d.rev };
  },

  /* Einladungscode erzeugen (nur Konten mit Einladerecht) */
  async "POST /einladung"(b, ev) {
    const a = await angemeldet(ev);
    if (!a.konto.einladen) throw new Fehler(403, "Dieser Zugang darf keine Einladungen erstellen.");
    muss(DK_RE.test(b.dk || ""), "Bitte die DK-Nummer der eingeladenen Person eintragen.");
    const code = einladungNeu();
    const bis = Date.now() + EINLADUNG_DAUER;
    await speicher().schreiben(
      einlKey(code),
      { von: a.uid, fuer: uidVon(b.dk), bis, einladen: !!b.einladen, erstellt: Date.now() },
      { neu: true },
    );
    return { code, bis };
  },

  /* Konto samt Daten endgültig löschen (Passwort nötig) */
  async "POST /konto-loeschen"(b, ev) {
    const a = await angemeldet(ev);
    muss(B64_32.test(b.auth || ""));
    if (!gleich(a.konto.auth, authHash(b.auth))) throw new Fehler(403, "Das Passwort stimmt nicht.");
    const st = speicher();
    await st.loeschen("d/" + a.uid + ".json");
    await st.loeschen("l/" + a.uid + ".json");
    await st.loeschen("k/" + a.uid + ".json");
    return { ok: true };
  },
};
const alle = (d) => Object.keys(d.items).map((i) => ({ i, ...d.items[i] }));

/* ---------- Einstieg ---------- */
function kopf(origin) {
  const h = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    Vary: "Origin",
  };
  if (ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}
function antwort(status, obj, origin) {
  return { statusCode: status, headers: kopf(origin), body: JSON.stringify(obj) };
}

async function handle(event) {
  const hd = {};
  Object.keys(event.headers || {}).forEach((k) => (hd[k.toLowerCase()] = event.headers[k]));
  const origin = hd.origin || "";
  const methode = (event.httpMethod || "GET").toUpperCase();
  if (methode === "OPTIONS") return { statusCode: ORIGINS.includes(origin) ? 204 : 403, headers: kopf(origin), body: "" };
  /* Browser-Anfragen nur von der eigenen App */
  if (origin && !ORIGINS.includes(origin)) return antwort(403, { fehler: "Nicht erlaubt." }, origin);
  if (!PEPPER || PEPPER.length < 32 || !TOKEN_KEY || TOKEN_KEY.length < 32)
    return antwort(500, { fehler: "Server nicht eingerichtet." }, origin);
  const pfad = "/" + String(event.path || "/").split("/").filter(Boolean).pop();
  const fn = AKTIONEN[methode + " " + pfad];
  if (!fn) return antwort(404, { fehler: "Unbekannt." }, origin);
  let body = event.body || "";
  if (event.isBase64Encoded) body = Buffer.from(body, "base64").toString();
  if (body.length > 6 * 1024 * 1024) return antwort(413, { fehler: "Zu groß." }, origin);
  let b;
  try {
    b = body ? JSON.parse(body) : {};
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new Error();
  } catch (e) {
    return antwort(400, { fehler: "Ungültige Anfrage." }, origin);
  }
  /* Absender: X-Real-IP setzt der Scaleway-Eingang selbst (überschreibt Angaben des Clients).
     X-Forwarded-For ist NICHT vertrauenswürdig – der erste Eintrag kommt vom Client. */
  const ip = String(hd["x-real-ip"] || "?").trim();
  try {
    const erg = await fn(b, { headers: hd, ip });
    return antwort(200, erg, origin);
  } catch (e) {
    if (e instanceof Fehler) return antwort(e.status, { fehler: e.message, ...(e.extra || {}) }, origin);
    console.error("Fehler:", e && e.message);
    return antwort(500, { fehler: "Serverfehler. Bitte später erneut versuchen." }, origin);
  }
}

/* Scaleway ruft handle(event, context, callback) auf */
module.exports.handle = (event, context, callback) => handle(event);
module.exports._intern = { handle, einladungNeu, einlKey, uidVon };
