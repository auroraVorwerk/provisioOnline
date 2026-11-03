/**
 * Provisionswunsch
 *
 * Rückrechnung vom Wunscheinkommen auf Umsatz, Verkäufe und Termine.
 */
const WF = [
  { id: "einkommen", t: "Gewünschtes Einkommen", e: "€ brutto je Vertriebsmonat" },
  { id: "proAuftrag", t: "Einkommen pro Auftrag", e: "€ — fest hinterlegt", fix: true },
  { id: "abschluesse", t: "Erfolgreiche Abschlüsse nötig", e: "Aufträge" },
  { id: "quote", t: "Abschlussquote", e: "% der Termine" },
  { id: "tMonat", t: "Termine pro Vertriebsmonat", e: "Termine" },
  { id: "tWoche", t: "Termine pro Woche", e: "Termine" },
  { id: "tage", t: "Arbeitstage pro Woche", e: "Tage" },
  { id: "tTag", t: "Termine pro Tag", e: "Termine" },
];
function wunschWerte() {
  const vm = vertriebsmonat(monday);
  const w = { ...wunsch, wochen: vm.weeks };
  w.abschluesse = w.proAuftrag > 0 ? w.einkommen / w.proAuftrag : 0;
  w.tMonat = w.quote > 0 ? w.abschluesse / (w.quote / 100) : 0;
  w.tWoche = w.tMonat / vm.weeks;
  w.tTag = w.tage > 0 ? w.tWoche / w.tage : 0;
  return w;
}
function setzeWunsch(id, val) {
  const vm = vertriebsmonat(monday);
  const q = wunsch.quote / 100,
    pa = wunsch.proAuftrag,
    tg = wunsch.tage || 5;
  if (["einkommen", "proAuftrag", "quote", "tage"].includes(id)) {
    wunsch[id] = val;
  } else {
    let abschluesse = 0;
    if (id === "abschluesse") abschluesse = val;
    if (id === "tMonat") abschluesse = val * q;
    if (id === "tWoche") abschluesse = val * vm.weeks * q;
    if (id === "tTag") abschluesse = val * tg * vm.weeks * q;
    wunsch.einkommen = abschluesse * pa;
  }
  renderAll();
}
var wunschEdit = "";
function renderWunsch() {
  const w = wunschWerte();
  const st = quoten(rangeWeeks).termine;
  const eigene = st.stattgefunden ? Math.round((st.verkauft / st.stattgefunden) * 100) : 0;
  const val = (id) => {
    const v = w[id];
    if (!v) return "";
    return id === "einkommen" || id === "proAuftrag"
      ? Math.round(v)
      : String(Math.round(v * 10) / 10).replace(".", ",");
  };
  const zeig = (id) => {
    const v = val(id);
    return v === "" ? "–" : v;
  };
  const eingabe = WF.filter((f) => ["einkommen", "quote", "tage"].includes(f.id));
  const ergibt = WF.filter((f) => !["einkommen", "quote", "tage"].includes(f.id));

  document.getElementById("wunschForm").innerHTML = `<div class="wgrid">${eingabe
    .map(
      (f) => `
      <div class="field wf"><label for="w_${f.id}">${f.t}</label>
        <input id="w_${f.id}" data-wf="${f.id}" inputmode="decimal" value="${val(f.id)}" placeholder="–">
        <span class="unit">${f.e}</span></div>`,
    )
    .join("")}</div>
     ${
       eigene
         ? `<p class="hinweis wquote">Deine tatsächliche Abschlussquote der letzten ${rangeWeeks} Wochen liegt bei ${eigene} %.
        <button class="mini" id="useQuote">Übernehmen</button></p>`
         : ""
     }
     <div class="ah4">Daraus ergibt sich</div>
     <div class="wergibt">${ergibt
       .map((f) =>
         wunschEdit === f.id && !f.fix
           ? `<div class="wkarte offen"><span class="wlab">${f.t}</span>
            <input id="w_${f.id}" data-wf="${f.id}" inputmode="decimal" value="${val(f.id)}" placeholder="–">
            <span class="wein">${f.e}</span></div>`
           : `<div class="wkarte${f.fix ? " fest" : ""}"${f.fix ? "" : ` data-wedit="${f.id}"`}>
            <span class="wlab">${f.t}</span><b class="wval">${zeig(f.id)}</b>
            <span class="wein">${f.e}</span></div>`,
       )
       .join("")}</div>
     <p class="hinweis mini-hint">Alle Werte rechnen sich aus den drei Angaben oben. Antippen, wenn du einen davon
       lieber selbst vorgeben willst — dann rechnet es rückwärts.</p>`;
  const offen = document.querySelector(".wkarte.offen input");
  if (offen) {
    offen.focus();
    offen.select();
  }

  const vm = vertriebsmonat(monday);
  const ziel = w.einkommen > 0 ? zielNetto(w.einkommen, vm.weeks) : 0;
  const ist = umsatz(vm.fromK, vm.toK);
  document.getElementById("wunschZiel").innerHTML = ziel
    ? `
    <div class="asec">
      <h3>Was das an Umsatz bedeutet</h3>
      <p class="sub erkl">Bei 75 % Festgebiet und 25 % Weißgebiet, gerechnet auf den laufenden Vertriebsmonat mit ${vm.weeks} Wochen</p>
      <div class="kpis">
        ${kpi("Nötiger Umsatz brutto", eur(ziel * MWST) + " €", eur(ziel) + " € netto", "hero")}
        ${kpi("davon Festgebiet (75 %)", eur(ziel * 0.75 * MWST) + " €", `bisher ${eur(ist.fg)} €`)}
        ${kpi("davon Weißgebiet (25 %)", eur(ziel * 0.25 * MWST) + " €", `bisher ${eur(ist.wg)} €`)}
        ${kpi("Termine pro Tag", String(Math.round(w.tTag * 10) / 10).replace(".", ","), `${w.tage || 5} Arbeitstage je Woche`)}
      </div>
      <p class="hinweis">Diese Ziele stecken den Soll-Wert auf der Planer-Seite ab. Er verteilt sich auf die verbleibenden
        Arbeitstage des Vertriebsmonats und aktualisiert sich mit jedem neuen Umsatz.</p>
    </div>`
    : `<div class="asec"><p class="aempty">Sobald Einkommen, Einkommen pro Auftrag und Abschlussquote stehen, erscheinen hier die Umsatzziele — und der Planer bekommt seine Soll-Werte.</p></div>`;
}
document.getElementById("wunschForm").addEventListener("change", (ev) => {
  const f = ev.target.closest("[data-wf]");
  if (f) {
    wunschEdit = "";
    setzeWunsch(f.dataset.wf, num(f.value));
  }
});
document.getElementById("wunschForm").addEventListener("click", (ev) => {
  const k = ev.target.closest("[data-wedit]");
  if (k) {
    wunschEdit = k.dataset.wedit;
    renderWunsch();
    return;
  }
  if (ev.target.id === "useQuote") {
    const st = quoten(rangeWeeks).termine;
    wunsch.quote = st.stattgefunden ? Math.round((st.verkauft / st.stattgefunden) * 100) : 0;
    renderAll();
  }
});
