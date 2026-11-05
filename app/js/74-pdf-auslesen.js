/**
 * Provisionsabrechnung (PDF) auslesen (Beta 1.8)
 *
 * Gesucht wird die Seite mit „Leistungsübersicht“ und der Tabelle, die mit
 * „Partner-Nr“ beginnt – die Seitenzahl ist nicht fest. Die Spalten werden
 * über ihre Position erkannt (Zahlen sind rechtsbündig unter ihrem Kopf),
 * leere Zellen bleiben so leer. Alles läuft auf dem Gerät; die PDF wird
 * nur im Arbeitsspeicher gelesen und nicht gespeichert.
 *
 * Spalten der Tabelle (Reihenfolge nach „Name/Eintritt/Austritt“):
 *  0 Netto-AE-Einheiten · 1 Eigen geschr. FG-Umsatz · 2 FG-Umsatz abgerechnet
 *  3 Kontaktumsatz · 4 Verkaufsumsatz · 5 K70 · 6 Gesamtumsatz abgerechnet (inkl. K70)
 *  7 Messeumsatz · 8 Umsatz für Qualität · 9 Brutto-AE-Umsatz für Qualität
 *  10 Ausfallquote · 11 Anzahl AE-Aufträge brutto · 12 Abmahnung/HV-Fehler
 *  13 Beschwerdequote · 14 Qualität
 */
(function (global) {
  "use strict";
  const SP = { einheiten: 0, fgAbger: 2, gesamt: 6, auftraege: 11 };

  const zahl = (t) => {
    const s = String(t || "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };
  /* immer auf den vollen Euro abrunden: 100,99 → 100 */
  const abrunden = (n) => Math.floor(n + 1e-9);
  const datum = (t) => {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t || "");
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  };
  const dkNorm = (d) => String(d || "").toUpperCase().replace(/^TL-/, "");

  /* Textstücke einer Seite in Zeilen gruppieren (y gleich ± 2) */
  function zeilen(items) {
    const st = items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ t: it.str.trim(), x: it.transform[4], x2: it.transform[4] + it.width, y: it.transform[5] }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const z = [];
    for (const s of st) {
      const l = z.find((r) => Math.abs(r.y - s.y) < 2.2);
      if (l) l.t.push(s);
      else z.push({ y: s.y, t: [s] });
    }
    z.forEach((r) => r.t.sort((a, b) => a.x - b.x));
    return z;
  }

  /* Eine Seite auswerten: liefert null, wenn die Tabelle nicht darauf ist */
  function seiteAuswerten(items) {
    const z = zeilen(items);
    const text = z.map((r) => r.t.map((s) => s.t).join(" ")).join("\n");
    if (!/Leistungsübersicht/.test(text)) return null;
    const kopf = z.find((r) => r.t[0] && /^Partner-Nr/.test(r.t[0].t));
    if (!kopf) return null;
    /* Spaltenköpfe: alles rechts von „Austritt“ – deren rechte Kante */
    const ia = kopf.t.findIndex((s) => /^Austritt/.test(s.t));
    const koepfe = kopf.t.slice(ia + 1).map((s) => s.x2);
    const xAustritt = kopf.t[ia] ? kopf.t[ia].x2 : 0;
    const spalteVon = (x2) => {
      let best = -1;
      koepfe.forEach((k, i) => {
        if (k <= x2 + 4) best = i;
      });
      return best;
    };
    const per = /Provisions-Abrechnung:\s*\d+\s*vom\s*(\d{2}\.\d{2}\.\d{4})\s*bis\s*(\d{2}\.\d{2}\.\d{4})/.exec(text);
    const monat = /Leistungsübersicht\s+Monat\s+(.+)/.exec(text);
    const eigeneDK = /Partner-Nummer:\s*(DK\d{8})/.exec(text);
    const reihen = [];
    let summeMitTL = null,
      summeOhneTL = null;
    z.filter((r) => r.y < kopf.y).forEach((r) => {
      const erstes = r.t[0].t;
      const istSumme = /^Summe/.test(erstes);
      if (!/^DK\d{8}$/.test(erstes) && !istSumme) return;
      const werte = {};
      let name = "",
        eintritt = null,
        austritt = null;
      r.t.slice(1).forEach((s) => {
        if (s.x2 <= xAustritt + 4) {
          const d = datum(s.t);
          if (d) {
            if (!eintritt) eintritt = d;
            else austritt = d;
          } else if (!istSumme) name += (name ? " " : "") + s.t;
          return;
        }
        const i = spalteVon(s.x2);
        if (i >= 0) werte[i] = s.t;
      });
      const rec = {
        dk: istSumme ? null : erstes,
        name: name.replace(/^\+{1,2}|^\*/, "").trim(),
        kennung: (name.match(/^(\+\+|\+|\*)/) || [""])[0],
        eintritt,
        austritt,
        einheiten: zahl(werte[SP.einheiten]),
        fgAbger: zahl(werte[SP.fgAbger]),
        gesamt: zahl(werte[SP.gesamt]),
        auftraege: zahl(werte[SP.auftraege]),
      };
      if (istSumme) {
        if (/mit\s*TL/i.test(r.t.map((s) => s.t).join(" "))) summeMitTL = rec;
        else if (/ohne\s*TL/i.test(r.t.map((s) => s.t).join(" "))) summeOhneTL = rec;
        else summeMitTL = summeMitTL || rec;
      } else reihen.push(rec);
    });
    return {
      von: per ? datum(per[1]) : null,
      bis: per ? datum(per[2]) : null,
      monat: monat ? monat[1].trim() : "",
      eigeneDK: eigeneDK ? eigeneDK[1] : null,
      reihen,
      summeMitTL,
      summeOhneTL,
    };
  }

  /*
   * ---------- Monatsdetails (Beta 1.9) ----------
   * Die Seiten liegen nicht in fester Reihenfolge – jede Angabe wird über ihre
   * Beschriftung gesucht, auf allen Seiten:
   *  · Zusammenfassung: „Festgebietsprämie“ (Prämien), „Summe Einkommen“,
   *    „MwSt. aus Abrechnungszeitraum“, „Sonstige Einkünfte / Belastungen /
   *    Saldovortrag“, „Überweisung Bankkonto / Saldo“ – jeweils der erste
   *    Betrag rechts der Beschriftung (Spalte „Monat“).
   *  · Anlage 1 (Kundenaufträge): Zeilen mit Buchungsereignis „AE Int/…“
   *    (online) und „AE Ser/…“ (Shop) → Spalten „FESTGEBIET Wertung
   *    Umsatz(EUR)“ und „KONTAKT 5 % Provi(EUR)“; dazu der Satz der
   *    Festgebietsprämie aus „Festgebietsprämie 4% von …“.
   * Beträge mit nachgestelltem Minus („3.080,21-“) sind negativ.
   */
  const BETRAG = /^-?[\d.]+,\d{2}-?$/;
  const betrag = (t) => {
    const s = String(t || "").trim();
    const neg = /-$/.test(s) || /^-/.test(s);
    const n = zahl(s.replace(/-/g, ""));
    return Math.round((neg ? -n : n) * 100) / 100;
  };
  const cent = (n) => Math.round(n * 100) / 100;
  function detailsAuswerten(seiten) {
    const d = {
      onlineShop: { umsatz: 0, kontakt: 0, posten: 0 },
      fgSatz: null,
      einkommen: null,
      fgPraemie: null,
      mwst: null,
      sonstige: null,
      ueberweisung: null,
    };
    const LABEL = [
      ["einkommen", /^Summe Einkommen$/],
      ["mwst", /^MwSt\. aus Abrechnungszeitraum/],
      ["sonstige", /^Sonstige Einkünfte/],
      ["ueberweisung", /^Überweisung Bankkonto/],
      ["fgPraemie", /^Festgebietsprämie$/],
    ];
    for (const items of seiten) {
      const z = zeilen(items);
      for (const r of z) {
        const lab = r.t[0].t;
        LABEL.forEach(([feld, re]) => {
          if (d[feld] !== null || !re.test(lab)) return;
          const w = r.t.slice(1).find((s) => BETRAG.test(s.t));
          if (w) d[feld] = betrag(w.t);
        });
        if (d.fgSatz === null) {
          const m = /Festgebietsprämie\s+(\d+(?:,\d+)?)\s*%/.exec(r.t.map((s) => s.t).join(" "));
          if (m) d.fgSatz = zahl(m[1]);
        }
      }
      /* Tabelle der Anlage 1 */
      const kopf = z.find((r) => r.t.some((s) => /^Buchungsereignis$/.test(s.t)) && r.t.some((s) => /Provi\(EUR\)/.test(s.t)));
      if (!kopf) continue;
      const mitte = (s) => (s.x + s.x2) / 2;
      const ev = kopf.t.find((s) => /^Buchungsereignis$/.test(s.t));
      const fg = kopf.t.find((s) => /^Umsatz\(EUR\)$/.test(s.t));
      /* „KONTAKT“ steht eine Kopfzeile höher; die Provi-Spalte darunter ist die richtige */
      const ober = z.filter((r) => r.y > kopf.y && r.y - kopf.y < 40);
      const kontaktKopf = ober.map((r) => r.t.find((s) => /^KONTAKT$/i.test(s.t))).find(Boolean);
      const provis = kopf.t.filter((s) => /Provi\(EUR\)/.test(s.t));
      const kontakt = kontaktKopf
        ? provis.reduce((a, b) => (Math.abs(mitte(b) - mitte(kontaktKopf)) < Math.abs(mitte(a) - mitte(kontaktKopf)) ? b : a))
        : provis[0];
      if (!ev || !fg || !kontakt) continue;
      const spalten = kopf.t.map((s) => ({ s, m: mitte(s) }));
      const spalteVon = (s) => spalten.reduce((a, b) => (Math.abs(b.m - mitte(s)) < Math.abs(a.m - mitte(s)) ? b : a)).s;
      z.filter((r) => r.y < kopf.y).forEach((r) => {
        const e = r.t.find((s) => s.x >= ev.x - 12 && s.x <= ev.x2 + 12 && /^\*?AE\s+(Int|Ser)\b/i.test(s.t));
        if (!e) return;
        d.onlineShop.posten++;
        r.t.forEach((s) => {
          if (!BETRAG.test(s.t) || s.x < ev.x2) return;
          const k = spalteVon(s);
          if (k === fg) d.onlineShop.umsatz += betrag(s.t);
          else if (k === kontakt) d.onlineShop.kontakt += betrag(s.t);
        });
      });
    }
    const os = d.onlineShop;
    os.umsatz = cent(os.umsatz);
    os.kontakt = cent(os.kontakt);
    /* Festgebietsprämie auf den Festgebiets-Umsatz dieser Aufträge – so rechnet auch die Abrechnung */
    os.praemie = d.fgSatz !== null ? cent((os.umsatz * d.fgSatz) / 100) : 0;
    os.provision = cent(os.kontakt + os.praemie);
    os.anteil = d.einkommen ? Math.round((os.provision / d.einkommen) * 1000) / 10 : null;
    return d;
  }

  /* Berufseinsteiger: höchstens 52 Wochen dabei am letzten Tag der Abrechnung */
  function istEinsteiger(eintritt, bis) {
    if (!eintritt || !bis) return false;
    const tage = Math.round((Date.parse(bis) - Date.parse(eintritt)) / 864e5);
    return tage >= 0 && tage <= 52 * 7;
  }

  /* Gesamtauswertung für eine DK-Nummer */
  function abrechnungAuswerten(seite, dk) {
    const eigen = seite.reihen.find((r) => dkNorm(r.dk) === dkNorm(dk));
    const team = seite.reihen.filter((r) => dkNorm(r.dk) !== dkNorm(dk));
    /* Berufseinsteiger: alle Zeilen der Tabelle – die eigene zählt mit, wenn sie die Bedingung erfüllt */
    const einsteiger = seite.reihen.filter((r) => istEinsteiger(r.eintritt, seite.bis));
    const teamNetto = seite.summeMitTL ? seite.summeMitTL.gesamt : seite.reihen.reduce((n, r) => n + r.gesamt, 0);
    return {
      von: seite.von,
      bis: seite.bis,
      monat: seite.monat,
      gefunden: !!eigen,
      eigen: eigen
        ? {
            einheiten: abrunden(eigen.einheiten),
            umsatz: abrunden(eigen.gesamt),
            auftraege: abrunden(eigen.auftraege),
            fgAbger: abrunden(eigen.fgAbger),
          }
        : null,
      mitTeam: team.length > 0,
      team: {
        netto: abrunden(teamNetto),
        einsteiger: abrunden(einsteiger.reduce((n, r) => n + r.gesamt, 0)),
        einsteigerNamen: einsteiger.map((r) => (r.kennung || "") + r.name),
      },
      reihen: seite.reihen,
    };
  }

  /* Ganze PDF lesen (pdf.js); gibt die Seite mit der Tabelle ausgewertet zurück */
  async function pdfAuslesen(datei, dk) {
    if (!global.pdfjsLib) throw new Error("Der PDF-Leser ist nicht geladen.");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdf.worker.start.mjs", document.baseURI).href;
    const daten = new Uint8Array(await datei.arrayBuffer());
    const aufgabe = pdfjsLib.getDocument({ data: daten, isEvalSupported: false, disableFontFace: true, verbosity: 0 });
    const doc = await aufgabe.promise;
    const alle = [];
    let treffer = null;
    try {
      for (let p = 1; p <= doc.numPages; p++) {
        const seite = await doc.getPage(p);
        const tc = await seite.getTextContent();
        alle.push(tc.items);
        if (!treffer) {
          const s = seiteAuswerten(tc.items);
          if (s && s.reihen.length) treffer = { seite: p, ...abrechnungAuswerten(s, dk) };
        }
      }
    } finally {
      aufgabe.destroy();
    }
    if (treffer) return { ...treffer, details: detailsAuswerten(alle) };
    throw new Error("In dieser PDF wurde keine Leistungsübersicht mit „Partner-Nr“ gefunden.");
  }

  global.abrechnungsLeser = { seiteAuswerten, abrechnungAuswerten, detailsAuswerten, istEinsteiger, abrunden, pdfAuslesen };
  if (typeof module !== "undefined") module.exports = global.abrechnungsLeser;
})(typeof window !== "undefined" ? window : globalThis);
