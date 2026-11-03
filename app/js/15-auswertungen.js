/**
 * Auswertungen
 *
 * Quoten und Vergleiche nach Wochentag, Uhrzeit, Kontaktweg und Gebiet.
 */
const RANGES = [
  { w: 1, t: "1 Woche" },
  { w: 4, t: "4 Wochen" },
  { w: 13, t: "13 Wochen" },
  { w: 26, t: "26 Wochen" },
  { w: 52, t: "52 Wochen" },
];
let rangeWeeks = 4;
const TAGESZEIT = ["Vormittag", "Nachmittag", "Abend"];
const WETTER = ["Sonnig", "Wolkig", "Regnerisch"];
const TEMPS = ["unter 0°C", "0–15°C", "15–25°C", "über 25°C"];

const dur = (n) => Math.max(0, (toDec(n.realEnde || "0:00") || 0) - (toDec(n.realStart || "0:00") || 0));
const tageszeit = (n) => {
  const h = toDec(n.realStart || "12:00");
  return h < 12 ? "Vormittag" : h < 17 ? "Nachmittag" : "Abend";
};
const dec = (v, d = 1) => (isFinite(v) && v > 0 ? v.toFixed(d).replace(".", ",") : "–");
const pct = (a, b) => (b ? Math.round((a / b) * 100) + " %" : "–");
const sumOf = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);

/* Zeitraum: N Wochen zurück, inklusive der laufenden */
function rangeKeys(weeks) {
  const to = mondayOf(new Date());
  to.setDate(to.getDate() + 6);
  const from = mondayOf(new Date());
  from.setDate(from.getDate() - (weeks - 1) * 7);
  return { from: dk(from), to: dk(to), fromD: from, toD: to };
}
function pick(weeks, filter, bereich) {
  const { from, to } = rangeKeys(weeks);
  const out = [];
  Object.keys(entries).forEach((k) => {
    const [day, h] = k.split("|");
    if (day < from || day > to) return;
    const e = entries[k];
    if (filter(e)) out.push({ day, h: +h, e, n: e.nb || {}, wd: (fromDk(day).getDay() + 6) % 7 });
  });
  if (bereich) return out.filter((x) => nachReset(bereich, x.day));
  return out;
}

/* Kennzahlen, die auch andere Seiten nutzen können */
const resetAb = (bereich) => (settings.reset && settings.reset[bereich]) || "";
const nachReset = (bereich, tag) => {
  const r = resetAb(bereich);
  return !r || tag >= r;
};
function resetKnopf(bereich, titel) {
  const r = resetAb(bereich);
  return `<button class="resetbtn" data-reset="${bereich}" title="${r ? "Zählt seit " + fmt(fromDk(r)) + " – klicken zum Aufheben" : "Zählung ab heute neu starten"}">${RESET_PFEIL}</button>
    ${r ? `<span class="resetinfo">seit ${fmtShort(fromDk(r))}</span>` : ""}`;
}
function quoten(weeks = rangeWeeks) {
  const fgb = pick(
    weeks,
    (e) => e.kind === "terminieren" && e.quelle === "Festgebietsbegehung" && e.nb && e.nb.realStart,
    "fgb",
  );
  const pro = pick(
    weeks,
    (e) => e.kind === "terminieren" && e.quelle === "Promotion" && e.nb && e.nb.realStart,
    "promo",
  );
  const kt = pick(weeks, (e) => e.kind === "kunde", "termine");
  const gem = kt.filter((x) => x.e.status === "stattgefunden");
  /* Premium CheckIns mit Nachkauf zählen bei der Gebietsaufteilung mit */
  const pci = pick(weeks, (e) => e.kind === "premium" && e.nb && e.nb.verkauft === "Ja", "termine");
  const { from, to } = rangeKeys(weeks);
  const bewegt = verlauf.filter((v) => v.datum >= from && v.datum <= to);
  const std = (a) => sumOf(a, (x) => dur(x.n));
  return {
    zeitraum: { weeks, from, to },
    fgb: {
      n: fgb.length,
      std: std(fgb),
      tueren: sumOf(fgb, (x) => x.n.tueren),
      erreicht: sumOf(fgb, (x) => x.n.erreicht),
      termine: sumOf(fgb, (x) => x.n.termine),
      rueck: sumOf(fgb, (x) => x.n.rueck),
      d2d: fgb.filter((x) => x.e.modus === "Door to Door").length,
      best: fgb.filter((x) => x.e.modus === "Bestandskunde").length,
      list: fgb,
    },
    promo: {
      n: pro.length,
      std: std(pro),
      ansprachen: sumOf(pro, (x) => x.n.ansprachen),
      gespraeche: sumOf(pro, (x) => x.n.gespraeche),
      termine: sumOf(pro, (x) => x.n.termine),
      kontakte: sumOf(pro, (x) => x.n.kontakte),
      einheiten: sumOf(pro, (x) => x.n.einheiten),
      umsatzFG: sumOf(pro, (x) => num(x.n.umsatzFG)),
      umsatzWG: sumOf(pro, (x) => num(x.n.umsatzWG)),
      verkaeufe: pro.filter((x) => x.n.verkauft === "Ja").length,
      list: pro,
    },
    termine: {
      gesamt: kt.length + bewegt.length,
      stattgefunden: gem.length,
      verschoben: bewegt.filter((v) => v.art === "verschoben").length,
      abgesagt: bewegt.filter((v) => v.art === "abgesagt").length,
      verkauft: gem.filter((x) => x.n.verkauft === "Ja").length,
      vorgefuehrt: gem.filter((x) => (x.n.vorgefuehrt || []).length > 0).length,
      einheiten: sumOf(gem, (x) => x.n.einheiten),
      umsatz: sumOf(gem, (x) => num(x.n.umsatz)),
      k70: sumOf(gem, (x) => num(x.n.k70betrag)),
      neu: gem.filter((x) => x.n.kundenstatus === "Neukunde").length,
      bestand: gem.filter((x) => x.n.kundenstatus === "Bestandskunde").length,
      fg:
        gem.filter((x) => x.n.gebiet === "Festgebiet").length +
        pci.filter((x) => x.n.gebiet === "Festgebiet").length,
      wg:
        gem.filter((x) => x.n.gebiet === "Weißgebiet").length +
        pci.filter((x) => x.n.gebiet === "Weißgebiet").length,
      pciVerkauft: pci.length,
      pciEinheiten: sumOf(pci, (x) => x.n.einheiten),
      pciUmsatz: sumOf(pci, (x) => num(x.n.umsatz)),
      list: gem,
    },
  };
}

const kpi = (l, v, s = "", cls = "") =>
  `<div class="kpi ${cls}"><span class="kl">${l}</span><span class="kv">${v}</span>${s ? `<span class="ks">${s}</span>` : ""}</div>`;

/* Beste Ausprägung je Dimension nach Terminen pro Stunde */
function bestOf(list, groupFn, order) {
  const g = new Map();
  list.forEach((x) => {
    const k = groupFn(x);
    if (!k) return;
    (g.get(k) || g.set(k, []).get(k)).push(x);
  });
  let best = null;
  (order || [...g.keys()]).forEach((k) => {
    const arr = g.get(k);
    if (!arr) return;
    const std = sumOf(arr, (x) => dur(x.n));
    const wert = std ? sumOf(arr, (x) => x.n.termine) / std : 0;
    if (!best || wert > best.wert) best = { k, wert, n: arr.length };
  });
  return best;
}
function fazit(list, was) {
  if (list.length < 2)
    return `<p class="fazit leer">Für eine Aussage zum besten Zeitpunkt braucht es mehr Einsätze — aktuell ${list.length === 1 ? "ist einer" : "sind keine"} erfasst.</p>`;
  const w = null; // Wetter wird nicht mehr erfasst
  const t = null;
  const d = bestOf(list, (x) => DAYS_L[x.wd], DAYS_L);
  const z = bestOf(list, (x) => tageszeit(x.n), TAGESZEIT);
  if (!w && !t && !d && !z) return `<p class="fazit leer">Noch keine auswertbaren Einsätze.</p>`;
  const teile = [];
  if (w) teile.push(`bei <b>${w.k.toLowerCase()}em Wetter</b>`);
  if (t) teile.push(`bei <b>${t.k}</b>`);
  if (d) teile.push(`am <b>${d.k}</b>`);
  if (z) teile.push(`am <b>${z.k}</b>`);
  const dünn = list.length < 10;
  return `<p class="fazit">Nach deiner aktuellen Statistik bist du in der ${was} am erfolgreichsten,
    wenn du ${teile.join(", ")} startest.
    ${dünn ? `<span class="warn">Basis sind erst ${list.length} Einsätze — die Aussage wird ab etwa 10 je Gruppe belastbar.</span>` : ""}</p>`;
}

function renderAusw() {
  document.getElementById("rangeSeg").innerHTML = RANGES.map(
    (r) => `<button type="button" data-rw="${r.w}" aria-pressed="${r.w === rangeWeeks}">${r.t}</button>`,
  ).join("");

  const q = quoten();
  const f = q.fgb,
    p = q.promo,
    t = q.termine;
  const serie = zielSerie();

  const s1 = `<div class="asec"><h3>Festgebietsbegehung${resetKnopf("fgb")}</h3>
    <p class="sub">${f.n} Einsätze · ${dec(f.std)} Stunden im gewählten Zeitraum</p>
    <div class="kpis">
      ${kpi("Türen pro Stunde", dec(f.std ? f.tueren / f.std : 0), `${f.tueren || 0} Türen gesamt`, "hero")}
      ${kpi("Termine pro Stunde", dec(f.std ? f.termine / f.std : 0), `${f.termine || 0} Termine gesamt`, "hero")}
      ${kpi("Erreicht je Tür", pct(f.erreicht, f.tueren), `${f.erreicht || 0} erreicht`)}
      ${kpi("Termin je Tür", pct(f.termine, f.tueren))}
      ${kpi("Termin je Erreichtem", pct(f.termine, f.erreicht))}
      ${kpi("Rückmeldungstermine", f.rueck || "–")}
      ${kpi("Door to Door", `${f.d2d}`, pct(f.d2d, f.n))}
      ${kpi("Bestandskunden", `${f.best}`, pct(f.best, f.n))}
      ${kpi("Ø Dauer je Einsatz", dec(f.n ? f.std / f.n : 0) + " h")}
    </div>
    ${fazit(f.list, "Festgebietsbegehung")}</div>`;

  const s2 = `<div class="asec"><h3>Promotion${resetKnopf("promo")}</h3>
    <p class="sub">${p.n} Einsätze · ${dec(p.std)} Stunden im gewählten Zeitraum</p>
    <div class="kpis">
      ${kpi("Ansprachen pro Stunde", dec(p.std ? p.ansprachen / p.std : 0), `${p.ansprachen || 0} gesamt`, "hero")}
      ${kpi("Termine pro Stunde", dec(p.std ? p.termine / p.std : 0), `${p.termine || 0} Termine gesamt`, "hero")}
      ${kpi("Gespräch je Ansprache", pct(p.gespraeche, p.ansprachen), `${p.gespraeche || 0} Gespräche`)}
      ${kpi("Termin je Gespräch", pct(p.termine, p.gespraeche))}
      ${kpi("Termin je Ansprache", pct(p.termine, p.ansprachen))}
      ${kpi("Kontakte", p.kontakte || "–", `${dec(p.std ? p.kontakte / p.std : 0)} pro Stunde`)}
      ${kpi("Ø Dauer je Einsatz", dec(p.n ? p.std / p.n : 0) + " h")}
      ${kpi("Einheiten vor Ort", p.einheiten || "–", `bei ${p.verkaeufe} von ${p.n} Einsätzen`)}
      ${kpi("Umsatz vor Ort", eur(p.umsatzFG + p.umsatzWG) + " €", `FG ${eur(p.umsatzFG)} € · WG ${eur(p.umsatzWG)} €`)}
    </div>
    ${fazit(p.list, "Promotion")}</div>`;

  const demoCount = (d) => t.list.filter((x) => (x.n.vorgefuehrt || []).includes(d)).length;
  const maxDemo = Math.max(1, ...DEMO.map(demoCount));
  const s3 = `<div class="asec"><h3>Kundentermine${resetKnopf("termine")}</h3>
    <p class="sub">${t.gesamt} Termine im gewählten Zeitraum, davon ${t.stattgefunden} nachbereitet</p>
    <div class="kpis">
      ${kpi("Stattgefunden", `${t.stattgefunden}`, pct(t.stattgefunden, t.gesamt), "hero")}
      ${kpi("Verschoben", `${t.verschoben}`, pct(t.verschoben, t.gesamt))}
      ${kpi("Abgesagt", `${t.abgesagt}`, pct(t.abgesagt, t.gesamt))}
      ${kpi("Vorführquote", pct(t.vorgefuehrt, t.stattgefunden), "Termine mit Vorführung")}
      ${kpi("Abschlussquote", pct(t.verkauft, t.stattgefunden), `${t.verkauft} Abschlüsse`, "hero")}
      ${kpi("Einheiten je Termin", dec(t.stattgefunden ? t.einheiten / t.stattgefunden : 0, 2), `${t.einheiten || 0} gesamt`)}
      ${kpi("Umsatz je Termin", eur(t.stattgefunden ? t.umsatz / t.stattgefunden : 0) + " €", `${eur(t.umsatz)} € gesamt`)}
      ${kpi("K70 je Termin", eur(t.stattgefunden ? t.k70 / t.stattgefunden : 0) + " €", `${eur(t.k70)} € gesamt`)}
      ${kpi("Neukunde / Bestand", `${t.neu} / ${t.bestand}`, `${pct(t.neu, t.stattgefunden)} neu`)}
      ${kpi(
        "Festgebiet / Weißgebiet",
        `${t.fg} / ${t.wg}`,
        `${pct(t.fg, t.fg + t.wg)} Festgebiet${
          t.pciVerkauft ? ` · inkl. ${t.pciVerkauft} Premium CheckIn${t.pciVerkauft > 1 ? "s" : ""}` : ""
        }`,
      )}
      ${
        t.pciVerkauft
          ? kpi(
              "Nachkauf im Premium CheckIn",
              `${t.pciVerkauft}`,
              `${t.pciEinheiten || 0} Einheiten · ${eur(t.pciUmsatz)} € brutto`,
            )
          : ""
      }
    </div>
    <div class="ah4">Wie oft wird was vorgeführt?</div>
    ${
      t.stattgefunden
        ? DEMO.map((d) => {
            const c = demoCount(d);
            return `<div class="aline"><span class="nm">${d}</span>
        <span class="bar"><i style="width:${(c / maxDemo) * 100}%"></i></span>
        <span class="vl">${c} · ${pct(c, t.stattgefunden)}</span></div>`;
          }).join("")
        : `<p class="aempty">Noch keine nachbereiteten Termine.</p>`
    }</div>`;

  /* Warum wurde nicht gekauft - und was wurde später doch daraus? */
  const kdn = kundenListe();
  const grZaehl = {};
  t.list.forEach((x) => {
    if (x.n.verkauft !== "Nein") return;
    const gruende = [...(x.n.nkgruende || [])];
    if (!gruende.length && (x.n.grund || "").trim()) gruende.push("Individueller Grund");
    if (!gruende.length) return;
    const kd = kdn.find((r) => r.id === kundeId(x.e));
    const spaeter = !!(kd && kd.letzterKauf && kd.letzterKauf > x.day);
    gruende.forEach((g) => {
      grZaehl[g] = grZaehl[g] || { n: 0, kauf: 0 };
      grZaehl[g].n++;
      if (spaeter) grZaehl[g].kauf++;
    });
  });
  const grListe = Object.keys(grZaehl).sort((a, b) => grZaehl[b].n - grZaehl[a].n);
  const grSumme = grListe.reduce((n, g) => n + grZaehl[g].n, 0);
  const grMax = Math.max(1, ...grListe.map((g) => grZaehl[g].n));
  const s4 = `<div class="asec"><h3>Warum nicht gekauft wurde</h3>
    <p class="sub">${grSumme} Nennungen aus ${t.list.filter((x) => x.n.verkauft === "Nein").length}
      Terminen ohne Kauf · ein Termin kann mehrere Gründe haben</p>
    ${
      grListe.length
        ? grListe
            .map((g) => {
              const z = grZaehl[g];
              return `<div class="aline"><span class="nm">${g}</span>
        <span class="bar"><i style="width:${(z.n / grMax) * 100}%;background:${grundFarbe(g)}"></i></span>
        <span class="vl">${z.n} · ${pct(z.n, grSumme)}${z.kauf ? ` · ${z.kauf} später gekauft` : ""}</span></div>`;
            })
            .join("")
        : `<p class="aempty">Noch keine Gründe erfasst.</p>`
    }
    ${
      grListe.length
        ? `<div class="ah4">Aus welchem Grund wird später doch gekauft?</div>
      ${
        grListe
          .filter((g) => grZaehl[g].kauf)
          .sort((a, b) => grZaehl[b].kauf / grZaehl[b].n - grZaehl[a].kauf / grZaehl[a].n)
          .map(
            (g) =>
              `<div class="aline"><span class="nm">${g}</span>
          <span class="bar"><i style="width:${(grZaehl[g].kauf / grZaehl[g].n) * 100}%;background:${grundFarbe(g)}"></i></span>
          <span class="vl">${pct(grZaehl[g].kauf, grZaehl[g].n)}</span></div>`,
          )
          .join("") || `<p class="aempty">Bisher hat noch keiner dieser Kunden später gekauft.</p>`
      }`
        : ""
    }
  </div>`;

  const s0 = serie.wochen
    ? `<div class="asec"><div class="kpis">
      ${kpi("Wochen in Folge im Ziel", serie.wochen, serie.wochen > 1 ? "weiter so" : "erste Woche", "hero")}
      ${kpi("Beste Serie", serie.beste, "seit Beginn")}
    </div></div>`
    : "";
  document.getElementById("ausw").innerHTML = s0 + s1 + s2 + s3 + s4 + meldungHTML(monday);
}
document.getElementById("ausw").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-reset]");
  if (!b) return;
  const bereich = b.dataset.reset;
  settings.reset = settings.reset || {};
  if (settings.reset[bereich]) delete settings.reset[bereich];
  else settings.reset[bereich] = dk(new Date());
  saveData();
  renderAusw();
});
document.getElementById("rangeSeg").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-rw]");
  if (!b) return;
  rangeWeeks = +b.dataset.rw;
  renderAusw();
});
