/**
 * Dialog
 *
 * Modales Fenster, Formularfelder und Speichern von Einträgen.
 */
const modal = document.getElementById("modal"),
  sheet = document.getElementById("sheet");
let draft = null,
  step = "kind",
  error = "";

function openSlot(day, hour) {
  draft = { day, hour, nb: {} };
  error = "";
  const e = entries[key(day, hour)];
  step = e ? "view" : "kind";
  if (e && e.nb) draft.nb = { ...e.nb };
  blockZustaende();
  modal.classList.add("open");
  paint();
}
/* Schreibt den aktuellen Stand der Nachbereitung in den Termin, ohne das Fenster zu schließen */
function stilleSicherung() {
  if (!draft) return false;
  const e = entries[key(draft.day, draft.hour)];
  if (!e) return false;
  if (!["kunde", "premium", "terminieren"].includes(e.kind)) return false;
  const n = { ...draft.nb };
  ["_zu_kunde", "_zu_zeit", "_zu_gespraech", "_zu_vorfuehrung"].forEach((k) => delete n[k]);
  if (!Object.keys(n).length) return false;
  e.nb = { ...draft.nb };
  saveData();
  return true;
}
/* Jedes Fenster erhält einen scrollbaren Inhaltsbereich mit Innenabstand. */
function sheetNormalisieren() {
  if (!sheet) return;
  if (sheet.querySelector(":scope > .sheetkoerper")) return;
  const lose = [...sheet.children].filter(
    (k) => k.tagName !== "HEADER" && !k.classList.contains("sheetfuss"),
  );
  if (!lose.length) return;
  const koerper = document.createElement("div");
  koerper.className = "sheetkoerper";
  const fuss = sheet.querySelector(":scope > .sheetfuss");
  lose.forEach((k) => koerper.appendChild(k));
  fuss ? sheet.insertBefore(koerper, fuss) : sheet.appendChild(koerper);
}
function closeModal() {
  const gesichert = step === "view" ? stilleSicherung() : false;
  modal.classList.remove("open");
  draft = null;
  return gesichert;
}
/* Fenster einfach zumachen: der Zwischenstand bleibt trotzdem erhalten */
function closeUndZeichnen() {
  if (closeModal()) renderAll();
}
modal.addEventListener("click", (e) => {
  if (e.target.dataset.close !== undefined) closeUndZeichnen();
});

/*
 * Am Griff nach unten ziehen schließt das Fenster. Der Zwischenstand
 * wird dabei gesichert - closeModal() erledigt das über stilleSicherung().
 */
(function wischZu() {
  let start = 0,
    zieht = false;
  const griff = (ev) => {
    const kopf = ev.target.closest("header");
    return kopf && sheet.contains(kopf);
  };
  sheet.addEventListener(
    "touchstart",
    (ev) => {
      if (!griff(ev)) return;
      start = ev.touches[0].clientY;
      zieht = true;
      sheet.style.transition = "none";
    },
    { passive: true },
  );
  sheet.addEventListener(
    "touchmove",
    (ev) => {
      if (!zieht) return;
      const d = ev.touches[0].clientY - start;
      sheet.style.transform = d > 0 ? `translateY(${d}px)` : "";
    },
    { passive: true },
  );
  sheet.addEventListener(
    "touchend",
    (ev) => {
      if (!zieht) return;
      zieht = false;
      const d = ev.changedTouches[0].clientY - start;
      sheet.style.transition = "transform .22s ease";
      sheet.style.transform = "";
      if (d > 90) closeUndZeichnen();
    },
    { passive: true },
  );
})();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeUndZeichnen();
});

function head(sub, zusatz = "") {
  const d = fromDk(draft.day);
  /* Eigene Zeiten des Eintrags (z. B. Terminierung 16–21 Uhr) statt fester zwei Stunden */
  const e = typeof entries !== "undefined" ? entries[key(draft.day, draft.hour)] : null;
  const kurzZeit = (t) => String(t).replace(/:00$/, "");
  const zeit =
    e && e.bis
      ? `${kurzZeit(e.start || e.von || pad(draft.hour))}–${kurzZeit(e.bis)}`
      : `${pad(draft.hour)}–${pad(draft.hour + 2)}`;
  return `<header><div><h3 id="mTitle">${sub}</h3>
    <div class="when">${DAYS_L[(d.getDay() + 6) % 7]}, ${fmtShort(d)} · ${zeit} Uhr</div></div>
    <button class="x" data-close aria-label="Schließen">✕</button>${zusatz}</header>`;
}
/* Fortschritt der Nachbereitung: Anzahl vollständiger Pflichtblöcke. */
function nbFortschritt() {
  const n = draft.nb || {};
  const bloecke = [
    !!n.realStart && !!n.realEnde,
    !!n.kundenart && !!n.gebiet,
    !!n.empfehlung && !!n.jobticket,
    !!(n.geraet || "").trim(),
    (n.vorgefuehrt || []).length > 0,
    !!n.verkauft,
    n.verkauft === "Nein" ? nkFertig(n) : n.verkauft === "Ja" ? !!n.einheiten : false,
  ];
  const NAMEN = [
    "Zeiten",
    "Kundenart und Gebiet",
    "Empfehlung und Jobticket",
    "Gerät",
    "Vorgeführt",
    "Verkauft ja/nein",
    "Abschluss",
  ];
  const ANKER = [
    "realStart",
    "kundenart",
    "empfehlung",
    "geraet",
    "vorgefuehrt",
    "verkauft",
    n.verkauft === "Nein" ? "grund" : "einheiten",
  ];
  const fertig = bloecke.filter(Boolean).length;
  const pct = Math.round((fertig / bloecke.length) * 100);
  const naechster = bloecke.indexOf(false);
  /*
   * Der Balken sagt nur DASS etwas fehlt. Die Liste sagt WAS - und
   * bringt einen mit einem Tipp direkt dorthin.
   */
  const liste = NAMEN.map(
    (name, i) =>
      `<button type="button" class="fsblock${bloecke[i] ? " ok" : ""}${i === naechster ? " dran" : ""}"
       data-nbspring="${ANKER[i]}"><i>${bloecke[i] ? "✓" : ""}</i>${name}</button>`,
  ).join("");
  const offen = !!n._blockliste;
  return `<div class="nbfortschritt">
    <div class="nbbalken"><i style="width:${pct}%"></i></div>
    <button type="button" class="nbtext" id="nbListeAuf" aria-expanded="${offen}">
      <span>${fertig} von ${bloecke.length} Blöcken vollständig</span>
      <span>${pct} % <b class="kp">›</b></span></button>
    ${offen ? `<div class="fsblocks">${liste}</div>` : ""}
  </div>`;
}
const opts = (arr, act) => arr.map((o) => `<button class="opt" data-${act}="${o}">${o}</button>`).join("");
const seg = (name, vals, cur, cls = "") =>
  `<div class="seg ${cls}">${vals.map((v) => `<button type="button" data-seg="${name}" data-val="${v}" aria-pressed="${cur === v}">${v}</button>`).join("")}</div>`;
const checks = (name, vals, cur = [], cls = "") =>
  `<div class="checks ${cls}">${vals.map((v) => `<button type="button" data-chk="${name}" data-val="${v}" aria-pressed="${cur.includes(v)}">${v}</button>`).join("")}</div>`;
const fld = (id, lbl, val = "", type = "text", extra = "") =>
  `<div class="field"><label for="${id}">${lbl}</label><input id="${id}" type="${type}" value="${val ?? ""}" ${extra}></div>`;
/* Startzeit im gewählten Feld auf die Viertelstunde */
const startSelect = (id, h, cur) =>
  `<select id="${id}">${[0, 15, 30, 45]
    .map((m) => {
      const v = pad(h) + ":" + pad(m);
      return `<option value="${v}" ${(cur || pad(h) + ":00") === v ? "selected" : ""}>${v} Uhr</option>`;
    })
    .join("")}</select>`;
const hourSelect = (id, cur) =>
  `<select id="${id}">${HOURS_ASC.map((h) => `<option value="${h}" ${+cur === h ? "selected" : ""}>${pad(h)}:00 – ${pad(h + 2)}:00</option>`).join("")}</select>`;

const FIELD_IDS = [
  "jobAnzahl",
  "geraet",
  "demotuecher",
  "einheiten",
  "umsatz",
  "k70betrag",
  "grund",
  "pcDatum",
  "abDatum",
  "f_vor",
  "f_nach",
  "f_str",
  "f_hnr",
  "f_plz",
  "f_ort",
  "f_tel",
  "f_notiz",
  "lieferdatum",
  "vsDatum",
  "tueren",
  "erreicht",
  "termine",
  "rueck",
  "ansprachen",
  "gespraeche",
  "kontakte",
  "realStart",
  "realEnde",
  "umsatzFG",
  "umsatzWG",
  "wvMonat",
];
function collect() {
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) draft.nb[id] = el.value;
  });
  const sel = document.getElementById("pcZeit");
  if (sel) draft.nb.pcZeit = sel.value;
  const abz = document.getElementById("abZeit");
  if (abz) draft.nb.abZeit = abz.value;
  const anr = document.getElementById("f_anrede");
  if (anr) draft.nb.f_anrede = anr.value;
  const emp = document.querySelectorAll("[data-emp]");
  if (emp.length) {
    const liste = [];
    emp.forEach((el) => {
      const [i, feld] = el.dataset.emp.split("|");
      liste[i] = liste[i] || {};
      liste[i][feld] = el.value;
    });
    draft.nb.empfListe = liste;
  }
  const vs = document.getElementById("vsZeit");
  if (vs) draft.nb.vsZeit = vs.value;
}
/* Sichtbare Antwort auf einen Knopfdruck - ohne Fenster zum Wegtippen */
function quittung(knopf, text) {
  if (!knopf || !knopf.parentElement) return;
  const alt = knopf.parentElement.querySelector(".quittung");
  if (alt) alt.remove();
  const q = document.createElement("span");
  q.className = "quittung";
  q.innerHTML = `<svg viewBox="0 0 24 24" class="haken" aria-hidden="true">
      <path d="M4 12.5l5.2 5.2L20 6.8"/></svg>${text}`;
  knopf.parentElement.appendChild(q);
  requestAnimationFrame(() => q.classList.add("da"));
  setTimeout(() => {
    q.classList.remove("da");
    setTimeout(() => q.remove(), 340);
  }, 2000);
}
function repaint() {
  const alt = sheet.querySelector(":scope > .sheetkoerper");
  const y = alt ? alt.scrollTop : sheet.scrollTop;
  paint();
  const neu = sheet.querySelector(":scope > .sheetkoerper");
  if (neu) neu.scrollTop = y;
  else sheet.scrollTop = y;
  zumFehler();
}
/* Springt zum ersten fehlenden Pflichtfeld und hebt es kurz hervor */
function zumFehler() {
  if (!draft || !draft.fokus) return;
  const sel = draft.fokus;
  draft.fokus = null;
  requestAnimationFrame(() => {
    const el = sheet.querySelector(sel);
    if (!el) return;
    const ziel = el.closest(".sect, .field, .zzeile, .actions, .grp") || el;
    ziel.classList.add("fehltmark");
    setTimeout(() => ziel.classList.remove("fehltmark"), 2600);
    const y = ziel.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop;
    sheet.scrollTo({ top: Math.max(0, y - 70), behavior: "smooth" });
  });
}
