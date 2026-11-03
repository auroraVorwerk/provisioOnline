/**
 * Provision – ruhige Ansicht
 *
 * Oben die Überweisung als große Zahl mit Fortschritt zur nächsten
 * Prämienstufe, darunter, woraus sie sich zusammensetzt: Weißgebiet,
 * Festgebiet, K70 Einkauf, Sonstiges, Teamprovision, Versicherungszuschuss.
 * Darunter die Teamprovision im Detail (je Mitglied und Satz), geteilte
 * Verkäufe und „Was wäre, wenn“. Die Detailbereiche (Prämienstufen,
 * Arbeitszeit, K70, Ausgleich) kommen aus dem Rechner selbst.
 */
let pvWenn = 0;
const pvGanz = (v) => Math.round(v || 0).toLocaleString("de-DE");
const pvEuro = (v) => pvGanz(v) + " €";

/* Durchschnittlicher Verkauf der letzten 26 Wochen – für „Was wäre, wenn“ */
function pvSchnitt() {
  const grenze = dk(new Date(Date.now() - 182 * 864e5));
  let n = 0,
    summe = 0,
    fg = 0;
  Object.keys(entries).forEach((k) => {
    if (k.split("|")[0] < grenze) return;
    const e = entries[k],
      nb = e.nb;
    if (!nb || nb.verkauft !== "Ja" || nb.fremd === "Ja") return;
    const u = num(nb.umsatz);
    if (u <= 0) return;
    n++;
    summe += u;
    if (nb.gebiet !== "Weißgebiet") fg++;
  });
  return n >= 2 ? { brutto: summe / n, fgAnteil: fg / n, n } : { brutto: 1400, fgAnteil: 0.75, n };
}

function pvZeile(titel, unter, wert, cls = "") {
  const zeilen = (Array.isArray(unter) ? unter : [unter]).filter(Boolean);
  return `<li class="pvz ${cls}"><span class="pvzt">${titel}${zeilen.map((z) => `<small>${z}</small>`).join("")}</span><b>${wert}</b></li>`;
}

renderProv = function () {
  renderProvAlt();
  const box = document.getElementById("prov");
  if (!box) return;

  /* Kopf und Rechnungs-Tabelle des Rechners ersetzen wir durch die ruhige Fassung */
  const erste = box.querySelector(":scope > .asec:not(.klappsec)");
  if (erste) erste.remove();
  const rechnung = box.querySelector('[data-klapp="rechnung"]');
  if (rechnung) rechnung.closest(".asec").remove();
  box.querySelectorAll(":scope > .kpis").forEach((k) => k.remove());
  const stufenKopf = box.querySelector('[data-klapp="stufen"] span');
  if (stufenKopf) stufenKopf.textContent = "Prämienstufen in diesem Vertriebsmonat";

  const vm = vertriebsmonat(new Date());
  const u = umsatz(vm.fromK, vm.toK);
  const p = provision(u, vm.weeks);
  const tl = !!(me && istTeamleiter() && !fremdAktiv);
  const praemie = Math.round(p.b * 100);
  const satzText = (extra) => `15 + 5 %${extra}`;
  const abgegeben = (x) => (x > 0.5 ? ` · ${pvEuro(x)} abgegeben` : "");

  /* Fortschritt zur nächsten Prämienstufe */
  const f = vm.weeks / 4;
  const max = TIERS[TIERS.length - 1].u * f;
  const pct = Math.min(100, (p.basis / max) * 100);
  const marken = TIERS.map(
    (t) =>
      `<span class="pvmarke${p.basis >= t.u * f ? " an" : ""}" style="left:${((t.u * f) / max) * 100}%"><i></i><em>${Math.round(t.b * 100)} %</em></span>`,
  ).join("");

  const zeilen = [];
  const betraege = (brutto, nettoWert, ab) =>
    `brutto ${pvEuro(brutto)} · netto ${pvEuro(nettoWert)}${ab > 0.5 ? ` · ${pvEuro(ab)} abgegeben` : ""}`;
  const praemieText = praemie ? ` + ${praemie} % Prämie` : "";
  zeilen.push(pvZeile("Weißgebiet", [betraege(u.wg, p.wgN, p.abWG), "15 + 5 %"], pvEuro(p.pWG)));
  zeilen.push(pvZeile("Festgebiet", [betraege(u.fg, p.fgN, p.abFG), `15 + 5 %${praemieText}`], pvEuro(p.pFG)));
  zeilen.push(
    pvZeile("K70 Einkauf", [betraege(u.k70ein, p.einN, 0), `15 + 5 %${praemieText} + 6 % Bonus`], pvEuro(p.pK70)),
  );
  if (p.messeN)
    zeilen.push(pvZeile("Messe", [betraege(u.messe, p.messeN, p.abMesse), "20 %"], pvEuro(p.pMesse || 0)));
  zeilen.push(
    pvZeile(
      "Sonstiges",
      [`Leads netto ${pvEuro(p.leadN)}`, `Leervorführungen netto ${pvEuro(p.leerN)}`],
      pvEuro(p.pSonst),
    ),
  );
  if (tl)
    zeilen.push(
      pvZeile(
        "Teamprovision",
        p.team.length ? `${p.team.filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i).length} Mitglieder · Details unten` : "noch niemand eingetragen",
        pvEuro(p.pTeam),
      ),
    );
  zeilen.push(
    pvZeile(
      "Versicherungszuschuss",
      [`RV 9 % · ${pvEuro(p.zuschussRV)}`, `KV 5 % · ${pvEuro(p.zuschussKV)}`],
      "+ " + pvEuro(p.vers),
    ),
  );
  zeilen.push(pvZeile("Provision", "", pvEuro(p.prov + p.vers), "zwischen"));
  if (p.warenkredit) zeilen.push(pvZeile("K70 Warenkredit", "", "− " + pvEuro(p.warenkredit), "minus"));
  if (p.minus) zeilen.push(pvZeile("Minus aus dem Vormonat", "", "− " + pvEuro(p.minus), "minus"));
  zeilen.push(pvZeile("Überweisung", "", pvEuro(p.gesamt), "summe"));
  if (p.uebertrag)
    zeilen.push(pvZeile("Übertrag in den Folgemonat", "im nächsten Monat eintragen", "− " + pvEuro(p.uebertrag), "minus"));

  /* Teamprovision im Detail: je Mitglied und Satz */
  const kwText = (w) => (w.length ? "KW " + (w.length > 1 ? w[0] + "–" + w[w.length - 1] : w[0]) : "noch keine Meldung");
  const teamHTML = tl
    ? `<section class="pvblock">
        <h2 class="pvh">Teamprovision</h2>
        ${
          p.team.length
            ? `<ul class="pvliste pvteam">${p.team
                .map((x) =>
                  pvZeile(
                    entschaerfeText(x.name),
                    `${kwText(x.wochen)} · Umsatz netto ${pvEuro(x.nettoUm)}`,
                    `<span class="pvsatz" data-keinzaehlen>${x.satz} %</span><span class="pvbetr">${pvEuro(x.anteil)}</span>`,
                    x.geteilt ? "geteilt" : "",
                  ),
                )
                .join("")}${pvZeile("Gesamt", "", `<span class="pvbetr">${pvEuro(p.pTeam)}</span>`, "zwischen")}</ul>`
            : `<p class="pvnote">Lege unter <a href="#team">Teammitglieder</a> dein Team an und trag die
                 Wochenzahlen ein – dann erscheint hier deine Teamprovision.</p>`
        }
      </section>`
    : "";

  /* Geteilte Verkäufe zum Nachsehen und Ändern */
  const geteiltHTML = (u.geteilt || []).length
    ? `<section class="pvblock">
        <h2 class="pvh">Geteilte Verkäufe</h2>
        <ul class="pvliste">${u.geteilt
          .map(
            (g) => `<li class="pvz tippbar"><button type="button" data-pvteil="${g.k}">
              <span class="pvzt">${entschaerfeText(g.name)}<small>${fmt(fromDk(g.tag))} · ${pvEuro(g.brutto)} brutto</small></span>
              <b>${[g.vk ? "Verkauf" : "", g.kt ? "Kontakt" : ""].filter(Boolean).join(" + ") || "nichts"}</b></button></li>`,
          )
          .join("")}</ul>
        <p class="pvnote">Was du von der Basisprovision bekommst. Antippen zum Ändern.</p>
      </section>`
    : "";

  const kopf = `
    <div class="pvkopf">
      <p class="pveb">Vertriebsmonat ${vm.idx} · ${vm.quartal}. Quartal · KW ${vm.startW}–${vm.endW}</p>
      <p class="pvlbl">Überweisung</p>
      <p class="pvgross"><span>${pvGanz(p.gesamt)}</span><small>€</small></p>
      <div class="pvmeter" role="progressbar" aria-label="Festgebiet netto zur höchsten Prämienstufe"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}">
        <div class="pvbahn"><i data-ziel="${pct.toFixed(1)}"></i></div>${marken}</div>
      <div class="pvmeta"><span>${p.stufe === "keine" ? "Noch keine Prämie" : "Prämie " + p.stufe}</span>
        <span>${p.next ? `noch ${pvEuro(p.next.fehlt)} netto bis ${p.next.pct} %` : "höchste Stufe erreicht"}</span></div>
    </div>
    <section class="pvblock">
      <h2 class="pvh">Zusammensetzung</h2>
      <ul class="pvliste">${zeilen.join("")}</ul>
    </section>
    ${teamHTML}
    ${geteiltHTML}
    <section class="pvblock">
      <h2 class="pvh">Was wäre, wenn …</h2>
      <div class="pvwenn">
        <button type="button" class="pvrund" data-pvwenn="-1" aria-label="Ein Verkauf weniger">−</button>
        <div class="pvwmitte" aria-live="polite"><b id="pvWennT" data-keinzaehlen>so wie jetzt</b><span id="pvWennS"></span></div>
        <button type="button" class="pvrund" data-pvwenn="1" aria-label="Ein Verkauf mehr">+</button>
      </div>
      <p class="pvnote" id="pvTipp"></p>
      <p class="pvnote" id="pvWie"></p>
    </section>
    <h2 class="pvh pvdetail">Details</h2>`;
  box.insertAdjacentHTML("afterbegin", kopf);

  /* Balken nach dem ersten Bild füllen */
  const bahn = box.querySelector(".pvbahn i");
  if (bahn) requestAnimationFrame(() => requestAnimationFrame(() => (bahn.style.width = bahn.dataset.ziel + "%")));

  /* Was wäre, wenn – bis zu 25 Verkäufe mehr */
  const schnitt = pvSchnitt();
  document.getElementById("pvWie").textContent =
    `Gerechnet wird mit deinem Durchschnitt: ${pvEuro(schnitt.brutto)} brutto je Verkauf, ` +
    `${Math.round(schnitt.fgAnteil * 100)} % davon im Festgebiet` +
    (schnitt.n >= 2 ? ` (aus ${schnitt.n} Verkäufen der letzten 26 Wochen).` : " (Startwert, bis es eigene Verkäufe gibt).");
  const wennSetzen = () => {
    const e = pvWenn;
    const u2 = Object.assign({}, u, {
      fg: u.fg + e * schnitt.brutto * schnitt.fgAnteil,
      wg: u.wg + e * schnitt.brutto * (1 - schnitt.fgAnteil),
    });
    const p2 = provision(u2, vm.weeks);
    document.getElementById("pvWennT").textContent = e
      ? `+${e} ${e === 1 ? "Verkauf" : "Verkäufe"} · ${pvEuro(p2.gesamt)}`
      : "so wie jetzt";
    document.getElementById("pvWennS").textContent = e ? `+ ${pvEuro(p2.gesamt - p.gesamt)} mehr` : "Tippe auf + (gedrückt halten geht schneller)";
    const nettoFG = netto(schnitt.brutto) * schnitt.fgAnteil;
    const tipp = document.getElementById("pvTipp");
    if (p2.next && nettoFG > 0) {
      const noch = Math.ceil(p2.next.fehlt / nettoFG);
      tipp.textContent = `${noch} ${noch === 1 ? "Verkauf" : "Verkäufe"} mehr im Festgebiet und du erreichst ${p2.next.pct} % Prämie.`;
    } else tipp.textContent = "Höchste Prämienstufe – jeder weitere Verkauf zählt voll.";
  };
  box.querySelectorAll("[data-pvwenn]").forEach(
    (b) =>
      (b.onclick = () => {
        pvWenn = Math.max(0, Math.min(25, pvWenn + +b.dataset.pvwenn));
        wennSetzen();
      }),
  );
  wennSetzen();

  box.querySelectorAll("[data-pvteil]").forEach((b) => (b.onclick = () => aufteilungFragen(b.dataset.pvteil)));

  /* Kurzwert in den Kopf jedes Detailbereichs */
  const std = arbeitsStunden(vm.fromK, vm.toK);
  const kurz = {
    stufen: p.stufe === "keine" ? "noch keine" : p.stufe,
    zeit: std ? pvEuro((p.prov + p.vers) / std) + " / h" : "",
    k70: typeof bestandWert === "function" ? pvEuro(bestandWert()) : "",
  };
  box.querySelectorAll(".klappkopf[data-klapp]").forEach((k) => {
    const t = kurz[k.dataset.klapp];
    if (!t || k.querySelector(".ksum")) return;
    const s = document.createElement("span");
    s.className = "ksum";
    s.dataset.keinzaehlen = "";
    s.textContent = t;
    k.insertBefore(s, k.querySelector(".kp"));
  });
};
