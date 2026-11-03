/**
 * Datum
 *
 * Kalenderwochen, Wochentage und Datumsformate.
 */
const pad = (n) => String(n).padStart(2, "0");
const dk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromDk = (s) => {
  const [y, m, d] = String(s || "")
    .split("-")
    .map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};
const fmt = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const fmtShort = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
/* Wiedervorlagen laufen bewusst auf Monatsebene - ein Tag wäre zu genau gedacht */
const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const monatJetzt = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monatText = (m) => {
  const [y, mm] = String(m || "")
    .split("-")
    .map(Number);
  return y && mm ? `${MONATE[mm - 1]} ${y}` : "";
};
const monatKurz = (m) => {
  const [y, mm] = String(m || "")
    .split("-")
    .map(Number);
  return y && mm ? `${MONATE[mm - 1].slice(0, 3)} ${String(y).slice(2)}` : "";
};
const alsMonat = (w) => String(w || "").slice(0, 7);
/* Wiedervorlage als Monat oder fester Tag */
const WT_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const istTagWert = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const wvWert = (w) => (w ? w.tag || w.monat || "" : "");
const wvText = (w) =>
  !w ? "" : w.tag ? `${WT_KURZ[fromDk(w.tag).getDay()]}, ${fmt(fromDk(w.tag))}` : monatText(w.monat);
const wvKurz = (w) =>
  !w ? "" : w.tag ? `${WT_KURZ[fromDk(w.tag).getDay()]} ${fmtShort(fromDk(w.tag))}` : monatKurz(w.monat);
const wvFaellig = (w) => !!w && (w.tag ? w.tag <= dk(new Date()) : w.monat <= monatJetzt());
const wvSort = (w) => (w ? w.tag || w.monat + "-00" : "");
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function isoWeek(date) {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3);
  const f = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  f.setUTCDate(f.getUTCDate() - ((f.getUTCDay() + 6) % 7) + 3);
  return { week: 1 + Math.round((t - f) / 604800000), year: t.getUTCFullYear() };
}
function weeksInISOYear(y) {
  const j = new Date(Date.UTC(y, 0, 1)).getUTCDay();
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return j === 4 || (leap && j === 3) ? 53 : 52;
}
function vertriebswoche(week, year) {
  const lastBlock = weeksInISOYear(year) === 53 ? 6 : 5;
  if (week === 53) return { n: 6, of: 6 };
  const r = (week - 1) % 13;
  if (r < 4) return { n: r + 1, of: 4 };
  if (r < 8) return { n: r - 3, of: 4 };
  return { n: r - 7, of: Math.floor((week - 1) / 13) === 3 ? lastBlock : 5 };
}
