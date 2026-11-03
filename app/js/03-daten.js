/**
 * Datenhaltung
 *
 * Globale Zustände der App; Synchronisation siehe 16-cloud-sync.js.
 */
var viewUser = null; // gesetzt, wenn ein Teamleiter fremde Daten ansieht
const entries = {}; // "2026-08-03|14" -> Eintrag
const potenzial = []; // Potenzialliste
const empfehlungen = []; // namentliche Empfehlungen
const papierkorb = []; // gelöschte Termine, 30 Tage
const verlauf = []; // {datum, art:"verschoben"|"abgesagt"|"nichtda"} für die Auswertung
const archiv = []; // abgesagte / nicht angetroffene Termine: {tag, h, art, vorname, nachname, quelle}
const fahrten = []; // Fahrtenbuch: {datum, ziel, km, anlass}
const jobtickets = {}; // {jahr: {geschrieben, manuell, qualifiziert, eigeneRegion, foerderung}}
const teamumsatz = {}; // {jahr: {startKW: {team, einsteiger}}}
const interessenten = []; // gemerkte Kontakte aus der Terminierung
const wiedervorlagen = []; // {id, name, adresse, monat:"2026-09", notiz}
var monday = mondayOf(new Date());
var tagWahl = Math.min(6, (new Date().getDay() + 6) % 7); // Handyansicht: welcher Tag im Planer

/* Kleines Zeichen in einem freien Feld, wenn dort ein Termin abgesagt wurde */
function archivMark(tag, hr) {
  const a = archiv.find((x) => x.tag === tag && +x.h === +hr);
  if (!a) return "";
  return `<i class="amark ${a.art}" data-tag="${tag}" data-h="${hr}"
    title="${a.art === "nichtda" ? "Kunde war nicht da" : "abgesagt"}">${a.art === "nichtda" ? "○" : "✗"}</i>`;
}
/* Zeigt, wer hier abgesagt hat – der Zeitblock bleibt trotzdem frei */
function archivZeigen(tag, hr) {
  const i = archiv.findIndex((x) => x.tag === tag && +x.h === +hr);
  if (i < 0) return;
  const a = archiv[i];
  const name = [a.vorname, a.nachname].filter(Boolean).join(" ").trim() || "Ohne Namen";
  simpleDialog(
    a.art === "nichtda" ? "Kunde war nicht da" : "Termin abgesagt",
    `${fmt(fromDk(tag))} · ${pad(hr)}–${pad(hr + 2)} Uhr`,
    `<div class="grp">
       <p style="margin:0 0 6px;font-weight:700">${name}</p>
       ${a.quelle ? `<p class="hinweis bleibt" style="margin:0">Quelle: ${a.quelle}</p>` : ""}
       <p class="hinweis">Der Zeitblock ist frei — du kannst ihn ganz normal neu belegen.
         ${a.nachname ? "Der Kunde steht in deiner Potenzialliste." : ""}</p>
     </div>
     <div class="actions"><button type="button" class="btn danger" id="amWeg">Zeichen entfernen</button></div>`,
    () => closeModal(),
    "Schließen",
  );
  const weg = document.getElementById("amWeg");
  if (weg)
    weg.onclick = () => {
      const j = archiv.findIndex((x) => x.tag === tag && +x.h === +hr);
      if (j >= 0) archiv.splice(j, 1);
      closeModal();
      saveData();
      renderAll();
    };
}
function insArchiv(tag, h, e, art) {
  archiv.push({
    tag,
    h: +h,
    art,
    vorname: e.vorname || "",
    nachname: e.nachname || "",
    quelle: e.quelle || "",
  });
  const grenze = plusTage(dk(new Date()), -120);
  for (let i = archiv.length - 1; i >= 0; i--) if (archiv[i].tag < grenze) archiv.splice(i, 1);
}
const key = (day, hour) => `${day}|${hour}`;
const toDec = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};
/* Startzeit auf die Viertelstunde; der Block bleibt im Planer auf seiner Stunde */
const startWert = (e, h) => (e && e.start) || pad(h) + ":00";
const plusTage = (dayKey, n) => {
  const d = fromDk(dayKey);
  d.setDate(d.getDate() + n);
  return dk(d);
};
const kurzName = (e) => {
  const v = (e.vorname || "").trim().charAt(0).toUpperCase();
  return v ? `${v}. ${e.nachname || ""}` : e.nachname || "";
};

function label(e) {
  if (e.kind === "kunde") return { t1: kurzName(e), t2: "" };
  if (e.kind === "premium")
    return { t1: kurzName(e), t2: "Premium CheckIn" + (e.start ? " · " + e.start : "") };
  if (e.kind === "abholen") return { t1: "Abholtermin", t2: kurzName(e) };
  if (e.kind === "eigenkauf") {
    const n = e.nb || {};
    return {
      t1: "Eigenkauf",
      t2: [e.start, n.umsatz ? eur(num(n.umsatz)) + " €" : ""].filter(Boolean).join(" · "),
    };
  }
  if (e.kind === "meeting") return { t1: e.notiz ? `${e.art} · ${e.notiz}` : e.art, t2: `${e.start || e.von}–${e.bis}` };
  if (e.kind === "terminieren") {
    /* Vorne steht das Ziel, dahinter die Kurzform der Art */
    const kurz =
      e.quelle === "Promotion"
        ? "Promo"
        : e.modus === "Door to Door"
          ? "D2D"
          : e.modus === "Bestandskunde"
            ? "KD Liste"
            : e.modus || "Terminieren";
    const erreicht = e.nb ? +e.nb.termine || 0 : null;
    const vorne = e.ziel ? (erreicht === null ? `Ziel ${e.ziel}` : `${erreicht}/${e.ziel}`) : "";
    const t1 = vorne ? `${vorne} · ${kurz}` : kurz;
    if (e.quelle === "Promotion") return { t1, t2: [e.ort, e.gebiet].filter(Boolean).join(" · ") };
    return { t1, t2: "Festgebietsbegehung" };
  }
  if (e.kind === "privat") return { t1: "Privat", t2: e.bis ? `${e.start || e.von}–${e.bis}` : "" };
  if (e.kind === "individuell")
    return { t1: e.titel || "Individuell", t2: e.bis ? `${e.start || e.von}–${e.bis}` : "" };
  return { t1: "", t2: "" };
}
/* Beträge: "1.250,50" -> 1250.5 */
/* Liest Beträge in jeder Schreibweise: 150,90 · 150.90 · 1.234,56 · 1,234.56 · 1.234 */
const num = (s) => {
  let t = String(s ?? "")
    .trim()
    .replace(/[\s€]/g, "");
  if (!t) return 0;
  const k = t.lastIndexOf(","),
    p = t.lastIndexOf(".");
  if (k >= 0 && p >= 0) {
    // beides: das hintere ist das Dezimalzeichen
    t = k > p ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (k >= 0) {
    // nur Komma
    t = t.match(/,/g).length > 1 ? t.replace(/,/g, "") : t.replace(",", ".");
  } else if (p >= 0) {
    // nur Punkt
    const hinten = t.length - p - 1;
    if (t.match(/\./g).length > 1 || hinten === 3) t = t.replace(/\./g, ""); // 1.234 oder 1.234.567
  }
  const v = parseFloat(t);
  return isNaN(v) ? 0 : v;
};
const eur = (v) => (v ? Math.round(v).toLocaleString("de-DE", { maximumFractionDigits: 0 }) : "–");
const preis = (v) =>
  (+v || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function dayTotals(day) {
  const t = { fg: 0, wg: 0, k70: 0, k70ein: 0 };
  Object.keys(entries).forEach((k) => {
    const e = entries[k];
    if (!e.nb || e.nb.fremd === "Ja") return; // für andere geschrieben
    if (abrechnungsTag(k.split("|")[0], e.nb) !== day) return;
    const n = e.nb;
    if (n.verkauft === "Ja") {
      if (n.gebiet === "Weißgebiet") t.wg += num(n.umsatz);
      else if (n.gebiet === "Festgebiet") t.fg += num(n.umsatz);
    }
    if (n.k70 === "Ja") t.k70 += num(n.k70betrag);
    t.fg += num(n.umsatzFG); // Verkauf während einer Promotion
    t.wg += num(n.umsatzWG);
  });
  einkaeufe.forEach((e) => {
    if (e.datum === day) t.k70ein += num(e.brutto);
  });
  return t;
}
/* Farben aus der Legende */
const COLORS = {
  kunde: "#A9D18E",
  eigenkauf: "#8FBF9F",
  premium: "#E8C4F2",
  meeting: "#77CDF5",
  privat: "#E0402F",
  promotion: "#F2B33D",
  terminieren: "#C9DD2C",
};
/* Farbtöpfe für individuelle Termine: die bekannten plus vier neue */
const FARBEN = [
  "#A9D18E",
  "#8FBF9F",
  "#E8C4F2",
  "#77CDF5",
  "#E0402F",
  "#F2B33D",
  "#C9DD2C",
  "#6FC3A0",
  "#E8A2C8",
  "#9FB4E8",
  "#D8C48A",
];
/* Farbe des Kontaktwegs - dieselben Farben wie in der Statistik */
const KONTAKT_FARBE = {
  Promotion: "#F2B33D",
  Empfehlung: "#9A6CE8",
  "Premium CheckIn": "#E8C4F2",
  Festgebietsbegehung: "#A9D18E",
  Vertriebsadresse: "#77CDF5",
  Wiederbesuch: "#5CC9B8",
};
/*
 * Den Strich im Planer gibt es nur am Kundentermin - überall sonst wäre
 * die Quelle ohnehin schon aus der Farbe des Feldes ablesbar.
 */
function quelleFarbe(e, nurPlaner) {
  if (!e) return null;
  if (e.kind === "kunde") return KONTAKT_FARBE[e.quelle] || null;
  if (nurPlaner) return null;
  if (e.kind === "premium") return KONTAKT_FARBE["Premium CheckIn"];
  if (e.kind === "abholen" || e.kind === "terminieren") return KONTAKT_FARBE[e.quelle] || null;
  return null;
}
function colorOf(e) {
  if (e.kind === "abholen") return COLORS.kunde; // dieselbe Farbe wie der Kundentermin
  if (e.kind === "individuell") return e.farbe || "#9FB4E8";
  if (e.kind === "terminieren") return e.quelle === "Promotion" ? COLORS.promotion : COLORS.terminieren;
  return COLORS[e.kind] || null;
}
/* Schriftfarbe nach Helligkeit – auf hellen Flächen dunkel, auf dunklen weiß */
function textOn(hex) {
  const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) > 0.35 ? "#1d211b" : "#ffffff";
}
/* Startzeiten, deren 2-Stunden-Fach sich mit von–bis überschneidet */
/* Gesperrt sind nur Fächer, die innerhalb der Dauer starten – nicht das davorliegende */
const coveredHours = (von, bis) => HOURS_ASC.filter((h) => h >= von && h < bis);
/*
 * Gesperrte Startzeiten eines Tages.
 * soft = nur optisch belegt (Privat) – dort lässt sich trotzdem ein Termin eintragen.
 */
function blockedSet(day) {
  const m = new Map();
  const setz = (h, e, soft) => {
    if (!entries[key(day, h)]) m.set(h, { c: colorOf(e), soft });
  };

  HOURS_ASC.forEach((h) => {
    const e = entries[key(day, h)];
    if (!e) return;
    const soft = e.kind === "privat" || e.kind === "individuell";
    if (e.bis)
      coveredHours(h, toDec(e.bis) || 24).forEach((x) => {
        if (x !== h) setz(x, e, soft);
      });
    /* Mehrtägige Privatzeit: der Starttag ist ab der Startzeit dicht */
    if ((e.kind === "privat" || e.kind === "individuell") && e.bisTag && e.bisTag > day)
      HOURS_ASC.forEach((x) => {
        if (x > h) setz(x, e, true);
      });
  });
  /* Folgetage einer mehrtägigen Privatzeit */
  Object.keys(entries).forEach((k) => {
    const [d] = k.split("|"),
      e = entries[k];
    if (!e || !["privat", "individuell"].includes(e.kind) || !e.bisTag) return;
    if (day <= d || day > e.bisTag) return;
    HOURS_ASC.forEach((x) => setz(x, e, true));
  });
  return m;
}
