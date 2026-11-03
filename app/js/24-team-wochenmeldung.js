/**
 * Team-Wochenmeldung
 *
 * Wochenkennzahlen aller Teammitglieder in einer Tabelle.
 */
/*
 * Eine Zeile je Person, Kennzahlen als Spalten (horizontal scrollbar).
 * Oben der Teamleiter, darunter nach Einstellungsdatum, ohne Datum am Ende.
 */
let tmMontag = null,
  tmLaeuft = false;

const TMSP = [
  ["Kundentermine", (m) => m.termine],
  ["Aktiv", (m) => (m.einheiten > 0 ? 1 : 0)],
  ["Einheiten", (m) => m.einheiten],
  ["davon Festgebiet", (m) => m.einheitenFG],
  ["davon Promotion", (m) => m.einheitenPromo],
  ["Umsatz netto", (m) => netto(m.umsatzFG + m.umsatzWG), "eur"],
  ["K70 Einkauf", (m) => netto(m.k70ein), "eur"],
  ["Premium CheckIn", (m) => m.pci],
  ["Promotion", (m) => m.promoFG + m.promoWG],
  [
    "Kontakte / Termine",
    (m) => `${m.kontakteFG + m.kontakteWG} / ${m.promoTermineFG + m.promoTermineWG}`,
    "text",
    (m) => m.kontakteFG + m.kontakteWG + m.promoTermineFG + m.promoTermineWG,
  ],
  ["Empfehlungen", (m) => m.empfehlungen],
  ["Jobtickets", (m) => m.jobtickets],
];
const TMSP_N = [
  ["Kundentermine", (m) => m.nTermine],
  ["Erw. Umsatz", (m) => m.erwarteterUmsatz, "eur"],
  ["Erw. Einheiten", (m) => m.erwarteteEinheiten, "dez"],
  ["Promotion", (m) => m.nPromos],
  ["Terminierung", (m) => m.nTerminieren],
];

function tmZelle(sp, m) {
  const roh = sp[1](m);
  if (sp[2] === "eur") return eur(roh) + " €";
  if (sp[2] === "dez") return dec(roh, 1);
  return roh;
}
function tmSummeZeile(spalten, daten) {
  return spalten.map((sp) => {
    if (sp[2] === "text") {
      const k = daten.reduce((n, d) => n + d.m.kontakteFG + d.m.kontakteWG, 0);
      const t = daten.reduce((n, d) => n + d.m.promoTermineFG + d.m.promoTermineWG, 0);
      return `${k} / ${t}`;
    }
    const summe = daten.reduce((n, d) => n + (+sp[1](d.m) || 0), 0);
    if (sp[2] === "eur") return eur(summe) + " €";
    if (sp[2] === "dez") return dec(summe, 1);
    return summe;
  });
}
function tmTabelle(titel, spalten, daten) {
  const kopf = `<tr><th class="fixspalte">Name</th>${spalten.map((sp) => `<th>${sp[0]}</th>`).join("")}</tr>`;
  const zeilen = daten
    .map(
      (d, i) =>
        `<tr class="tmzeile" style="--verzug:${Math.min(i, 12) * 35}ms">
       <td class="fixspalte">${d.name}${d.eigen ? ' <span class="chip mini">ich</span>' : ""}</td>
       ${spalten.map((sp) => `<td class="v">${tmZelle(sp, d.m)}</td>`).join("")}</tr>`,
    )
    .join("");
  const summe = tmSummeZeile(spalten, daten);
  return `<div class="ah4">${titel}</div>
    <div class="ascroll"><table class="atable tmtab">
      <thead>${kopf}</thead><tbody>${zeilen}
      <tr class="tmsumme"><td class="fixspalte">Gesamt</td>
        ${summe.map((w) => `<td class="v">${w}</td>`).join("")}</tr>
      </tbody></table></div>`;
}
async function teamMeldung() {
  const box = document.getElementById("tmeldung");
  if (!box || !istTeamleiter() || tmLaeuft) return;
  if (!tmMontag) tmMontag = new Date(monday);
  const { week } = isoWeek(tmMontag);
  const ende = new Date(tmMontag);
  ende.setDate(ende.getDate() + 6);
  const kopf = `<div class="asec">
    <div class="tmwoche">
      <button class="mini" id="tmmVor">‹</button>
      <div><b>KW ${week}</b><span class="sub">${fmt(tmMontag)} – ${fmt(ende)}</span></div>
      <button class="mini" id="tmmZur">›</button>
      <button class="mini" id="tmmHeute">Diese Woche</button>
    </div></div>`;
  box.innerHTML =
    kopf +
    `<div class="asec"><p class="aempty">Die Meldungen werden geholt …</p>
    <div class="laedt" style="height:34px;margin-top:12px">.</div>
    <div class="laedt" style="height:34px;margin-top:8px">.</div>
    <div class="laedt" style="height:34px;margin-top:8px">.</div></div>`;
  const bindeWoche = () => {
    const setz = (id, tage) => {
      const b = document.getElementById(id);
      if (b)
        b.onclick = () => {
          if (tage === null) tmMontag = new Date(monday);
          else {
            tmMontag = new Date(tmMontag);
            tmMontag.setDate(tmMontag.getDate() + tage);
          }
          teamMeldung();
        };
    };
    setz("tmmVor", -7);
    setz("tmmZur", 7);
    setz("tmmHeute", null);
  };
  bindeWoche();

  tmLaeuft = true;
  try {
    const woche = dk(tmMontag);
    /* Die eigenen Zahlen kommen automatisch aus dem eigenen Planer. */
    const daten = [
      { name: `${me.vorname} ${me.nachname}`, eigen: true, sort: -1, m: meldungDaten(tmMontag) },
    ];
    /* Die Teammitglieder trägst du selbst ein (Berater nutzen die App nicht gemeinsam). */
    const liste = typeof teamManuell === "function" ? teamManuell() : [];
    const fehlt = [];
    liste.forEach((mgl) => {
      const w = (teamMeldungen()[mgl.id] || {})[woche];
      if (!w) {
        fehlt.push(mgl.name);
        return;
      }
      daten.push({
        name: mgl.name,
        eigen: false,
        m: meldungAusManuell(w),
        sort: mgl.einst ? fromDk(mgl.einst).getTime() : Infinity,
      });
    });
    /* Der eigene Eintrag bleibt oben, danach: länger dabei zuerst */
    daten.sort((a, b) => a.sort - b.sort);
    box.innerHTML =
      kopf +
      `<div class="asec">${tmTabelle("Diese Woche", TMSP, daten)}</div>` +
      `<div class="asec">${tmTabelle("Kommende Woche", TMSP_N, daten)}</div>` +
      `<div class="asec"><p class="hinweis">Deine Teammitglieder und ihre Wochenzahlen trägst du
         selbst unter „Teammitglieder" ein.${fehlt.length ? ` Noch keine Meldung diese Woche: ${fehlt.join(", ")}.` : ""}</p></div>`;
    bindeWoche();
  } catch (e) {
    box.innerHTML =
      kopf +
      `<div class="asec"><p class="aempty">Die Übersicht liess sich nicht bauen.
      <br><small class="tspanne">${(e && e.message) || e}</small></p></div>`;
    bindeWoche();
  } finally {
    tmLaeuft = false;
  }
}
