/**
 * Statistik
 *
 * Wochenstatistik als Tabelle (iPad) und als Kartenliste (Handy).
 */
const KONTAKT = [
  { t: "Promotion", q: "Promotion", c: "#F2B33D" },
  { t: "Empfehlung", q: "Empfehlung", c: "#9A6CE8" },
  { t: "Premium CheckIn", q: "Premium CheckIn", c: "#E8C4F2" },
  { t: "Festgebietsbegehung", q: "Festgebietsbegehung", c: "#A9D18E" },
  { t: "Vertriebsadresse", q: "Vertriebsadresse", c: "#77CDF5" },
  { t: "Wiederbesuch", q: "Wiederbesuch", c: "#5CC9B8" },
];
/* Farben je Spalte */
const C_NEUKUNDE = "#F0A868",
  C_KUNDE = "#F5D98A"; // Kundenart
const C_FG = "#9CC08B",
  C_WG = "#E4E9EC"; // Gebiet – Weißgebiet fast weiß
const C_JOB = "#D77BC0",
  C_EMPF = "#9A6CE8",
  C_PCI = "#E8C4F2";
const C_ZUBEHOER = "#C9B673",
  C_VG100 = "#7FB8C4",
  C_VM7 = "#B2A6E8",
  C_ROBOT = "#E39A9A";
const C_SERVICE = "#A9C4B0";
const demoColor = (t) =>
  t.startsWith("VG100+")
    ? C_VG100
    : t.startsWith("VM7")
      ? C_VM7
      : t.startsWith("VR7") || t.startsWith("RB7")
        ? C_ROBOT
        : C_ZUBEHOER;
const tick = (on, c, gs = "") =>
  on ? `<td class="tick ${gs}" style="color:${c}">✓</td>` : `<td class="off ${gs}"></td>`;
const cnt = (v, c, gs = "") =>
  +v > 0 ? `<td class="tick num ${gs}" style="color:${c}">${+v}</td>` : `<td class="off ${gs}"></td>`;
const money = (v) => (v ? `<td class="num strong">${eur(v)}</td>` : `<td class="off"></td>`);
/* Gefragt, aber nichts bekommen - das ist etwas anderes als gar nicht gefragt */
const kreuz = (c) => `<td class="tick nein" style="color:${c}">✕</td>`;

function statRows() {
  const rows = [];
  weekDays.forEach((d, i) => {
    const day = dk(d);
    [...HOURS_ASC, 23, 24, 25, 26, 27, 28, 29, 30].forEach((h) => {
      const e = entries[key(day, h)];
      if (!e) return;
      const n = e.nb || {};
      const pcVerkauf = n.verkauft === "Ja" || n.k70 === "Ja"; // ohne Verkauf zählt ein CheckIn nicht
      if (e.kind === "kunde" || e.kind === "distanz" || (e.kind === "premium" && pcVerkauf))
        rows.push({ i, h, e, n });
    });
  });
  return rows;
}
function renderStat() {
  const { week } = isoWeek(monday);
  document.getElementById("kwText2").textContent = `KW ${week}`;
  document.getElementById("rangeText2").textContent = `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  document.getElementById("todayBtn2").hidden = +monday === +mondayOf(new Date());

  const vh = (t, c) =>
    `<th class="vh col-tick"${c ? ` style="background:${c};color:${textOn(c)}"` : ""}><span>${t}</span></th>`;
  const VH = `<th class="vsep"></th>`,
    V = `<td class="vsep"></td>`;
  const COLS = 32 + KONTAKT.length;
  let head = `<thead>
    <tr class="grp">
      <th class="empty sticky s1 col-time"><button class="pdfbtn" id="pdfBtn" title="Als PDF exportieren">PDF</button></th><th class="empty sticky s2 col-name"></th>
      ${VH}<th colspan="${KONTAKT.length}">Kontaktweg</th>${VH}<th colspan="2">Kunde</th>${VH}<th colspan="2">Gebiet</th>
      ${VH}<th colspan="3">Profi</th>${VH}<th>Kunde</th>${VH}<th colspan="12">Vorgeführt</th>
      ${VH}<th colspan="3">Einheiten und Umsätze</th>
    </tr>
    <tr>
      <th class="sticky s1 col-time">Uhrzeit</th><th class="sticky s2 col-name">Kunde und Anschrift</th>
      ${VH}${KONTAKT.map((k) => vh(k.t, k.c)).join("")}
      ${VH}${vh("Neukunde", C_NEUKUNDE)}${vh("Kunde", C_KUNDE)}
      ${VH}${vh("Festgebiet", C_FG)}${vh("Weißgebiet", C_WG)}
      ${VH}${vh("Jobticket", C_JOB)}${vh("Empfehlung", C_EMPF)}${vh("PCI vereinbart", C_PCI)}
      ${VH}<th class="col-alt">Altgeräte</th>
      ${VH}${DEMO.map((d) => vh(d, demoColor(d))).join("")}${vh("Service", C_SERVICE)}${vh("Demotücher", C_SERVICE)}
      ${VH}<th class="col-num">Anzahl Einheiten</th><th class="col-num">Brutto Einheiten</th><th class="col-num">Brutto K70</th>
    </tr></thead>`;

  renderStatMobil();
  const rows = statRows();
  let body = "";
  if (!rows.length) {
    body = `<tr class="empty"><td colspan="${COLS}">In dieser Woche sind noch keine Kundentermine eingetragen.</td></tr>`;
  } else {
    let lastDay = -1,
      z = 0;
    rows.forEach((r) => {
      const e = r.e,
        n = r.n;
      if (r.i !== lastDay) {
        lastDay = r.i;
        z = 0;
        body += `<tr class="dayrow"><td colspan="${COLS}"><span>${DAYS_L[r.i]} · ${fmtShort(weekDays[r.i])}</span></td></tr>`;
      }
      const weg = e.kind === "premium" ? "Premium CheckIn" : e.quelle;
      const kart = e.kind === "premium" ? "Bestandskunde" : n.kundenstatus;
      const zc = z++ % 2 ? "z1" : "z0";
      body += `<tr class="${zc}">
        <td class="sticky s1 num">${pad(r.h)}–${pad(r.h + 2)}</td>
        <td class="name sticky s2">${e.vorname} ${e.nachname}<small>${[e.strasse, [e.plz, e.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</small></td>
        ${V}${KONTAKT.map((k) => tick(weg === k.q, k.c)).join("")}
        ${V}${tick(kart === "Neukunde", C_NEUKUNDE)}${tick(kart === "Bestandskunde", C_KUNDE)}
        ${V}${tick(n.gebiet === "Festgebiet", C_FG)}${tick(n.gebiet === "Weißgebiet", C_WG)}
        ${V}${
          n.job !== "Ja"
            ? `<td class="off"></td>`
            : (+n.jobAnzahl || 0) > 0
              ? cnt(n.jobAnzahl, C_JOB)
              : kreuz(C_JOB)
        }
        ${
          n.empf !== "Ja"
            ? `<td class="off"></td>`
            : n.empfErhalten !== "Nein" && empfZahl(n) > 0
              ? cnt(empfZahl(n), C_EMPF)
              : kreuz(C_EMPF)
        }
        ${tick(!!n.pcDatum, C_PCI)}
        ${V}${n.geraet ? `<td class="name alt">${n.geraet}</td>` : `<td class="off"></td>`}
        ${V}${DEMO.map((d) => tick((n.vorgefuehrt || []).includes(d), demoColor(d))).join("")}
        ${tick(n.wartung === "Ja", C_SERVICE)}
        ${cnt(n.demotuecher, C_SERVICE)}
        ${V}${n.einheiten ? `<td class="num strong">${+n.einheiten}</td>` : `<td class="off"></td>`}
        ${money(num(n.umsatz))}
        ${money(num(n.k70betrag))}
      </tr>`;
    });
  }

  /* Summenzeile */
  const s = {};
  const add = (k, v) => (s[k] = (s[k] || 0) + v);
  rows.forEach(({ e, n }) => {
    const weg = e.kind === "premium" ? "Premium CheckIn" : e.quelle;
    const kart = e.kind === "premium" ? "Bestandskunde" : n.kundenstatus;
    KONTAKT.forEach((k) => {
      if (weg === k.q) add("k" + k.q, 1);
    });
    if (kart === "Neukunde") add("neu", 1);
    if (kart === "Bestandskunde") add("best", 1);
    if (n.gebiet === "Festgebiet") add("fg", 1);
    if (n.gebiet === "Weißgebiet") add("wg", 1);
    if (n.job === "Ja") add("job", +n.jobAnzahl || 0);
    if (n.empf === "Ja" && n.empfErhalten !== "Nein") add("empf", empfZahl(n));
    if (n.pcDatum) add("pci", 1);
    DEMO.forEach((d) => {
      if ((n.vorgefuehrt || []).includes(d)) add("d" + d, 1);
    });
    if (n.wartung === "Ja") add("service", 1);
    add("tuecher", +(n.demotuecher || 0));
    add("einheiten", +(n.einheiten || 0));
    add("umsatz", num(n.umsatz));
    add("k70", num(n.k70betrag));
  });
  const cell = (v) => `<td>${v || "–"}</td>`;
  const foot = `<tr class="sum">
    <td class="lbl sticky s1">Summe</td><td class="sticky s2"></td>
    ${V}${KONTAKT.map((k) => cell(s["k" + k.q])).join("")}
    ${V}${cell(s.neu)}${cell(s.best)}
    ${V}${cell(s.fg)}${cell(s.wg)}
    ${V}${cell(s.job)}${cell(s.empf)}${cell(s.pci)}
    ${V}<td></td>
    ${V}${DEMO.map((d) => cell(s["d" + d])).join("")}${cell(s.service)}${cell(s.tuecher)}
    ${V}${cell(s.einheiten)}${cell(eur(s.umsatz))}${cell(eur(s.k70))}
  </tr>`;

  const t = document.getElementById("statTable");
  t.innerHTML = head + `<tbody>${body}${foot}</tbody>`;
}
/* Handyansicht der Statistik: eine Karte je Termin statt der breiten Tabelle */
function renderStatMobil() {
  const box = document.getElementById("statMobil");
  if (!box) return;
  const rows = statRows();
  if (!rows.length) {
    box.innerHTML = `<div class="asec"><p class="aempty">In dieser Woche sind noch keine Kundentermine eingetragen.</p></div>`;
    return;
  }
  let h = "",
    lastDay = -1;
  let sE = 0,
    sU = 0,
    sK = 0;
  rows.forEach((r) => {
    const e = r.e,
      n = r.n;
    if (r.i !== lastDay) {
      lastDay = r.i;
      h += `<div class="smtag">${DAYS_L[r.i]} · ${fmtShort(weekDays[r.i])}</div>`;
    }
    const weg = e.kind === "premium" ? "Premium CheckIn" : e.quelle || "";
    const kart = e.kind === "premium" ? "Bestandskunde" : n.kundenstatus || "";
    const eh = +n.einheiten || 0,
      um = num(n.umsatz),
      k7 = num(n.k70betrag);
    sE += eh;
    sU += um;
    sK += k7;
    const chips = [];
    if (weg) chips.push(`<span class="chip">${weg}</span>`);
    if (kart) chips.push(`<span class="chip">${kart}</span>`);
    if (n.gebiet) chips.push(`<span class="chip">${n.gebiet}</span>`);
    if (n.job === "Ja")
      chips.push(
        `<span class="chip${+n.jobAnzahl || 0 ? "" : " nein"}">${
          +n.jobAnzahl || 0 ? `${+n.jobAnzahl} Jobticket` : "Jobticket ✕"
        }</span>`,
      );
    if (n.empf === "Ja")
      chips.push(
        `<span class="chip${n.empfErhalten !== "Nein" && empfZahl(n) ? "" : " nein"}">${
          n.empfErhalten !== "Nein" && empfZahl(n) ? `${empfZahl(n)} Empfehlung` : "Empfehlung ✕"
        }</span>`,
      );
    if (n.pcDatum) chips.push(`<span class="chip">PCI vereinbart</span>`);
    const demo = n.vorgefuehrt || [];
    h += `<div class="smkarte${um || eh ? " hatumsatz" : ""}">
      <div class="smkopf"><b>${(e.vorname || "").charAt(0) ? (e.vorname || "").charAt(0) + ". " : ""}${e.nachname || "–"}</b>
        <span>${pad(r.h)}–${pad(r.h + 2)} Uhr</span></div>
      ${adresseVon(e) ? `<div class="smadr">${adresseVon(e)}</div>` : ""}
      ${chips.length ? `<div class="smchips">${chips.join("")}</div>` : ""}
      ${demo.length ? `<div class="smdemo">Vorgeführt: ${demo.join(" · ")}${+n.demotuecher ? ` · ${+n.demotuecher} Demotücher` : ""}</div>` : ""}
      ${
        eh || um || k7
          ? `<div class="smzahlen">
        ${eh ? `<span><i>Einheiten</i><b>${eh}</b></span>` : ""}
        ${um ? `<span><i>Brutto</i><b>${eur(um)} €</b></span>` : ""}
        ${k7 ? `<span><i>K70</i><b>${eur(k7)} €</b></span>` : ""}
      </div>`
          : `<div class="smzahlen leer">kein Verkauf</div>`
      }
    </div>`;
  });
  h += `<div class="smsumme"><span>Woche gesamt</span>
    <b>${sE} Einheiten · ${eur(sU)} € · K70 ${eur(sK)} €</b></div>`;
  box.innerHTML = h;
}

/* Zeile antippen hebt sie hervor – hilft beim Verfolgen über die Breite */
document.getElementById("statTable").addEventListener("click", (ev) => {
  const tr = ev.target.closest("tbody tr");
  if (!tr || tr.classList.contains("dayrow")) return;
  const on = tr.classList.contains("hl");
  document.querySelectorAll(".stat tr.hl").forEach((x) => x.classList.remove("hl"));
  if (!on) tr.classList.add("hl");
});
