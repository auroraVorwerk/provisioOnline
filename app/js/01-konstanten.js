/**
 * Konstanten
 *
 * Wochenfarben, Terminarten, Kontaktwege und feste Vorgaben.
 */
const PAGES = {
  heute: "Heute",
  planer: "Planer",
  potenzial: "Potenzialliste",
  wiedervorlage: "Wiedervorlage",
  statistik: "Statistik",
  auswertungen: "Auswertungen",
  empfehlung: "Empfehlungsliste",
  provision: "Provisionsrechner",
  jahr: "Jahresrückblick",
  faq: "Hilfe",
  wunsch: "Provisionswunsch",
  team: "Teammitglieder",
  inventur: "K70 Inventur",
  profil: "Profil",
  ziele: "Ziele",
  jobtickets: "Jobtickets",
  teamumsatz: "Teamumsatz",
  fahrten: "Fahrtenbuch",
  kunden: "Kundenliste",
  teammeldung: "Wochenmeldung",
};
const DAYS_S = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAYS_L = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const START_HOURS = Array.from({ length: 16 }, (_, i) => 22 - i); // 22 … 7 (Anzeige)
const HOURS_ASC = [...START_HOURS].reverse(); // 7 … 22 (Logik)
const METRICS = [
  { n: "Festgebietsumsatz", kurz: "FG €", k: "fg" },
  { n: "Weißgebiet", kurz: "WG €", k: "wg" },
  { n: "K70 Verkauf", kurz: "K70 VK", k: "k70", click: "rahmen" },
  { n: "K70 Einkauf", kurz: "K70 EK", k: "k70ein", click: "einkauf", noSoll: true },
];
const QUELLEN = [
  "Festgebietsbegehung",
  "Promotion",
  "Vertriebsadresse",
  "Empfehlung",
  "Premium CheckIn",
  "Wiederbesuch",
]; // Wiederbesuch: Bestandskunde meldet sich selbst zum Folgetermin
const MEETINGS = ["Teammeeting", "Training", "Schulung", "Event"];
const DEMO = [
  "VK7 Grundgerät",
  "EB7 Elektrobürste",
  "SP7 Saugwischer",
  "PB7 Polsterbürste",
  "MR7 Milbenaufsatz",
  "AC7 Düsenset",
  "VG100+ Flächenreiniger",
  "VM7 Handstaubsauger",
  "VR7 Saugroboter",
  "RB7 Saugstation",
];
const BESITZ = ["VK7", "EB7", "SP7", "PB7", "VR7", "RB7", "VG100+", "VM7"];
/* Die häufigsten Gründe, warum nicht gekauft wurde - jeder mit eigener Farbe für den Streifen */
const NK_GRUENDE = [
  "will 0 %",
  "will 2. Akku",
  "wartet auf Urlaubsgeld",
  "muss mit Partner sprechen",
  "passt finanziell aktuell nicht",
  "will „alt gegen neu“",
];
const NK_FARBE = {
  "will 0 %": "#F2B33D",
  "will 2. Akku": "#77CDF5",
  "wartet auf Urlaubsgeld": "#A9D18E",
  "muss mit Partner sprechen": "#9A6CE8",
  "passt finanziell aktuell nicht": "#E0402F",
  "will „alt gegen neu“": "#E8C4F2",
};
const grundFarbe = (g) => NK_FARBE[g] || "#8899A6";
/* Leerzustand mit Handlungsaufforderung statt leerer Zeile */
const LEER_IC = {
  liste: '<path d="M4 6h13M4 12h13M4 18h8"/><circle cx="19" cy="18" r="3"/>',
  uhr: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.7M8.5 3.5 6 5.5M15.5 3.5 18 5.5"/>',
  karte: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 14h5"/>',
};
function leerbox(icon, titel, text, knopf, ziel) {
  return `<div class="leerbox">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
      stroke-linecap="round" stroke-linejoin="round">${LEER_IC[icon] || LEER_IC.liste}</svg>
    <b>${titel}</b><p>${text}</p>
    ${knopf ? `<button class="btn primary" data-leerziel="${ziel}">${knopf}</button>` : ""}
  </div>`;
}
const CATS = [
  { t: "Termin FG-Kunden", c: "#A9D18E" },
  { t: "Termin Telefon/Vertriebsadresse", c: "#E2F0D9" },
  { t: "Empfehlungstermin", c: "#9A6CE8" },
  { t: "Premium CheckIn", c: "#E8C4F2" },
  { t: "Wiederbesuch", c: "#5CC9B8" },
  { t: "Promotion", c: "#F2B33D" },
  { t: "Meeting/Seminar", c: "#77CDF5" },
  { t: "Terminieren", c: "#C9DD2C" },
  { t: "Privat", c: "#E0402F" },
];
