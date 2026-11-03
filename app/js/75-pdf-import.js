/**
 * Abrechnung als PDF übernehmen (Beta 1.8)
 *
 * Jahresrückblick und Teamumsatz bekommen einen Knopf „Aus Abrechnung (PDF)“.
 * Die PDF wird auf dem Gerät gelesen (pdf.js, liegt in der App), der passende
 * Vertriebsmonat aus dem Abrechnungszeitraum vorgewählt und alles vor dem
 * Übernehmen zur Kontrolle gezeigt. Die Datei wird nicht gespeichert.
 */
(function () {
  "use strict";
  let leserLaedt = null;
  function leserLaden() {
    if (window.pdfjsLib) return Promise.resolve();
    if (leserLaedt) return leserLaedt;
    leserLaedt = new Promise((ok, fehl) => {
      const s = document.createElement("script");
      s.src = "vendor/pdf.min.js";
      s.onload = () => ok();
      s.onerror = () => {
        leserLaedt = null;
        fehl(new Error("Der PDF-Leser konnte nicht geladen werden."));
      };
      document.head.appendChild(s);
    });
    return leserLaedt;
  }

  const DATUM = (k) => fmt(fromDk(k));

  function dateiWaehlen(ziel) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/pdf,.pdf";
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      inp.value = "";
      if (!f) return;
      simpleDialog("Abrechnung wird gelesen …", f.name, `<div class="pdflaedt"><span></span></div>`, () => closeModal(), "Abbrechen");
      try {
        await leserLaden();
        const r = await abrechnungsLeser.pdfAuslesen(f, me.dk);
        pruefDialog(r, ziel);
      } catch (e) {
        simpleDialog("PDF nicht lesbar", "", `<p class="err">${entschaerfeText(e.message || String(e))}</p>`, () => closeModal(), "OK");
      }
    };
    inp.click();
  }

  function monatsOptionen(jahr, startW) {
    return jahresUebersicht(jahr)
      .map((j) => `<option value="${jahr}|${j.startW}"${j.startW === startW ? " selected" : ""}>${j.name} · KW ${j.kw} · ${j.spanne}</option>`)
      .join("");
  }

  function pruefDialog(r, ziel) {
    if (!r.gefunden) {
      simpleDialog(
        "Falsche Abrechnung?",
        "",
        `<p class="err">Deine Partner-Nummer ${entschaerfeText(String(me.dk).replace(/^TL-/, ""))} steht nicht in dieser Abrechnung. Bitte deine eigene Abrechnung wählen.</p>`,
        () => closeModal(),
        "OK",
      );
      return;
    }
    const vm = vertriebsmonat(fromDk(r.von));
    const passt = vm.fromK === r.von && vm.toK === r.bis;
    const tl = r.mitTeam;
    const jahre = [vm.year - 1, vm.year, vm.year + 1].filter((j) => j >= 2020);
    simpleDialog(
      "Abrechnung übernehmen",
      `${r.monat} · ${DATUM(r.von)} – ${DATUM(r.bis)} · Seite ${r.seite}`,
      `<div class="grp">
         <div class="field"><label for="piMonat">Vertriebsmonat</label>
           <select id="piMonat">${jahre.map((j) => monatsOptionen(j, j === vm.year ? vm.startW : -1)).join("")}</select></div>
         ${passt ? "" : `<p class="hinweis bleibt">Der Abrechnungszeitraum passt nicht genau zu einem Vertriebsmonat – bitte prüfen.</p>`}
       </div>
       <div class="h4">Deine Zahlen</div>
       <div class="grp pigitter">
         ${fld("piEinheiten", "Einheiten", r.eigen.einheiten, "text", 'inputmode="numeric"')}
         ${fld("piUmsatz", "Nettoumsatz €", r.eigen.umsatz, "text", 'inputmode="numeric"')}
         ${fld("piAuftraege", "Anzahl Aufträge", r.eigen.auftraege, "text", 'inputmode="numeric"')}
         ${fld("piFg", "Abgerechneter FG-Umsatz €", r.eigen.fgAbger, "text", 'inputmode="numeric"')}
       </div>
       ${
         tl
           ? `<div class="h4">Teamumsatz</div>
       <div class="grp pigitter">
         ${fld("piTeam", "Teamumsatz netto €", r.team.netto, "text", 'inputmode="numeric"')}
         ${fld("piBE", "davon Berufseinsteiger €", r.team.einsteiger, "text", 'inputmode="numeric"')}
       </div>
       <p class="hinweis bleibt">Berufseinsteiger (bis 52 Wochen am ${DATUM(r.bis)}): ${
         r.team.einsteigerNamen.length ? r.team.einsteigerNamen.map(entschaerfeText).join(", ") : "keine"
       }</p>`
           : ""
       }
       <div class="grp">
         ${esWahl("piMeine", "Meine Zahlen übernehmen", ziel !== "team")}
         ${tl ? esWahl("piTeamAn", "Teamumsatz übernehmen", true) : ""}
       </div>
       <p class="hinweis bleibt">Beträge auf volle Euro abgerundet. Vorhandene Zahlen dieses Monats werden ersetzt.</p>`,
      () => {
        const [jahr, startW] = document.getElementById("piMonat").value.split("|").map(Number);
        const v = (id) => Math.floor(num(document.getElementById(id).value));
        if (document.getElementById("piMeine").checked) {
          nachtrag[jahr] = nachtrag[jahr] || {};
          nachtrag[jahr][startW] = {
            modus: "ersetzen",
            einheiten: v("piEinheiten"),
            umsatz: v("piUmsatz"),
            auftraege: v("piAuftraege"),
            fgAbger: v("piFg"),
            quelle: "pdf",
          };
        }
        const ta = document.getElementById("piTeamAn");
        if (ta && ta.checked) {
          teamumsatz[jahr] = teamumsatz[jahr] || {};
          teamumsatz[jahr][startW] = { team: v("piTeam"), einsteiger: v("piBE") };
        }
        saveData();
        closeModal();
        try {
          renderJahr();
          renderTeamumsatz();
          renderZiele();
          renderProv();
        } catch (e) {}
      },
      "Übernehmen",
    );
  }
  const esWahl = (id, t, an) =>
    `<label class="piwahl"><input type="checkbox" id="${id}"${an ? " checked" : ""}><span>${t}</span></label>`;
  window.abrechnungImport = dateiWaehlen;

  /* Knöpfe einhängen */
  function knopf(id, ziel) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn primary wide pdfimport";
    b.id = id;
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9 15l3 3 3-3"/></svg> Aus Abrechnung (PDF) übernehmen`;
    b.onclick = () => dateiWaehlen(ziel);
    return b;
  }
  if (typeof renderJahr === "function") {
    const ohne = renderJahr;
    renderJahr = function () {
      const r = ohne.apply(this, arguments);
      const ziel = document.getElementById("ntJahr");
      const grp = ziel && ziel.closest(".grp");
      if (grp && !document.getElementById("pdfJahr")) grp.parentNode.insertBefore(knopf("pdfJahr", "jahr"), grp);
      return r;
    };
  }
  if (typeof renderTeamumsatz === "function") {
    const ohne = renderTeamumsatz;
    renderTeamumsatz = function () {
      const r = ohne.apply(this, arguments);
      const liste = document.querySelector("#teamumsatz .tuliste") || document.querySelector(".tuliste");
      if (liste && !document.getElementById("pdfTeam")) liste.parentNode.insertBefore(knopf("pdfTeam", "team"), liste);
      return r;
    };
  }
})();
