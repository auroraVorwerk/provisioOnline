/**
 * Wochenmeldung eines Teammitglieds – übersichtlich (Beta 1.8)
 *
 * Oben die Kalenderwochen des Vertriebsmonats als Knöpfe: so lässt sich
 * jede Woche des Monats nachtragen (z. B. KW 1, wenn die App erst in KW 2
 * dazukommt) – aber nur Wochen dieses Vertriebsmonats. Darunter die Zahlen
 * in Gruppen: Zählwerte mit Plus und Minus, Beträge als Feld.
 */
(function () {
  "use strict";
  const GRUPPEN = [
    ["Termine und Einheiten", [["termine", "Kundentermine"], ["einheiten", "Einheiten gesamt"], ["einheitenFG", "davon Festgebiet"], ["einheitenMesse", "davon Messe"]]],
    ["Umsatz", [["umsatzNetto", "Umsatz netto", "eur"], ["k70ein", "K70 Einkauf", "eur"]]],
    ["Aktivitäten", [["pci", "Premium CheckIn"], ["jobtickets", "Jobtickets"]]],
    ["Promotion Festgebiet", [["promosFG", "Promotions"], ["kontakteFG", "Kontakte"], ["promoTermineFG", "Termine"]]],
    ["Promotion Weißgebiet", [["promosWG", "Promotions"], ["kontakteWG", "Kontakte"], ["promoTermineWG", "Termine"]]],
    [
      "Folgewoche",
      [["nTermine", "Kundentermine"], ["erwUmsatz", "Erwarteter Umsatz", "eur"], ["erwEinheiten", "Erwartete Einheiten", "dez"], ["nPromosFG", "Promotions FG"], ["nPromosWG", "Promotions WG"], ["nTerminieren", "FGB-Blöcke"]],
    ],
  ];
  const ALLE = GRUPPEN.flatMap((g) => g[1]);

  function wochenDesMonats(wochenKey) {
    const vm = vertriebsmonat(fromDk(wochenKey));
    return Array.from({ length: vm.weeks }, (_, i) => {
      const d = new Date(vm.from);
      d.setDate(d.getDate() + i * 7);
      return dk(d);
    });
  }

  function zeile([k, l, art], wert) {
    if (art) {
      const v = wert === undefined || wert === "" ? "" : art === "eur" ? eur(+wert) : String(wert).replace(".", ",");
      return `<label class="mmz"><span>${l}</span><span class="mmbetrag"><input id="mm_${k}" inputmode="decimal" value="${v}" placeholder="0">${art === "eur" ? "<em>€</em>" : ""}</span></label>`;
    }
    return `<div class="mmz"><span>${l}</span><span class="mmstep">
      <button type="button" data-mmminus="${k}" aria-label="weniger">−</button>
      <input id="mm_${k}" inputmode="numeric" value="${+wert || 0}">
      <button type="button" data-mmplus="${k}" aria-label="mehr">+</button></span></div>`;
  }

  meldungManuellDialog = function (id, wochenKey) {
    const m = teamManuell().find((x) => x.id === id);
    if (!m) return;
    const wochen = wochenDesMonats(wochenKey);
    const alt = (teamMeldungen()[id] || {})[wochenKey] || {};
    const { week } = isoWeek(fromDk(wochenKey));
    const satz = alt.satz || satzFuer(id, wochenKey);
    const q = typeof teamQuote === "function" ? teamQuote(id, wochenKey) : null;
    const vm = vertriebsmonat(fromDk(wochenKey));
    simpleDialog(
      `${entschaerfeText(m.name)} · KW ${week}`,
      `Vertriebsmonat ${vm.idx} im ${vm.quartal}. Quartal`,
      `<div class="mmwochen" role="group" aria-label="Kalenderwoche">${wochen
        .map((w) => {
          const da = !!(teamMeldungen()[id] || {})[w];
          return `<button type="button" data-mmwoche="${w}" aria-pressed="${w === wochenKey}">KW ${isoWeek(fromDk(w)).week}${da ? "<i>✓</i>" : ""}</button>`;
        })
        .join("")}</div>
       <div class="mmgruppe"><div class="mmz"><span>Dein Anteil</span>
         <span class="mmsatz">${TL_SAETZE.map((s) => `<button type="button" data-mmsatz="${s}" aria-pressed="${s === satz}">${s} %</button>`).join("")}</span></div></div>
       ${GRUPPEN.map(([t, felder]) => `<p class="mmtitel">${t}</p><div class="mmgruppe">${felder.map((f) => zeile(f, alt[f[0]])).join("")}</div>`).join("")}`,
      () => {
        const w = {};
        ALLE.forEach(([k]) => {
          const v = document.getElementById("mm_" + k).value.trim();
          if (v !== "" && num(v) !== 0) w[k] = num(v);
        });
        const s = sheet.querySelector('[data-mmsatz][aria-pressed="true"]');
        w.satz = s ? +s.dataset.mmsatz : satz;
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
    sheet.querySelectorAll("[data-mmwoche]").forEach(
      (b) => (b.onclick = () => b.dataset.mmwoche !== wochenKey && meldungManuellDialog(id, b.dataset.mmwoche)),
    );
    sheet.querySelectorAll("[data-mmsatz]").forEach(
      (b) =>
        (b.onclick = () =>
          sheet.querySelectorAll("[data-mmsatz]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)))),
    );
    const schritt = (k, d) => {
      const f = document.getElementById("mm_" + k);
      f.value = Math.max(0, (Math.round(num(f.value)) || 0) + d);
      f.dispatchEvent(new Event("input", { bubbles: true }));
    };
    sheet.querySelectorAll("[data-mmplus]").forEach((b) => (b.onclick = () => schritt(b.dataset.mmplus, 1)));
    sheet.querySelectorAll("[data-mmminus]").forEach((b) => (b.onclick = () => schritt(b.dataset.mmminus, -1)));
    sheet.querySelectorAll(".mmstep input").forEach((f) => f.addEventListener("focus", () => f.select()));
    /* Erwartung aus früheren Meldungen, solange nicht selbst eingetragen */
    const nT = document.getElementById("mm_nTermine"),
      eU = document.getElementById("mm_erwUmsatz"),
      eE = document.getElementById("mm_erwEinheiten");
    if (q && nT && eU && eE) {
      [eU, eE].forEach((f) => f.addEventListener("input", () => (f.dataset.selbst = "1")));
      const rechnen = () => {
        const t = num(nT.value);
        if (!eU.dataset.selbst) eU.value = t ? eur(Math.round(t * q.umsatz)) : "";
        if (!eE.dataset.selbst) eE.value = t ? String(Math.round(t * q.einheiten * 10) / 10).replace(".", ",") : "";
      };
      nT.addEventListener("input", rechnen);
      if (!alt.erwUmsatz && !alt.erwEinheiten) rechnen();
    }
  };

  /* Team-Karte: Wochen des Monats als kleine Häkchenleiste */
  if (typeof renderTeamManuell === "function") {
    const ohne = renderTeamManuell;
    renderTeamManuell = function () {
      const r = ohne.apply(this, arguments);
      const woche = dk(typeof tmMontag !== "undefined" && tmMontag ? tmMontag : monday);
      const wochen = wochenDesMonats(woche);
      document.querySelectorAll("#tmManuell .tmkarte").forEach((k) => {
        const b = k.querySelector("[data-mmel]");
        if (!b || k.querySelector(".tmwochen")) return;
        const id = b.dataset.mmel;
        const leiste = document.createElement("div");
        leiste.className = "tmwochen";
        leiste.innerHTML = wochen
          .map((w) => {
            const da = !!(teamMeldungen()[id] || {})[w];
            return `<button type="button" class="${da ? "da" : ""}" data-tmw="${w}">KW ${isoWeek(fromDk(w)).week}</button>`;
          })
          .join("");
        leiste.querySelectorAll("[data-tmw]").forEach((x) => (x.onclick = () => meldungManuellDialog(id, x.dataset.tmw)));
        k.querySelector(".tmkopf").after(leiste);
      });
      return r;
    };
  }
})();
