/**
 * Team: Satz je Woche, Erwartung und Teamliste
 *
 * Bei jeder Wochenmeldung eines Teammitglieds wählst du deinen Anteil als
 * Teamleiterin (10, 6 oder 4 %). Vorbelegt ist die letzte Angabe – wechselt
 * der Satz mitten im Vertriebsmonat, rechnet die Teamprovision die Wochen
 * getrennt. Erwarteter Umsatz und erwartete Einheiten der Folgewoche
 * ergeben sich aus den bisherigen Meldungen (je Kundentermin) mal den
 * geplanten Kundenterminen.
 * Gespeichert wird je Woche: teamMeldungen()[id][wochenKey].satz (Prozent).
 */
const TL_SAETZE = [10, 6, 4];

/* Letzte Angabe vor (oder in) dieser Woche */
function letzterSatz(id, wochenKey) {
  const alle = teamMeldungen()[id] || {};
  const frueher = Object.keys(alle)
    .filter((k) => k <= wochenKey && alle[k] && alle[k].satz !== undefined && alle[k].satz !== "")
    .sort();
  return frueher.length ? +alle[frueher[frueher.length - 1]].satz : null;
}
function satzFuer(id, wochenKey) {
  const w = (teamMeldungen()[id] || {})[wochenKey];
  if (w && w.satz !== undefined && w.satz !== "") return +w.satz;
  const l = letzterSatz(id, wochenKey);
  return l === null ? 10 : l;
}

/* Quote aus den bisherigen Meldungen: Umsatz und Einheiten je Kundentermin */
function teamQuote(id, vorWoche) {
  const alle = teamMeldungen()[id] || {};
  let termine = 0,
    umsatz = 0,
    einheiten = 0,
    wochen = 0;
  Object.keys(alle)
    .filter((k) => k < vorWoche)
    .sort()
    .slice(-12)
    .forEach((k) => {
      const w = alle[k] || {};
      if (!(+w.termine > 0)) return;
      termine += +w.termine;
      umsatz += +w.umsatzNetto || 0;
      einheiten += +w.einheiten || 0;
      wochen++;
    });
  return termine ? { umsatz: umsatz / termine, einheiten: einheiten / termine, wochen } : null;
}

meldungManuellDialog = function (id, wochenKey) {
  const m = teamManuell().find((x) => x.id === id);
  if (!m) return;
  const alt = (teamMeldungen()[id] || {})[wochenKey] || {};
  const { week } = isoWeek(fromDk(wochenKey));
  const satz = satzFuer(id, wochenKey);
  const vorher = letzterSatz(id, dk(new Date(fromDk(wochenKey).getTime() - 864e5)));
  const q = teamQuote(id, wochenKey);
  simpleDialog(
    `${entschaerfeText(m.name)} · KW ${week}`,
    "Wochenmeldung von Hand",
    `<div class="grp">
       <div class="field"><label for="mmSatz">Dein Anteil als Teamleiterin</label>
         <select id="mmSatz">${TL_SAETZE.map(
           (s) => `<option value="${s}"${s === satz ? " selected" : ""}>${s} %</option>`,
         ).join("")}</select></div>
       <p class="hinweis" style="margin:0">${
         vorher !== null
           ? `Letzte Woche: ${vorher} %. Ändert sich der Satz, rechnet die Teamprovision ab dieser Woche neu.`
           : "Gilt ab dieser Woche und wird für die nächsten Meldungen vorgeschlagen."
       }</p>
     </div>
     <div class="h4">Zahlen der Woche</div>
     <div class="grp mmgitter">${MANUELL_FELDER.map(([k, l]) =>
       fld("mm_" + k, l, alt[k] ?? "", "text", 'inputmode="decimal"'),
     ).join("")}</div>
     <p class="hinweis" id="mmQuote">${
       q
         ? `Erwartung aus ${q.wochen} ${q.wochen === 1 ? "Meldung" : "Meldungen"}: ${eur(q.umsatz)} € netto und ${dec(q.einheiten, 2)} Einheiten je Kundentermin – mal den Kundenterminen der Folgewoche.`
         : "Sobald es frühere Meldungen gibt, rechnet die App erwarteten Umsatz und Einheiten selbst aus."
     }</p>`,
    () => {
      const w = {};
      MANUELL_FELDER.forEach(([k]) => {
        const v = document.getElementById("mm_" + k).value;
        if (v !== "") w[k] = num(v);
      });
      w.satz = +document.getElementById("mmSatz").value;
      const alle = teamMeldungen();
      alle[id] = alle[id] || {};
      alle[id][wochenKey] = w;
      saveData();
      closeModal();
      renderTeamManuell();
      try {
        renderProv();
      } catch (e) {}
    },
    "Woche speichern",
  );
  /* Erwartung automatisch aus der Quote, solange nicht selbst überschrieben */
  const nT = document.getElementById("mm_nTermine"),
    eU = document.getElementById("mm_erwUmsatz"),
    eE = document.getElementById("mm_erwEinheiten");
  if (q && nT && eU && eE) {
    [eU, eE].forEach((f) => f.addEventListener("input", () => (f.dataset.selbst = "1")));
    const rechnen = () => {
      const t = num(nT.value);
      if (!eU.dataset.selbst) eU.value = t ? String(Math.round(t * q.umsatz)) : "";
      if (!eE.dataset.selbst) eE.value = t ? String(Math.round(t * q.einheiten * 10) / 10).replace(".", ",") : "";
    };
    nT.addEventListener("input", rechnen);
    if (!alt.erwUmsatz && !alt.erwEinheiten) rechnen();
  }
};

/* Teamliste: Name und Satz oben, Knöpfe immer an derselben Stelle darunter */
renderTeamManuell = function () {
  const seite = document.getElementById("page-team");
  if (!seite || !istTeamleiter()) return;
  teamLeisteEinbauen();
  let box = document.getElementById("tmManuell");
  if (!box) {
    box = document.createElement("div");
    box.id = "tmManuell";
    box.className = "asec";
    seite.appendChild(box);
  }
  const liste = teamManuell();
  const woche = dk(tmMontag || monday);
  const { week } = isoWeek(fromDk(woche));
  box.innerHTML = `<h3>Dein Team</h3>
    ${
      liste.length
        ? `<div class="tmliste">${liste
            .map((m) => {
              const hat = (teamMeldungen()[m.id] || {})[woche];
              return `<div class="tmkarte">
          <div class="tmkopf"><b>${entschaerfeText(m.name)}</b>
            <small>${satzFuer(m.id, woche)} % · ${hat ? `Meldung KW ${week} eingetragen` : `Meldung KW ${week} fehlt`}</small></div>
          <div class="tmknoepfe">
            <button class="mini${hat ? "" : " primaer"}" data-mmel="${m.id}">${hat ? "Meldung ändern" : "Meldung eintragen"}</button>
            <button class="mini" data-mbear="${m.id}">Bearbeiten</button></div></div>`;
            })
            .join("")}</div>`
        : `<p class="hinweis">Noch niemand eingetragen. Über „Teammitglied hinzufügen“ legst du jemanden an.</p>`
    }`;
  box
    .querySelectorAll("[data-mmel]")
    .forEach((b) => (b.onclick = () => meldungManuellDialog(b.dataset.mmel, woche)));
  box.querySelectorAll("[data-mbear]").forEach((b) => (b.onclick = () => manuellDialog(b.dataset.mbear)));
};

/* Teamprovision je Mitglied und Satz – Wochen mit anderem Satz stehen getrennt */
function teamProvisionDaten(vm) {
  const zeilen = [];
  teamManuell().forEach((m) => {
    const gruppen = {};
    Object.entries(teamMeldungen()[m.id] || {}).forEach(([wk, w]) => {
      if (wk < vm.fromK || wk > vm.toK) return;
      const s = satzFuer(m.id, wk);
      const g = (gruppen[s] = gruppen[s] || { satz: s, nettoUm: 0, wochen: [] });
      g.nettoUm += +w.umsatzNetto || 0;
      g.wochen.push(isoWeek(fromDk(wk)).week);
    });
    const liste = Object.values(gruppen).sort((a, b) => Math.min(...a.wochen) - Math.min(...b.wochen));
    if (!liste.length)
      zeilen.push({ id: m.id, name: m.name, satz: satzFuer(m.id, dk(monday)), nettoUm: 0, anteil: 0, wochen: [] });
    liste.forEach((g) =>
      zeilen.push({
        id: m.id,
        name: m.name,
        satz: g.satz,
        nettoUm: g.nettoUm,
        anteil: (g.nettoUm * g.satz) / 100,
        wochen: g.wochen.sort((a, b) => a - b),
        geteilt: liste.length > 1,
      }),
    );
  });
  return zeilen;
}
