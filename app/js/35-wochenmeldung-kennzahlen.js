/**
 * Wochenmeldung – Kennzahlen
 *
 * Ersetzt meldungDaten, meldungHTML und meldungText aus 20-wochenmeldung.js:
 * Kundentermine, Aktiv, Einheiten (Festgebiet/Messe), Umsatz netto, K70-Einkauf,
 * Premium CheckIn, Promotions, Empfehlungen, Jobtickets.
 * Dazu eine Prognose für die Folgewoche (Abschlussquote und Durchschnittsauftrag
 * der letzten 13 Wochen). "Aktiv" wird im Export zu 1/0.
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
    einheitenMesse: 0,
    umsatzFG: 0,
    umsatzWG: 0,
    umsatzMesse: 0,
    k70ein: 0,
    pci: 0,
    promoFG: 0,
    promoWG: 0,
    kontakte: 0,
    promoTermine: 0,
    /* alte Feldnamen – die Team-Wochenmeldung liest diese weiter */
    kontakteFG: 0,
    kontakteWG: 0,
    promoTermineFG: 0,
    promoTermineWG: 0,
    einheitenPromo: 0,
    umsatzPromo: 0,
    messen: 0,
    empfehlungen: 0,
    jobtickets: 0,
    nTermine: 0,
    nPromos: 0,
    nPromosFG: 0,
    nPromosWG: 0,
    promoEinheitenFG: 0,
    promoEinheitenWG: 0,
    promoUmsatzFG: 0,
    promoUmsatzWG: 0,
    nTerminieren: 0,
    nMessen: 0,
  };

  Object.keys(entries).forEach((k) => {
    const [tag] = k.split("|");
    const e = entries[k],
      n = e.nb || {};

    /* Folgewoche: nur zählen, was geplant ist */
    if (tag >= nVon && tag <= nBis) {
      if (e.kind === "kunde") m.nTermine++;
      if (e.kind === "terminieren") {
        if (e.quelle === "Promotion") {
          m.nPromos++;
          e.gebiet === "Weißgebiet" ? m.nPromosWG++ : m.nPromosFG++;
        }
        else if (e.quelle === "Messe") m.nMessen++;
        else m.nTerminieren++;
      }
      return;
    }
    if (tag < von || tag > bis) return;

    if (e.kind === "kunde") m.termine++;
    if (e.kind === "premium") m.pci++;

    /* Verkäufe aus Kundenterminen, CheckIns und Eigenkäufen */
    if (["kunde", "premium", "eigenkauf", "abholen"].includes(e.kind) && n.verkauft === "Ja") {
      const eh = +n.einheiten || 0;
      m.einheiten += eh;
      if (n.gebiet === "Festgebiet") {
        m.einheitenFG += eh;
        m.umsatzFG += num(n.umsatz);
      } else if (n.gebiet === "Weißgebiet") m.umsatzWG += num(n.umsatz);
    }

    if (e.kind === "terminieren") {
      if (e.quelle === "Promotion") {
        const kon = +n.kontakte || 0,
          ter = +n.termine || 0;
        if (e.gebiet === "Weißgebiet") {
          m.promoWG++;
          m.kontakteWG += kon;
          m.promoTermineWG += ter;
        } else {
          m.promoFG++;
          m.kontakteFG += kon;
          m.promoTermineFG += ter;
        }
        m.kontakte += kon;
        m.promoTermine += ter;
        if (n.verkauft === "Ja") {
          const eh = +n.einheiten || 0;
          m.einheiten += eh;
          m.einheitenFG += eh; // Promotionverkauf liegt im Gebiet
          m.einheitenPromo += eh;
          m.umsatzPromo += num(n.umsatzFG) + num(n.umsatzWG);
          if (e.gebiet === "Weißgebiet") {
            m.promoEinheitenWG += eh;
            m.promoUmsatzWG += num(n.umsatzFG) + num(n.umsatzWG);
          } else {
            m.promoEinheitenFG += eh;
            m.promoUmsatzFG += num(n.umsatzFG) + num(n.umsatzWG);
          }
          m.umsatzFG += num(n.umsatzFG);
          m.umsatzWG += num(n.umsatzWG);
        }
      }
      if (e.quelle === "Messe") {
        m.messen++;
        const eh = +n.einheiten || 0;
        m.einheiten += eh;
        m.einheitenMesse += eh;
        m.umsatzMesse += num(n.umsatzMesse);
      }
    }
    if (n.empf === "Ja") m.empfehlungen += empfZahl(n);
    if (n.job === "Ja") m.jobtickets += +n.jobAnzahl || 0;
  });
  einkaeufe.forEach((e) => {
    if (e.datum >= von && e.datum <= bis) m.k70ein += num(e.brutto);
  });

  /* Aktiv: mindestens eine verkaufte Einheit in der Woche. */
  m.aktiv = m.einheiten > 0;

  /* Prognose aus den eigenen Zahlen der letzten 13 Wochen */
  const q = quoten(13).termine;
  const quote = q.stattgefunden ? q.verkauft / q.stattgefunden : 0;
  const proAbs = q.verkauft ? q.umsatz / q.verkauft : 0;
  const ehAbs = q.verkauft ? q.einheiten / q.verkauft : 0;
  m.erwarteterUmsatz = m.nTermine * quote * proAbs;
  m.erwarteteEinheiten = m.nTermine * quote * ehAbs;
  m.quote = quote;
  m.von = von;
  m.bis = bis;
  m.umsatzGesamt = m.umsatzFG + m.umsatzWG + m.umsatzMesse;
  return m;
}

/*
 * Promotion getrennt nach Gebiet – es erscheint nur, was stattgefunden hat:
 * keine Promotion → „Promotion 0“, sonst je Gebiet eine eigene Zeile mit Ergebnissen.
 */
function promoZeilen(m) {
  const n = (v) => eur(netto(v)) + " €";
  if (!m.promoFG && !m.promoWG) return [["Promotion", 0, ""]];
  const z = [];
  [
    ["FG", m.promoFG, m.kontakteFG, m.promoTermineFG, m.promoEinheitenFG, m.promoUmsatzFG],
    ["WG", m.promoWG, m.kontakteWG, m.promoTermineWG, m.promoEinheitenWG, m.promoUmsatzWG],
  ].forEach(([g, anzahl, kon, ter, eh, um]) => {
    if (!anzahl) return;
    z.push([`Promotion ${g}`, anzahl, `Kontakte ${kon} · Termine ${ter}${eh ? ` · Einheiten ${eh}` : ""}${um ? ` · Umsatz ${n(um)}` : ""}`]);
  });
  return z;
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
      ${zeile("Anzahl Kundentermine", m.termine)}
      ${zeile("Aktiv", m.aktiv ? "Ja" : "Nein", "im Excel-Export als 1 oder 0")}
      ${zeile("Einheiten gesamt", m.einheiten)}
      ${zeile("davon Festgebiet", m.einheitenFG)}
      ${zeile("davon Messe", m.einheitenMesse)}
      ${zeile(
        "Umsatz netto",
        n(m.umsatzGesamt) + " €",
        `Festgebiet ${n(m.umsatzFG)} €${m.umsatzWG ? ` · Weißgebiet ${n(m.umsatzWG)} €` : ""}${m.umsatzMesse ? ` · Messe ${n(m.umsatzMesse)} €` : ""}`,
      )}
      ${zeile("K70 Einkauf", n(m.k70ein) + " €")}
      ${zeile("Anzahl Premium CheckIn", m.pci)}
      ${promoZeilen(m)
        .map(([l, w, x]) => zeile(l, w, x))
        .join("")}
      ${zeile("Anzahl Jobtickets", m.jobtickets)}
    </tbody></table></div>
    <div class="ah4">Prognose für die Folgewoche</div>
    <div class="ascroll"><table class="atable meld"><tbody>
      ${zeile("Kundentermine in der Folgewoche", m.nTermine)}
      ${zeile(
        "Erwarteter Umsatz netto",
        eur(netto(m.erwarteterUmsatz)) + " €",
        `${m.nTermine} Termine × ${Math.round(m.quote * 100)} % Abschlussquote`,
      )}
      ${zeile("Erwartete Einheiten", dec(m.erwarteteEinheiten, 1))}
      ${
        m.nPromosFG || m.nPromosWG
          ? (m.nPromosFG ? zeile("Promotions FG in der Folgewoche", m.nPromosFG) : "") +
            (m.nPromosWG ? zeile("Promotions WG in der Folgewoche", m.nPromosWG) : "")
          : zeile("Promotions in der Folgewoche", 0)
      }
      ${zeile("Festgebietsbegehungsblöcke", m.nTerminieren)}
      ${m.nMessen ? zeile("Messen in der Folgewoche", m.nMessen) : ""}
    </tbody></table></div>
    <p class="hinweis" style="margin-top:8px">Die Prognose rechnet mit deiner eigenen
      Abschlussquote und deinem Durchschnittsauftrag aus den letzten 13 Wochen.</p>
    <div class="actions"><button class="btn" data-meldcopy="${dk(start)}" data-meldname="${name || ""}">Als Text kopieren</button></div>
  </div>`;
}

function meldungText(start, name) {
  const m = meldungDaten(start);
  const n = (v) => eur(netto(v)) + " €";
  const { week } = isoWeek(start);
  return [
    `Wochenmeldung KW ${week}${name ? " – " + name : ""} (${fmt(fromDk(m.von))} – ${fmt(fromDk(m.bis))})`,
    `Anzahl Kundentermine: ${m.termine}`,
    `Aktiv: ${m.aktiv ? "Ja" : "Nein"}`,
    `Einheiten gesamt: ${m.einheiten} (Festgebiet ${m.einheitenFG}, Messe ${m.einheitenMesse})`,
    `Umsatz netto: ${n(m.umsatzGesamt)}`,
    `K70 Einkauf: ${n(m.k70ein)}`,
    `Anzahl Premium CheckIn: ${m.pci}`,
    ...promoZeilen(m).map(([l, w, x]) => `${l}: ${w}${x ? ` (${x})` : ""}`),
    `Anzahl Jobtickets: ${m.jobtickets}`,
    ``,
    `Prognose Folgewoche:`,
    `Kundentermine: ${m.nTermine} · erwarteter Umsatz netto: ${n(m.erwarteterUmsatz)} · erwartete Einheiten: ${dec(m.erwarteteEinheiten, 1)}`,
    `${
      m.nPromosFG || m.nPromosWG
        ? [m.nPromosFG ? `Promotions FG: ${m.nPromosFG}` : "", m.nPromosWG ? `Promotions WG: ${m.nPromosWG}` : ""].filter(Boolean).join(" · ")
        : "Promotions: 0"
    } · Festgebietsbegehungsblöcke: ${m.nTerminieren}`,
  ].join("\n");
}
