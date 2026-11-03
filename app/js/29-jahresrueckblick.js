/**
 * Jahresrückblick
 *
 * Vertriebsjahr nach Monaten mit Umsatz, Einheiten und Bestwerten.
 */
const nachtrag = {}; // {jahr: {startKW: {einheiten, umsatz, Aufträge}}}
let jahrAnsicht = null;
/* Die Vertriebsmonate eines Jahres als Auswahl – im 53-Wochen-Jahr hat der letzte sechs Wochen */
function ntMonatsListe(jahr) {
  return jahresUebersicht(jahr)
    .map(
      (j) => `<option value="${j.startW}">${j.name} · KW ${j.kw} · ${j.spanne} · ${j.wochen} Wochen</option>`,
    )
    .join("");
}
function renderJahr() {
  const box = document.getElementById("jahr");
  if (!box || !me) return;
  const heuteJahr = isoWeek(new Date()).year;
  if (!jahrAnsicht) jahrAnsicht = heuteJahr;
  const jahre = [];
  for (let j = 2020; j <= heuteJahr; j++) jahre.push(j);
  const z = jahresUebersicht(jahrAnsicht);
  const sum = (f) => z.reduce((n, x) => n + (+x[f] || 0), 0);
  const maxWert = Math.max(1, ...z.map((x) => Math.max(x.nettoU, x.vorjahrNetto)));

  box.innerHTML = `
    <div class="asec">
      <h3>Jahresrückblick</h3>
      <p class="sub">Alle Vertriebsmonate, Beträge netto. Vergleich mit ${jahrAnsicht - 1}.</p>
      <div class="field jahrwahl"><label for="jahrSel">Jahr</label>
        <select id="jahrSel">${jahre
          .slice()
          .reverse()
          .map((j) => `<option value="${j}" ${j === jahrAnsicht ? "selected" : ""}>${j}</option>`)
          .join("")}</select></div>
      <div class="kpis">
        ${kpi("Nettoumsatz", eur(sum("nettoU")) + " €", `Vorjahr ${eur(sum("vorjahrNetto"))} €`, "hero")}
        ${kpi("Einheiten", sum("einheiten") || "–", `Vorjahr ${sum("vorjahrEh") || "–"}`)}
        ${kpi("Qualifizierte Anmeldungen", String(jt(jahrAnsicht).qualifiziert), "aus dem Menüpunkt Jobtickets")}
      </div>

      <div class="ah4">Nettoumsatz je Vertriebsmonat</div>
      <div class="balken">
        ${z
          .map(
            (j) => `<div class="bgruppe" title="${j.name}">
          <div class="bpaar">
            <i class="bjetzt" style="height:${Math.round((j.nettoU / maxWert) * 100)}%"></i>
            <i class="bvor" style="height:${Math.round((j.vorjahrNetto / maxWert) * 100)}%"></i>
          </div>
          <span>${j.kurz}</span>
        </div>`,
          )
          .join("")}
      </div>
      <div class="blegende"><span><i class="bjetzt"></i>${jahrAnsicht}</span><span><i class="bvor"></i>${jahrAnsicht - 1}</span></div>

      <div class="ah4">Vertriebsmonate</div>
      <div class="ascroll"><table class="atable">
        <thead><tr><th>Monat</th><th>Zeitraum</th><th>Netto</th><th>Einheiten</th><th>Aufträge</th><th>Vorjahr netto</th><th>Vorjahr Einh.</th></tr></thead>
        <tbody>${z
          .map(
            (j) => `<tr class="${j.aktuell ? "best" : ""}">
          <td>${j.name}</td><td>KW ${j.kw}<br><small class="tspanne">${j.spanne}</small></td>
          <td>${eur(j.nettoU)}</td><td>${j.einheiten || "–"}</td><td>${j.auftraege || "–"}</td>
          <td>${eur(j.vorjahrNetto)}</td><td>${j.vorjahrEh || "–"}</td></tr>`,
          )
          .join("")}</tbody></table></div>
    </div>

    <div class="asec">
      <h3>Zahlen nachtragen</h3>
      <p class="sub">Für Zeiten, in denen noch nicht mit der App gearbeitet wurde —
        oder um einen Monat zu korrigieren, in dem ein Termin fehlt.</p>
      <div class="grp" style="max-width:460px;margin:0 auto">
        <div class="row2">
          <div class="field"><label for="ntJahr">Jahr</label>
            <select id="ntJahr">${jahre
              .slice()
              .reverse()
              .map((j) => `<option value="${j}" ${j === jahrAnsicht ? "selected" : ""}>${j}</option>`)
              .join("")}</select></div>
          <div class="field"><label for="ntMonat">Vertriebsmonat</label>
            <select id="ntMonat">${ntMonatsListe(jahrAnsicht)}</select></div>
        </div>
        ${fld("ntEinheiten", "Einheiten", "", "number", 'min="0" inputmode="numeric"')}
        ${fld("ntUmsatz", "Nettoumsatz €", "", "text", 'inputmode="decimal"')}
        ${fld("ntAuftraege", "Anzahl Aufträge", "", "number", 'min="0" inputmode="numeric"')}
        ${fld("ntFgAbger", "Abgerechneter FG-Umsatz €", "", "text", 'inputmode="decimal"')}
        <p class="hinweis" style="margin-top:0">Der abgerechnete Festgebietsumsatz zählt
          <b>ausschließlich</b> für Quartals- und Jahresausgleich im Provisionsrechner —
          also auch Online-Käufe und alles, was nicht selbst geschrieben wurde.
          In die persönlichen Ziele fließt er nicht ein.</p>
        <div class="sect"><span class="lb">Wie sollen die Zahlen zählen?</span>
          <div class="seg">
            <button type="button" data-ntm="ersetzen" aria-pressed="true">Überschreiben</button>
            <button type="button" data-ntm="ergaenzen" aria-pressed="false">Ergänzen</button>
          </div></div>
        <p class="hinweis" style="margin-top:0">Überschreiben ersetzt die erfassten Zahlen dieses Monats,
          Ergänzen zählt sie dazu. Leere Felder bleiben in jedem Fall unberührt.</p>
        <div class="actions"><button class="btn primary wide" id="ntSpeichern">Nachtragen</button></div>
        <p class="err" id="ntErr" hidden></p>
      </div>
      ${nachtragListe(heuteJahr)}
      <div class="ah4">Zeit vor 2020</div>
      <div class="grp" style="max-width:460px;margin:0 auto">
        <p class="hinweis" style="margin-top:0">Einstellung vor 2020? Dann hier noch den Gesamtumsatz des Zeitraums davor
          eintragen — er zählt für die Goldene Nadel mit. Ab 2020 nutzt du das Formular darüber.</p>
        ${fld("ntVor2020", "Nettoumsatz vor 2020 (€)", settings.umsatzVor2020 ? eur(+settings.umsatzVor2020) : "", "text", 'inputmode="decimal"')}
      </div>
    </div>`;

  const js = document.getElementById("jahrSel");
  if (js)
    js.onchange = () => {
      jahrAnsicht = +js.value;
      renderJahr();
    };
  const nj = document.getElementById("ntJahr");
  if (nj)
    nj.onchange = () => {
      const ms = document.getElementById("ntMonat");
      if (ms) ms.innerHTML = ntMonatsListe(+nj.value);
    };
  const v20 = document.getElementById("ntVor2020");
  if (v20)
    v20.onchange = () => {
      const w = num(v20.value);
      if (w > 0) settings.umsatzVor2020 = w;
      else delete settings.umsatzVor2020;
      saveData();
      renderZiele();
      renderJahr();
    };
  box.querySelectorAll("[data-ntm]").forEach(
    (b) =>
      (b.onclick = () => {
        box.querySelectorAll("[data-ntm]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      }),
  );
  document.getElementById("ntSpeichern").onclick = () => {
    const w = (id) => document.getElementById(id).value.trim();
    const jahr = +w("ntJahr"),
      startW = +w("ntMonat");
    const err = document.getElementById("ntErr");
    if (!w("ntEinheiten") && !w("ntUmsatz") && !w("ntAuftraege") && !w("ntFgAbger")) {
      err.textContent = "Bitte mindestens einen Wert eintragen.";
      err.hidden = false;
      return;
    }
    const gewaehlt = box.querySelector('[data-ntm][aria-pressed="true"]');
    const modus = gewaehlt ? gewaehlt.dataset.ntm : "ersetzen";
    nachtrag[jahr] = nachtrag[jahr] || {};
    const alt = nachtrag[jahr][startW] || {};
    const wertVon = (feld, roh, zahl) => {
      if (roh === "") return modus === "ersetzen" ? alt[feld] : alt[feld];
      if (modus === "ersetzen") return zahl;
      return (+alt[feld] || 0) + zahl;
    };
    nachtrag[jahr][startW] = {
      modus,
      einheiten: wertVon("einheiten", w("ntEinheiten"), +w("ntEinheiten") || 0),
      umsatz: wertVon("umsatz", w("ntUmsatz"), num(w("ntUmsatz"))),
      auftraege: wertVon("auftraege", w("ntAuftraege"), +w("ntAuftraege") || 0),
      /*
       * Nur für den Ausgleich im Provisionsrechner - siehe ausgleichNachtrag().
       *    Die Ziele lesen ausschließlich umsatz/einheiten/Aufträge.
       */
      fgAbger: wertVon("fgAbger", w("ntFgAbger"), num(w("ntFgAbger"))),
    };
    err.hidden = true;
    saveData();
    renderJahr();
    renderZiele();
  };
  box.querySelectorAll("[data-ntweg]").forEach(
    (b) =>
      (b.onclick = () => {
        const [jahr, kw] = b.dataset.ntweg.split("|");
        if (nachtrag[jahr]) delete nachtrag[jahr][kw];
        saveData();
        renderJahr();
        renderZiele();
      }),
  );
}
function nachtragListe(heuteJahr) {
  const zeilen = [];
  Object.keys(nachtrag)
    .sort()
    .forEach((jahr) =>
      Object.keys(nachtrag[jahr])
        .sort((a, b) => a - b)
        .forEach((kw) => {
          const n = nachtrag[jahr][kw];
          if (!n) return;
          zeilen.push(`<div class="ntzeile">
        <span>${jahr} · ab KW ${kw}<br><small class="tspanne">${
          n.modus === "ersetzen" ? "überschreibt" : "ergänzt"
        }</small></span>
        <span class="ntwerte">${n.einheiten || 0} Einh. · ${eur(n.umsatz)} € · ${n.auftraege || 0} Aufträge${
          n.fgAbger ? ` · FG abgerechnet ${eur(n.fgAbger)} €` : ""
        }</span>
        <button class="mini" data-ntweg="${jahr}|${kw}">löschen</button></div>`);
        }),
    );
  if (!zeilen.length) return "";
  return `<div class="ah4">Bereits nachgetragen</div><div class="ntliste">${zeilen.join("")}</div>`;
}
