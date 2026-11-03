/**
 * Wochenmeldung
 *
 * Wöchentliche Kennzahlen zur Meldung an die Teamleitung.
 */
function meldungDaten(start) {
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return dk(d);
  });
  const von = tage[0],
    bis = tage[6];
  const naechste = new Date(start);
  naechste.setDate(naechste.getDate() + 7);
  const nTage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(naechste);
    d.setDate(d.getDate() + i);
    return dk(d);
  });
  const nVon = nTage[0],
    nBis = nTage[6];

  const m = {
    termine: 0,
    einheiten: 0,
    einheitenFG: 0,
    einheitenPromo: 0,
    umsatzFG: 0,
    umsatzWG: 0,
    umsatzPromo: 0,
    k70ein: 0,
    pci: 0,
    promoFG: 0,
    promoWG: 0,
    kontakteFG: 0,
    kontakteWG: 0,
    promoTermineFG: 0,
    promoTermineWG: 0,
    empfehlungen: 0,
    jobtickets: 0,
    nTermine: 0,
    nPromos: 0,
    nTerminieren: 0,
  };

  Object.keys(entries).forEach((k) => {
    const [tag] = k.split("|");
    const e = entries[k],
      n = e.nb || {};
    if (tag >= nVon && tag <= nBis) {
      if (e.kind === "kunde") m.nTermine++;
      if (e.kind === "terminieren") {
        e.quelle === "Promotion" ? m.nPromos++ : m.nTerminieren++;
      }
      return;
    }
    if (tag < von || tag > bis) return;

    if (e.kind === "kunde") m.termine++;
    if (e.kind === "premium") m.pci++;
    if (["kunde", "premium", "eigenkauf"].includes(e.kind) && n.verkauft === "Ja") {
      const eh = +n.einheiten || 0;
      m.einheiten += eh;
      if (n.gebiet === "Festgebiet") {
        m.einheitenFG += eh;
        m.umsatzFG += num(n.umsatz);
      } else if (n.gebiet === "Weißgebiet") m.umsatzWG += num(n.umsatz);
    }
    if (e.kind === "terminieren" && e.quelle === "Promotion") {
      if (e.gebiet === "Weißgebiet") {
        m.promoWG++;
        m.kontakteWG += +n.kontakte || 0;
        m.promoTermineWG += +n.termine || 0;
      } else {
        m.promoFG++;
        m.kontakteFG += +n.kontakte || 0;
        m.promoTermineFG += +n.termine || 0;
      }
      if (n.verkauft === "Ja") {
        const eh = +n.einheiten || 0;
        m.einheiten += eh;
        m.einheitenPromo += eh;
        m.umsatzPromo += num(n.umsatzFG) + num(n.umsatzWG);
        m.umsatzFG += num(n.umsatzFG);
        m.umsatzWG += num(n.umsatzWG);
      }
    }
    if (n.empf === "Ja") m.empfehlungen += empfZahl(n);
    if (n.job === "Ja") m.jobtickets += +n.jobAnzahl || 0;
  });
  einkaeufe.forEach((e) => {
    if (e.datum >= von && e.datum <= bis) m.k70ein += num(e.brutto);
  });

  const q = quoten(13).termine;
  const quote = q.stattgefunden ? q.verkauft / q.stattgefunden : 0;
  const proAbs = q.verkauft ? q.umsatz / q.verkauft : 0;
  const ehAbs = q.verkauft ? q.einheiten / q.verkauft : 0;
  m.erwarteterUmsatz = m.nTermine * quote * proAbs;
  m.erwarteteEinheiten = m.nTermine * quote * ehAbs;
  m.quote = quote;
  m.von = von;
  m.bis = bis;
  return m;
}
function meldungHTML(start, name) {
  const m = meldungDaten(start);
  const n = (v) => eur(netto(v));
  const zeile = (l, w, extra = "") =>
    `<tr><td>${l}</td><td class="v">${w}</td><td class="x">${extra}</td></tr>`;
  const { week } = isoWeek(start);
  return `<div class="asec meldung">
    <h3>Wochenmeldung${name ? " · " + name : ""}</h3>
    <p class="sub">KW ${week} · ${fmt(fromDk(m.von))} – ${fmt(fromDk(m.bis))} · Beträge netto</p>
    <div class="ascroll"><table class="atable meld"><tbody>
      ${zeile("Kundentermine", m.termine)}
      ${zeile("Einheiten geschrieben", m.einheiten, `davon Festgebiet ${m.einheitenFG} · Promotion ${m.einheitenPromo}`)}
      ${zeile("Umsatz netto", n(m.umsatzFG + m.umsatzWG) + " €", `Festgebiet ${n(m.umsatzFG)} € · Promotion ${n(m.umsatzPromo)} €`)}
      ${zeile("K70 eingekauft", n(m.k70ein) + " €")}
      ${zeile("Premium CheckIn", m.pci)}
      ${zeile("Promotion", m.promoFG + m.promoWG, `Festgebiet ${m.promoFG} · Weißgebiet ${m.promoWG}`)}
      ${zeile(
        "Aus Promotion",
        `${m.kontakteFG + m.kontakteWG} / ${m.promoTermineFG + m.promoTermineWG}`,
        `Kontakte / Termine · zusammen ${m.kontakteFG + m.kontakteWG + m.promoTermineFG + m.promoTermineWG}`,
      )}
      ${zeile("Empfehlungen gesammelt", m.empfehlungen)}
      ${zeile("Jobtickets gesammelt", m.jobtickets)}
    </tbody></table></div>
    <div class="ah4">Kommende Woche</div>
    <div class="ascroll"><table class="atable meld"><tbody>
      ${zeile("Kundentermine eingetragen", m.nTermine)}
      ${zeile("Erwarteter Bruttoumsatz", eur(m.erwarteterUmsatz) + " €", `bei ${Math.round(m.quote * 100)} % Abschlussquote`)}
      ${zeile("Erwartete Einheiten", dec(m.erwarteteEinheiten, 1))}
      ${zeile("Promotion vereinbart", m.nPromos)}
      ${zeile("Terminierungsblöcke", m.nTerminieren)}
    </tbody></table></div>
    <div class="actions"><button class="btn" data-meldcopy="${dk(start)}" data-meldname="${name || ""}">Als Text kopieren</button></div>
  </div>`;
}
function meldungText(start, name) {
  const m = meldungDaten(start);
  const n = (v) => eur(netto(v)) + " €";
  const { week } = isoWeek(start);
  return [
    `Wochenmeldung KW ${week}${name ? " – " + name : ""} (${fmt(fromDk(m.von))} – ${fmt(fromDk(m.bis))})`,
    `Kundentermine: ${m.termine}`,
    `Einheiten: ${m.einheiten} (Festgebiet ${m.einheitenFG}, Promotion ${m.einheitenPromo})`,
    `Umsatz netto: ${n(m.umsatzFG + m.umsatzWG)} (Festgebiet ${n(m.umsatzFG)}, Promotion ${n(m.umsatzPromo)})`,
    `K70 eingekauft: ${n(m.k70ein)}`,
    `Premium CheckIn: ${m.pci}`,
    `Promotion: ${m.promoFG + m.promoWG} (FG ${m.promoFG}, WG ${m.promoWG})`,
    `Aus Promotion: ${m.kontakteFG + m.kontakteWG} Kontakte / ${m.promoTermineFG + m.promoTermineWG} Termine (zusammen ${m.kontakteFG + m.kontakteWG + m.promoTermineFG + m.promoTermineWG})`,
    `Empfehlungen: ${m.empfehlungen} · Jobtickets: ${m.jobtickets}`,
    ``,
    `Kommende Woche:`,
    `Termine: ${m.nTermine} · erwarteter Bruttoumsatz: ${eur(m.erwarteterUmsatz)} € · erwartete Einheiten: ${dec(m.erwarteteEinheiten, 1)}`,
    `Promotion: ${m.nPromos} · Terminierungsblöcke: ${m.nTerminieren}`,
  ].join("\n");
}
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-meldcopy]");
  if (!b) return;
  const txt = meldungText(
    fromDk(b.dataset.meldcopy),
    b.dataset.meldname || (me ? me.vorname + " " + me.nachname : ""),
  );
  navigator.clipboard
    .writeText(txt)
    .then(() => {
      b.textContent = "Kopiert";
      setTimeout(() => (b.textContent = "Als Text kopieren"), 1500);
    })
    .catch(() => {
      b.textContent = "Kopieren nicht möglich";
    });
});
