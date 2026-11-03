/**
 * Papierkorb und Menü
 *
 * Papierkorb und Kontoverwaltung. Der frühere Geräteabgleich über die Cloud
 * ist entfallen – die App läuft lokal, es gibt nichts abzugleichen.
 */

/* ================= Menü ================= */
const IC = {
  heute: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  planer: '<path d="M4 6h16v14H4z"/><path d="M4 10h16M9 3v4M15 3v4M9 14h2M13 14h2M9 17h2M13 17h2"/>',
  statistik: '<path d="M3 5h18v14H3z"/><path d="M3 9h18M9 9v10M15 9v10"/>',
  auswertungen: '<path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/>',
  wiedervorlage:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M3.5 5.5 6 3.5M20.5 5.5 18 3.5"/>',
  potenzial:
    '<path d="M4 6h10M4 12h10M4 18h7"/><path d="m17 14 1.6 3.3 3.4.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4L12 17.8l3.4-.5z" transform="translate(0,-6) scale(0.85) translate(3,3)"/>',
  empfehlung:
    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M17 8h5M19.5 5.5v5"/>',
  inventur: '<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>',
  wunsch:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  provision:
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15v2"/>',
  faq: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4"/><path d="M12 17h.01"/>',
  jahr: '<path d="M3 20V4M3 20h18"/><path d="M7 16l4-5 3.5 3L21 7"/><circle cx="21" cy="7" r="1.4"/>',
  profil: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  team: '<circle cx="8.5" cy="8.5" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M2.5 19c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/><path d="M16 14.2c2.9 0 5.5 1.5 5.5 4.3"/>',
  ziele:
    '<path d="M6 3v9a6 6 0 0 0 12 0V3z"/><path d="M6 5H3.5v2A3.5 3.5 0 0 0 7 10.5M18 5h2.5v2A3.5 3.5 0 0 1 17 10.5"/><path d="M12 18v3M8.5 21h7"/>',
  jobtickets:
    '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 12h18"/>',
  teamumsatz: '<path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/><circle cx="10" cy="5" r="1.6"/>',
  teammeldung: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M3 14h18"/>',
  fahrten:
    '<path d="M5 17h14M6.5 17V9.5l1.7-3.5h7.6l1.7 3.5V17"/><circle cx="8" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/><path d="M6.5 12.5h11"/>',
  kunden:
    '<circle cx="12" cy="7.5" r="3.4"/><path d="M4.5 20c0-4 3.4-6.3 7.5-6.3s7.5 2.3 7.5 6.3"/><path d="M4 4.5h2M18 4.5h2"/>',
};
const ic = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const MENUE = [
  ["heute", "Heute"],
  ["planer", "Planer"],
  ["statistik", "Statistik"],
  ["auswertungen", "Auswertungen"],
  ["kunden", "Kundenliste"],
  ["potenzial", "Potenzialliste"],
  ["empfehlung", "Empfehlungsliste"],
  ["inventur", "K70 Inventur"],
  ["wunsch", "Provisionswunsch"],
  ["provision", "Provisionsrechner"],
  ["ziele", "Ziele"],
  ["jobtickets", "Jobtickets"],
  ["fahrten", "Fahrtenbuch"],
  ["jahr", "Jahresrückblick"],
  ["profil", "Profil"],
];
const MENUE_TL = [
  ["teammeldung", "Wochenmeldung"],
  ["teamumsatz", "Teamumsatz"],
  ["team", "Teammitglieder"],
];
function renderMenu() {
  const bau = (liste) =>
    liste
      .map(
        ([k, t]) =>
          `<a class="navlink" href="#${k}" data-page="${k}"><span class="mic">${ic(k)}</span>${t}</a>`,
      )
      .join("");
  document.getElementById("navHaupt").innerHTML = bau(MENUE);
  document.getElementById("navTL").innerHTML = istTeamleiter() ? bau(MENUE_TL) : "";
  document.getElementById("drawerFoot").innerHTML = me
    ? `<div class="ktext"><b>${me.vorname} ${me.nachname}</b><span>${me.dk} · ${me.rolle}</span></div>
       <button id="logoutBtn">Abmelden</button>`
    : "";
  const lo = document.getElementById("logoutBtn");
  if (lo) lo.onclick = logout;
  const k = location.hash.slice(1) || "heute";
  document
    .querySelectorAll(".navlink")
    .forEach((a) =>
      a.dataset.page === k ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"),
    );
}

/* ================= Papierkorb ================= */
function inPapierkorb(day, hour) {
  const e = entries[key(day, hour)];
  if (!e) return;
  papierkorb.unshift({ tag: day, h: hour, e: JSON.parse(JSON.stringify(e)), weg: Date.now() });
  if (papierkorb.length > 60) papierkorb.length = 60;
  delete entries[key(day, hour)];
}
function renderPapierkorb() {
  const box = document.getElementById("papierkorb");
  if (!box) return;
  if (!papierkorb.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<details class="korb"><summary>Papierkorb · ${papierkorb.length}</summary>
    <div class="korbliste">${papierkorb
      .map((x, i) => {
        const l = label(x.e);
        return `<div class="korbzeile">
        <span>${fmtShort(fromDk(x.tag))} · ${pad(x.h)} Uhr · ${x.e.nachname || l.t1 || x.e.kind}</span>
        <button class="mini" data-korb="${i}">Wiederherstellen</button></div>`;
      })
      .join("")}</div>
    <p class="hinweis">Einträge verschwinden nach 30 Tagen von selbst.</p></details>`;
  box.querySelectorAll("[data-korb]").forEach(
    (b) =>
      (b.onclick = () => {
        const x = papierkorb[+b.dataset.korb];
        if (!x) return;
        if (entries[key(x.tag, x.h)]) {
          alert("Auf diesem Platz steht bereits ein Eintrag.");
          return;
        }
        entries[key(x.tag, x.h)] = x.e;
        papierkorb.splice(+b.dataset.korb, 1);
        renderAll();
      }),
  );
}
