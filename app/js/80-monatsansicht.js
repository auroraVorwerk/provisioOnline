/**
 * Monatsansicht im Jahresrückblick (Beta 1.9)
 *
 * Ein Tipp auf einen Vertriebsmonat (Tabellenzeile oder Balken) öffnet die
 * wichtigsten Zahlen aus der Abrechnung dieses Monats:
 *  1 Vertriebsmonat · 2 Umsatz · 3 Festgebietsumsatz · 4 Einheiten · 5 Aufträge
 *  6/7 Umsatz aus Online- und Shop-Verkäufen (AE Int / AE Ser)
 *  8/9 Provision daraus (Kontakt 5 % + Festgebietsprämie) und Anteil an der Provision
 *  10 Provision insgesamt (Summe Einkommen) · 11 davon Festgebietsprämie
 *  12 Umsatzsteuer · 13 Sonstige Einkünfte / Belastungen · 14 Überweisung
 * Die Werte 6–14 kommen aus der übernommenen PDF-Abrechnung (nachtrag[jahr][startKW].abr).
 */
(function () {
  "use strict";
  if (typeof renderJahr !== "function") return;
  const geld = (n) =>
    n === null || n === undefined || !isFinite(n)
      ? "–"
      : n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const ganz = (n) => (n ? Math.round(n).toLocaleString("de-DE") + " €" : "–");
  const zeile = (t, w, cls = "", klein = "") =>
    `<div class="esz mazeile ${cls}"><span class="eszt">${t}${klein ? `<small>${klein}</small>` : ""}</span><em>${w}</em></div>`;

  function monatOeffnen(jahr, startW) {
    const j = jahresUebersicht(jahr).find((x) => x.startW === startW);
    if (!j) return;
    const n = (nachtrag[jahr] && nachtrag[jahr][startW]) || {};
    const a = n.abr || null;
    const titel = a && a.monat ? a.monat : j.name;
    const os = a ? a.onlineShop || {} : null;
    const minus = (w) => (w < 0 ? "minus" : "");
    const html = `
      <p class="masub">${entschaerfeText(j.name)} · KW ${j.kw} · ${j.spanne}</p>
      <p class="esgh">Umsatz</p>
      <div class="esgrp">
        ${zeile("Nettoumsatz", ganz(j.nettoU), "gross")}
        ${zeile("Festgebietsumsatz", ganz(+n.fgAbger || 0), "", "abgerechnet")}
        ${zeile("Einheiten", j.einheiten || "–")}
        ${zeile("Aufträge", j.auftraege || "–")}
      </div>
      ${
        a
          ? `<p class="esgh">Online- und Shop-Verkäufe</p>
      <div class="esgrp">
        ${zeile("Umsatz", geld(os.umsatz), "", (os.posten || 0) + " Buchung" + (os.posten === 1 ? "" : "en") + " · Festgebiet-Wertung")}
        ${zeile("Provision daraus", geld(os.provision), "gross", `Kontakt 5 %: ${geld(os.kontakt)} · Festgebietsprämie ${a.fgSatz !== null && a.fgSatz !== undefined ? String(a.fgSatz).replace(".", ",") + " %" : ""}: ${geld(os.praemie)}`)}
        ${zeile("Anteil an deiner Provision", os.anteil !== null && os.anteil !== undefined ? String(os.anteil).replace(".", ",") + " %" : "–")}
      </div>
      <p class="esgh">Einkommen</p>
      <div class="esgrp">
        ${zeile("Provision insgesamt", geld(a.einkommen), "gross", "Summe Einkommen")}
        ${zeile("davon Festgebietsprämie", geld(a.fgPraemie))}
        ${zeile("Umsatzsteuer", a.mwst ? geld(a.mwst) : "keine", "", "MwSt. aus Abrechnungszeitraum")}
      </div>
      <p class="esgh">Konto</p>
      <div class="esgrp">
        ${zeile("Ausgaben und Verrechnungen", geld(a.sonstige), minus(a.sonstige), "Sonstige Einkünfte / Belastungen / Saldovortrag")}
        ${zeile("Überweisung", geld(a.ueberweisung), "gross", "aufs Bankkonto")}
      </div>
      <p class="esfuss">Aus der Abrechnung ${a.von ? fmt(fromDk(a.von)) + " – " + fmt(fromDk(a.bis)) : ""}. Beträge mit Cent, wie in der Abrechnung.</p>`
          : `<div class="esgrp espad"><p class="maleer">Für diesen Monat ist noch keine Abrechnung hinterlegt. Mit der PDF siehst du hier auch Online- und Shop-Verkäufe, deine Provision, die Festgebietsprämie, Umsatzsteuer, Ausgaben und die Überweisung.</p>
        <button type="button" class="btn primary wide" id="maPdf">Abrechnung (PDF) übernehmen</button></div>`
      }`;
    unterseiteOeffnen(entschaerfeText(titel), "Jahresrückblick", html, (ebene) => {
      ebene.classList.add("monatsansicht");
      const b = ebene.querySelector("#maPdf");
      if (b)
        b.onclick = () => {
          unterseiteSchliessen();
          if (typeof abrechnungImport === "function") abrechnungImport("jahr");
        };
    });
  }
  window.monatsansichtOeffnen = monatOeffnen;

  const ohne = renderJahr;
  renderJahr = function () {
    const r = ohne.apply(this, arguments);
    const box = document.getElementById("jahr");
    if (!box || !jahrAnsicht) return r;
    const z = jahresUebersicht(jahrAnsicht);
    const verknuepfen = (els) =>
      els.forEach((el, i) => {
        if (!z[i]) return;
        el.classList.add("maklick");
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", z[i].name + " öffnen");
        const n = nachtrag[jahrAnsicht] && nachtrag[jahrAnsicht][z[i].startW];
        if (n && n.abr) el.classList.add("mahatpdf");
        const auf = () => monatOeffnen(jahrAnsicht, z[i].startW);
        el.onclick = auf;
        el.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            auf();
          }
        };
      });
    verknuepfen([...box.querySelectorAll(".atable tbody tr")]);
    verknuepfen([...box.querySelectorAll(".balken .bgruppe")]);
    const h = [...box.querySelectorAll(".ah4")].find((x) => /Vertriebsmonate/.test(x.textContent));
    if (h && !h.querySelector("small")) h.insertAdjacentHTML("beforeend", ' <small class="mahinweis">· antippen für Details</small>');
    return r;
  };
})();
