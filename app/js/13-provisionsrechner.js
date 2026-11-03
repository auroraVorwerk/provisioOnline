/**
 * Provisionsrechner
 *
 * Provision des laufenden Vertriebsmonats mit Bonusstufen.
 */
function renderProv() {
  const vm = vertriebsmonat(new Date()); // immer der laufende Vertriebsmonat
  const u = umsatz(vm.fromK, vm.toK);
  const p = provision(u, vm.weeks);

  const d = fromDk(vm.fromK);
  d.setDate(d.getDate() - 1);
  const bisVormonat = dk(d);
  const leer = { fg: 0, wg: 0, k70: 0, k70ein: 0 };
  const qU = vm.fromK > vm.qFromK ? umsatz(vm.qFromK, bisVormonat) : leer;
  const jU = vm.fromK > vm.jFromK ? umsatz(vm.jFromK, bisVormonat) : leer;
  const qFG = netto(qU.fg) + netto(qU.k70ein);
  const jFG = netto(jU.fg) + netto(jU.k70ein);
  /*
   * Steht ein abgerechneter FG-Umsatz nachgetragen, gilt er - er enthält
   * auch Online-Käufe und alles, was nicht selbst geschrieben wurde.
   */
  const qAbg = ausgleichNachtrag(vm.year, vm.qFromK, bisVormonat);
  const jAbg = ausgleichNachtrag(vm.year, vm.jFromK, bisVormonat);
  const jahrWochen = weeksInISOYear(vm.year);
  const std = arbeitsStunden(vm.fromK, vm.toK);

  const setzeProv = () => {
    const f = document.getElementById("pvMinus");
    if (f)
      f.onchange = () => {
        settings.minusVormonat = num(f.value);
        saveData();
        renderProv();
      };
  };
  document.getElementById("prov").innerHTML = `
    <div class="asec">
      <h3>Provisionsrechner</h3>
      <p class="sub">Vertriebsmonat ${vm.idx} im ${vm.quartal}. Quartal · KW ${vm.startW}–${vm.endW} · ${vm.weeks} Wochen · ${fmt(vm.from)} – ${fmt(vm.to)}</p>
      <div class="kpis zwei">
        ${kpi("Festgebietsbonus", p.stufe, p.next ? `noch ${eur(p.next.fehlt)} € netto bis ${p.next.pct} %` : "höchste Stufe erreicht")}
        ${kpi("K70 Warenkredit", p.warenkredit ? "−" + eur(p.warenkredit) + " €" : "–")}
        ${kpi("Provision inkl. Bonus", eur(p.prov + p.vers) + " €", `${eur(p.prov)} € plus ${eur(p.vers)} € Bonus`, "hero")}
        ${kpi("Gesamte Überweisung", eur(p.gesamt) + " €", p.uebertrag ? "nichts zur Auszahlung" : "abzüglich Warenkredit", "hero")}
      </div>
      ${
        p.minus || p.uebertrag
          ? `<div class="kpis">
        ${p.minus ? kpi("Minus aus dem Vormonat", "−" + eur(p.minus) + " €") : ""}
        ${p.uebertrag ? kpi("Übertrag in den Folgemonat", "−" + eur(p.uebertrag) + " €", "im nächsten Monat eintragen") : ""}
      </div>`
          : ""
      }
    </div>

    ${provKlapp(
      "rechnung",
      "Woraus sich das rechnet",
      `
      <div class="ascroll"><table class="atable">
        <thead><tr><th>Quelle</th><th>Brutto</th><th>Netto</th><th>Satz</th><th>Provision</th></tr></thead>
        <tbody>
          <tr><td>Festgebietsumsatz</td><td>${eur(u.fg)}</td><td>${eur(p.fgN)}</td><td>${20 + Math.round(p.b * 100)} %</td><td>${eur(p.pFG)}</td></tr>
          <tr><td>Weißgebietsumsatz</td><td>${eur(u.wg)}</td><td>${eur(p.wgN)}</td><td>20 %</td><td>${eur(p.pWG)}</td></tr>
          <tr><td>K70 Einkauf</td><td>${eur(u.k70ein)}</td><td>${eur(p.einN)}</td><td>${26 + Math.round(p.b * 100)} %</td><td>${eur(p.pK70)}</td></tr>
          ${u.messe ? `<tr><td>Messe<small style="display:block;color:var(--faint)">ohne Bonusstufe</small></td><td>${eur(u.messe)}</td><td>${eur(p.messeN)}</td><td>20 %</td><td>${eur(p.pMesse)}</td></tr>` : ""}
          <tr class="best"><td>Summe</td><td>${eur(u.fg + u.wg + u.k70ein)}</td><td>${eur(p.fgN + p.wgN + p.einN)}</td><td></td><td>${eur(p.prov)}</td></tr>
        </tbody></table></div>`,
    )}

    ${provKlapp(
      "stufen",
      "Bonusstufen in diesem Vertriebsmonat",
      `
      <div class="ascroll"><table class="atable">
        <thead><tr><th>Stufe</th><th>Festgebiet netto nötig</th><th>Status</th></tr></thead>
        <tbody>${TIERS.map((t) => {
          const ziel = (t.u * vm.weeks) / 4,
            erreicht = p.basis >= ziel;
          return `<tr class="${erreicht && Math.round(p.b * 100) === Math.round(t.b * 100) ? "best" : ""}">
            <td>${Math.round(t.b * 100)} %</td><td>${eur(ziel)} €</td>
            <td>${erreicht ? "erreicht" : "fehlen " + eur(ziel - p.basis) + " €"}</td></tr>`;
        }).join("")}</tbody></table></div>
      <p class="hinweis">Bewertet wird der Nettoumsatz im Festgebiet einschließlich K70-Einkauf: aktuell ${eur(p.basis)} €.</p>`,
    )}

    ${provKlapp(
      "zeit",
      "Arbeitszeit und Stundenlohn",
      `
      <div class="kpis">
        ${kpi("Arbeitsstunden", dec(std, 1) + " h", "ohne Meetings")}
        ${kpi("Stundenlohn", std ? eur((p.prov + p.vers) / std) + " €" : "–", "Provision inkl. Bonus je Stunde")}
        ${kpi("Nach Warenkredit", std ? eur(p.saldo / std) + " €" : "–", "was übrig bleibt je Stunde")}
      </div>`,
    )}

    ${provKlapp(
      "k70",
      "K70 und Vormonat",
      `
      <div class="kpis">
        ${kpi("K70 Warenbestand", eur(bestandWert()) + " €", "laut Inventur")}
        ${kpi("K70 Abverkauf", eur(u.k70) + " €", "im Vertriebsmonat verdient")}
      </div>
      <div class="grp" style="margin-top:14px">
        ${fld("pvMinus", "Offener Betrag aus dem Vormonat (€)", settings.minusVormonat || "", "text", 'inputmode="decimal"')}
        <p class="hinweis">Bleibt nach Abzug des Warenkredits nichts übrig, wandert der Rest in den nächsten
          Monat. Trag ihn hier ein, dann rechnet der Monat damit weiter.</p>
      </div>`,
    )}

    ${provKlapp(
      "ausgleich",
      "Quartals- und Jahresausgleich",
      `
      <div class="foot2">
        <div><b>${eur(qAbg || qFG)} €</b> Festgebietsumsatz für den Quartalsausgleich${
          qAbg
            ? " — abgerechnet, wie nachgetragen"
            : " netto aus den bisherigen Vertriebsmonaten dieses Quartals"
        }.
          Ziele auf 13 Wochen: ${TIERS.map((t) => `${Math.round(t.b * 100)} % ab ${eur((t.u * 13) / 4)} €`).join(" · ")}
          ${qAbg ? `<br><small class="tspanne">Selbst geschrieben wären es ${eur(qFG)} €.</small>` : ""}</div>
        <div><b>${eur(jAbg || jFG)} €</b> für den Jahresausgleich${
          jAbg ? " — abgerechnet, wie nachgetragen" : " aus den Vormonaten dieses Jahres"
        }.
          Ziele auf ${jahrWochen} Wochen: ${TIERS.map((t) => `${Math.round(t.b * 100)} % ab ${eur((t.u * jahrWochen) / 4)} €`).join(" · ")}
          ${jAbg ? `<br><small class="tspanne">Selbst geschrieben wären es ${eur(jFG)} €.</small>` : ""}</div>
        ${
          qAbg || jAbg
            ? ""
            : `<div class="hinweis">Den abgerechneten Festgebietsumsatz trägst du im
          Jahresrückblick unter „Vertriebsmonat nachtragen“ ein — er zählt nur hier.</div>`
        }
      </div>`,
    )}`;
  setzeProv();
  document.querySelectorAll("#prov [data-klapp]").forEach(
    (b) =>
      (b.onclick = () => {
        settings.klapp = settings.klapp || {};
        const id = b.dataset.klapp;
        if (settings.klapp[id]) delete settings.klapp[id];
        else settings.klapp[id] = 1;
        saveData();
        renderProv();
      }),
  );
}
/* Ein aufklappbarer Abschnitt – der Zustand wird mitgespeichert */
function provKlapp(id, titel, inhalt) {
  const zu = (settings.klapp || {})[id];
  return `<div class="asec klappsec${zu ? " zu" : ""}">
    <button type="button" class="klappkopf" data-klapp="${id}">
      <span>${titel}</span><span class="kp">${zu ? "+" : "–"}</span></button>
    ${zu ? "" : `<div class="klappinhalt">${inhalt}</div>`}
  </div>`;
}
