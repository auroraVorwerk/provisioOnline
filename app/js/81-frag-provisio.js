/**
 * „Frag Provisio“ – Assistent (Beta 1.9)
 *
 * Keine echte KI und keine Verbindung nach außen: Die Frage wird auf dem Gerät
 * in Wörter zerlegt, mit Begriffsgruppen verglichen (Synonyme, Umgangssprache,
 * kleine Tippfehler) und einer hinterlegten Frage zugeordnet. Die Antwort wird
 * aus den eigenen Daten berechnet. Zeitangaben („heute“, „morgen“, „letzte
 * Woche“, „im Oktober“, „KW 44“, „am 12.11.“), Namen, Kobold-Modelle und
 * Fehlercodes werden erkannt. Weiß der Assistent etwas nicht, sagt er das.
 * Folgefragen wie „und letzte Woche?“ beziehen sich auf die vorige Frage.
 */
(function () {
  "use strict";

  /* ---------- Text aufbereiten ---------- */
  const normal = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[‹›”’"'`´]/g, " ")
      .replace(/[^a-z0-9.+\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const woerter = (s) =>
    normal(s)
      .replace(/[.\-]+(?=\s|$)/g, " ")
      .split(" ")
      .filter(Boolean);
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  /* Passt ein Wort der Frage zu einem Begriff? (gleich, Wortanfang, Tippfehler) */
  function passt(t, w) {
    if (t === w) return true;
    if (w.length >= 4 && t.startsWith(w)) return true;
    if (w.length >= 6 && t.length >= 6 && w.startsWith(t)) return true;
    if (w.length >= 5 && t.length >= 4 && lev(t, w) <= 1) return true;
    if (w.length >= 8 && lev(t, w) <= 2) return true;
    return false;
  }

  /* ---------- Begriffsgruppen ---------- */
  const G = {
    termin: "termin termine kundentermin vorfuehrung vorfuehrungen besuch besuche demo praesentation kundenbesuch",
    frei: "frei freie zeit luecke platz verfuegbar unterbringen einplanen reinbekommen reinschieben slot dazwischen",
    naechst: "naechste naechster naechsten kommende demnaechst bald",
    anzahl: "viele viel wieviele wieviel anzahl oft zahl",
    plan: "ansteht anstehen steht programm plan geplant tagesplan agenda erwartet los vor",
    nachb: "nachbereiten nachbereitung nachbereitet abschliessen offen offene",
    wv: "wiedervorlage wiedervorlagen faellig nachfassen zurueckrufen melden anrufen",
    umsatz: "umsatz umsaetze verkauft verkaeufe geschrieben netto verkauf",
    prov: "provision provisionen verdiene verdient verdienen einkommen geld bekomme kriege auszahlung kohle",
    ueberw: "ueberweisung ueberwiesen ausgezahlt bankkonto abrechnung",
    ziel: "fehlt fehlen noch schaffe schaffen erreichen erreiche reicht brauche brauch",
    provziel: "provisionsziel wunscheinkommen provisionswunsch wunsch ziel",
    vergl: "vergleich verglichen gegenueber besser schlechter lief",
    club: "club excellence",
    nadel: "nadel goldene signet brillant brillanten smaragd",
    anm: "anmeldung anmeldungen qualifiziert qualifizierte qualifizierten jobticket jobtickets",
    einheit: "einheit einheiten geraete stueck",
    zuletzt: "zuletzt letzte letztes letzten wann",
    pot: "potenzial potential potenzialliste lange gehoert kontaktiert gemeldet",
    empf: "empfehlung empfehlungen empfohlen",
    team: "team teammitglied teammitglieder berater mitarbeiter leute",
    gemeldet: "gemeldet meldung wochenmeldung abgegeben",
    nicht: "nicht noch kein keine",
    k70: "k70 nachbestellen bestellen kofferraum inventur bestand auffuellen artikel mustheave musthave",
    km: "kilometer km gefahren fahrten fahrtenbuch strecke",
    besser: "besser verbessern schwaeche schwaechen schwach hapert woran worin problem tipp tipps verbesserung",
    fgb: "fgb festgebietsbegehung begehung tuer tueren klingeln haustuer",
    promo: "promo promotion promotions messe infostand",
    quote: "quote quoten abschluss abschlussquote trichter",
    hilfe: "anlegen erstellen eintragen einrichten finde funktioniert geht mache hilfe erklaer erklaere zeig loeschen aendern",
    geraet: "staubsauger sauger kobold roboter saugroboter akku buerste elektrobuerste saugwischer fensterreiniger geraet polsterbuerste ladegeraet",
    code: "fehlercode fehler error code meldung meldet zeigt anzeige blinkt",
    rep: "reparatur repariert reparieren kaputt defekt werkstatt service einschicken retten",
    kosten: "kostet kosten preis teuer euro",
    update: "update software firmware aktualisieren",
    hallo: "hallo hi hey moin servus guten",
    danke: "danke dankeschoen super perfekt",
    koennen: "kannst kann weisst",
    vorfuehr: "vorfuehrung vorfuehrungen vorgefuehrt",
    garantie: "garantie gewaehrleistung gewaehrleistungsfall",
    service: "reparaturservice kundenservice telefon telefonnummer nummer kontakt adresse einschicken schicken dauert dauer leihgeraet abholen versand ablauf",
    teil: "rundbuerste filter motorschutzfilter staubbehaelter seitenbuerste ladegeraet serviceset ersatzteil buerstenabdeckung ca7 sc7",
    diagnose: "diagnose vorgehen pruefen fehlersuche",
  };
  const GW = {};
  Object.keys(G).forEach((k) => (GW[k] = G[k].split(" ")));
  function hat(tok, gruppe) {
    return tok.some((t) => GW[gruppe].some((w) => passt(t, w)));
  }

  /* ---------- Zeit erkennen ---------- */
  const TAGE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
  const MONATE = ["januar", "februar", "maerz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
  const heuteD = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const tagDk = (d) => dk(d);
  const plus = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const wocheVon = (d) => {
    const m = mondayOf(d);
    return { von: dk(m), bis: dk(plus(m, 6)), art: "woche" };
  };
  const vmZeit = (d, label) => {
    const vm = vertriebsmonat(d);
    return { von: vm.fromK, bis: vm.toK, art: "monat", vm, label };
  };
  const wochentag = (d) => d.toLocaleDateString("de-DE", { weekday: "long" });
  const datumLang = (d) => d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  function zeitErkennen(roh) {
    const s = " " + normal(roh) + " ";
    const h = heuteD();
    let m;
    if (/ uebermorgen /.test(s)) return { von: dk(plus(h, 2)), bis: dk(plus(h, 2)), art: "tag", label: "übermorgen" };
    if (/ morgen /.test(s) && !/ morgens? frueh /.test(s)) return { von: dk(plus(h, 1)), bis: dk(plus(h, 1)), art: "tag", label: "morgen" };
    if (/ vorgestern /.test(s)) return { von: dk(plus(h, -2)), bis: dk(plus(h, -2)), art: "tag", label: "vorgestern" };
    if (/ gestern /.test(s)) return { von: dk(plus(h, -1)), bis: dk(plus(h, -1)), art: "tag", label: "gestern" };
    if (/ heute /.test(s)) return { von: dk(h), bis: dk(h), art: "tag", label: "heute" };
    if ((m = / (\d{1,2})\.(\d{1,2})\.?(\d{2,4})? /.exec(s))) {
      const j = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : h.getFullYear();
      const d = new Date(j, +m[2] - 1, +m[1]);
      if (!isNaN(d)) return { von: dk(d), bis: dk(d), art: "tag", label: "am " + fmt(d) };
    }
    if ((m = / kw ?(\d{1,2}) /.exec(s)) || (m = / kalenderwoche (\d{1,2}) /.exec(s))) {
      const mo = mondayOfISOWeek(isoWeek(h).year, +m[1]);
      return { von: dk(mo), bis: dk(plus(mo, 6)), art: "woche", label: "in KW " + m[1] };
    }
    for (let i = 0; i < 7; i++) {
      if (new RegExp(" " + TAGE[i] + "s? ").test(s)) {
        let d = new Date(h);
        const zurueck = / (letzten|letzter|vergangenen|letztem) /.test(s);
        if (zurueck) {
          do d = plus(d, -1);
          while (d.getDay() !== i);
        } else while (d.getDay() !== i) d = plus(d, 1);
        if (/ naechsten /.test(s) && d.getTime() === h.getTime()) d = plus(d, 7);
        return { von: dk(d), bis: dk(d), art: "tag", label: "am " + TAGE[i].charAt(0).toUpperCase() + TAGE[i].slice(1) };
      }
    }
    if (/ (letzte|letzten|vorige|vorigen|vergangene|vergangenen) woche /.test(s)) return { ...wocheVon(plus(h, -7)), label: "letzte Woche" };
    if (/ (naechste|naechsten|kommende|kommenden) woche /.test(s)) return { ...wocheVon(plus(h, 7)), label: "nächste Woche" };
    if (/ (diese|dieser|diesen|laufende|aktuelle|der) woche /.test(s) || / woche /.test(s)) return { ...wocheVon(h), label: "diese Woche" };
    for (let i = 0; i < 12; i++) {
      const re = new RegExp(" (im |in |fuer |vom )?" + MONATE[i] + " ?(\\d{4})? ");
      if ((m = re.exec(s))) {
        let j = m[2] ? +m[2] : h.getFullYear();
        if (!m[2] && i > h.getMonth()) j--;
        const d = new Date(j, i, 15);
        return vmZeit(d, (m[1] ? "im " : "") + MONATE[i].replace("ae", "ä").replace(/^./, (c) => c.toUpperCase()) + (m[2] ? " " + m[2] : ""));
      }
    }
    if (/ (letzten|letzter|vorigen|vergangenen|vormonat) (vertriebs)?monat /.test(s) || / vormonat /.test(s)) {
      const vm = vertriebsmonat(h);
      return vmZeit(plus(vm.from, -1), "im letzten Vertriebsmonat");
    }
    if (/ (naechsten|kommenden) (vertriebs)?monat /.test(s)) {
      const vm = vertriebsmonat(h);
      return vmZeit(plus(vm.to, 1), "im nächsten Vertriebsmonat");
    }
    if (/ (vertriebs)?monat /.test(s)) return vmZeit(h, "in diesem Vertriebsmonat");
    if (/ (letztes|letzten|vorjahr|vergangenes) jahr /.test(s) || / vorjahr /.test(s)) {
      const j = isoWeek(h).year - 1;
      return { ...jahrZeit(j), label: "im Vertriebsjahr " + j };
    }
    if ((m = / (20\d\d) /.exec(s))) return { ...jahrZeit(+m[1]), label: "im Vertriebsjahr " + m[1] };
    if (/ jahr /.test(s)) {
      const j = isoWeek(h).year;
      return { ...jahrZeit(j), label: "im Vertriebsjahr " + j };
    }
    return null;
  }
  function jahrZeit(j) {
    const von = mondayOfISOWeek(j, 1);
    const bis = plus(mondayOfISOWeek(j + 1, 1), -1);
    return { von: dk(von), bis: dk(bis), art: "jahr", jahr: j };
  }
  /* zwei Monate für Vergleiche („Oktober und September“) */
  function monateErkennen(roh) {
    const s = " " + normal(roh) + " ";
    const h = heuteD();
    const treffer = [];
    MONATE.forEach((n, i) => {
      const p = s.indexOf(" " + n);
      if (p >= 0) {
        let j = h.getFullYear();
        if (i > h.getMonth()) j--;
        treffer.push({ p, z: vmZeit(new Date(j, i, 15), n.replace("ae", "ä").replace(/^./, (c) => c.toUpperCase())) });
      }
    });
    return treffer.sort((a, b) => a.p - b.p).map((t) => t.z);
  }

  /* ---------- Namen erkennen ---------- */
  function personen() {
    const l = [];
    const add = (vor, nach, quelle, ref) => {
      if (!nach && !vor) return;
      l.push({ vor: vor || "", nach: nach || "", nv: normal(vor), nn: normal(nach), quelle, ref });
    };
    Object.keys(entries).forEach((k) => {
      const e = entries[k];
      if (["kunde", "premium", "abholen"].includes(e.kind)) add(e.vorname, e.nachname, "termin", k);
    });
    potenzial.forEach((p) => add(p.vorname, p.nachname, "potenzial", p));
    empfehlungen.forEach((p) => add(p.vorname, p.nachname, "empfehlung", p));
    interessenten.forEach((p) => add(p.vorname, p.nachname, "interessent", p));
    if (typeof teamManuell === "function")
      teamManuell().forEach((m) => {
        const t = String(m.name || "").split(" ");
        add(t[0], t.slice(1).join(" "), "team", m);
      });
    return l;
  }
  const STOPP = new Set("ich mir mich du wann war wie was wer wo bei der die das den dem ein eine einen und oder noch zuletzt familie frau herr herrn hat haben habe ist sind im in am an zum zur von mit fuer aus auf termin kunde kundin team".split(" "));
  function personErkennen(roh) {
    const tok = woerter(roh).filter((t) => t.length >= 3 && !STOPP.has(t));
    if (!tok.length) return null;
    const alle = personen();
    let best = null;
    alle.forEach((p) => {
      let sc = 0;
      tok.forEach((t) => {
        if (p.nn && (t === p.nn || (p.nn.length >= 5 && lev(t, p.nn) <= 1))) sc += 3;
        else if (p.nv && t === p.nv) sc += 2;
      });
      if (sc && (!best || sc > best.sc)) best = { ...p, sc };
    });
    return best;
  }

  /* ---------- Kobold-Modelle und Fehlercodes ---------- */
  const ALIAS = { tiger270: "vt270", tiger265: "vt265", tiger260: "vt260" };
  function modellErkennen(roh) {
    const s = normal(roh).replace(/\s+(?=\d)/g, "");
    let m = /\b(vk|vb|vr|vt|ebb|eb|spb|sp|pbb|pb|hd|fk|vg|mp|mr|sb|vf|vc|vm|rb|sc|ca|fd|ess)(\d{1,3})(\+)?/.exec(s);
    let code;
    if (m) code = m[1] + m[2] + (m[3] || "");
    else if ((m = /\btiger(\d{3})?\b/.exec(s))) code = "tiger" + (m[1] || "");
    else if ((m = /\bkobold(1[1-5]\d|200)\b/.exec(s))) code = "vk" + m[1];
    else return null;
    const W = KOBOLD_WISSEN;
    let fam = Object.keys(W.FAM).find((f) => W.FAM[f].modelle.includes(code)) || null;
    if (!fam && code === "vg100+") fam = "vg";
    const basis = ALIAS[code] || code;
    return { code: basis, fam, anzeige: code.toUpperCase().replace("TIGER", "Tiger ") };
  }
  function fehlercodeErkennen(roh) {
    const s = " " + normal(roh) + " ";
    let m = / (?:error|err|er|fehler|fehlercode|code|meldung|nummer|e)\s?-?0?(\d{1,4}) /.exec(s);
    if (m) return +m[1];
    m = / (\d{4}) /.exec(s);
    if (m && !/ 20[2-3]\d /.test(" " + m[1] + " ")) return +m[1];
    return null;
  }

  /* ---------- Hilfen für Antworten ---------- */
  const esc = (t) => entschaerfeText(String(t == null ? "" : t));
  const euro = (n) => Math.round(n || 0).toLocaleString("de-DE") + " €";
  const geld2 = (n) => (n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const prozent = (a, b) => (b ? Math.round((a / b) * 100) + " %" : "–");
  const uhr = (e, h) => e.start || pad(h) + ":00";
  const wer = (e) => [e.vorname, e.nachname].filter(Boolean).join(" ");
  const ARBEIT = ["kunde", "premium", "terminieren", "abholen", "eigenkauf", "d2d", "meeting"];
  function eintraegeAm(tag) {
    return Object.keys(entries)
      .filter((k) => k.split("|")[0] === tag)
      .map((k) => ({ k, h: +k.split("|")[1], e: entries[k] }))
      .sort((a, b) => (toDec(uhr(a.e, a.h)) || a.h) - (toDec(uhr(b.e, b.h)) || b.h));
  }
  function beschreibe(x) {
    const e = x.e;
    const l = label(e);
    const art =
      e.kind === "kunde"
        ? "Kundentermin"
        : e.kind === "premium"
          ? "Premium CheckIn"
          : e.kind === "terminieren"
            ? l.t1
            : e.kind === "meeting"
              ? e.art || "Meeting"
              : e.kind === "privat"
                ? "Privat"
                : l.t1 || e.kind;
    const name = ["kunde", "premium", "abholen"].includes(e.kind) ? wer(e) : "";
    return `${uhr(e, x.h)} Uhr · ${esc(art)}${name ? " · " + esc(name) : ""}${e.ort && e.kind === "kunde" ? " (" + esc(e.ort) + ")" : ""}`;
  }
  const liste = (zeilen, max = 8) =>
    zeilen.length
      ? "<ul>" + zeilen.slice(0, max).map((z) => `<li>${z}</li>`).join("") + "</ul>" + (zeilen.length > max ? `<p class="fpklein">… und ${zeilen.length - max} weitere</p>` : "")
      : "";
  const knopf = (text, hash) => ({ text, hash });

  /* Netto-Umsatz, Einheiten, Aufträge in einem Zeitraum (wie im Jahresrückblick) */
  function zahlen(von, bis) {
    const u = umsatz(von, bis);
    let einheiten = 0,
      auftraege = 0,
      vorgefuehrt = 0,
      stattgefunden = 0,
      termine = 0;
    Object.keys(entries).forEach((k) => {
      const e = entries[k],
        n = e.nb;
      const tag = k.split("|")[0];
      if (["kunde", "premium"].includes(e.kind) && tag >= von && tag <= bis) {
        termine++;
        if (e.status === "stattgefunden") stattgefunden++;
        if (n && (n.vorgefuehrt || []).length) vorgefuehrt++;
      }
      if (!n || n.fremd === "Ja") return;
      const at = abrechnungsTag(tag, n);
      if (at < von || at > bis) return;
      einheiten += +n.einheiten || 0;
      if (n.verkauft === "Ja") auftraege++;
    });
    return { netto: netto(u.fg + u.wg + u.k70ein), fg: netto(u.fg), wg: netto(u.wg), einheiten, auftraege, vorgefuehrt, stattgefunden, termine, u };
  }
  /* Vertriebsmonat inkl. nachgetragener Zahlen (aus jahresUebersicht) */
  function monatZeile(vm) {
    return jahresUebersicht(vm.year).find((z) => z.startW === vm.startW) || null;
  }

  /* Freie Zeitfenster eines Tages (Arbeitstag 8–21 Uhr, Kundentermin ~2 Stunden) */
  function freieFenster(tag, mindest = 2) {
    const belegt = [];
    eintraegeAm(tag).forEach((x) => {
      const e = x.e;
      const a = toDec(e.start || e.von || "") || x.h;
      let b = toDec(e.bis || e.ende || "") || 0;
      if (!b || b <= a) b = a + (e.kind === "kunde" ? 2 : e.kind === "terminieren" || e.kind === "d2d" ? 2 : 1);
      if ((e.kind === "privat" || e.kind === "individuell") && e.bisTag && e.bisTag > tag) b = 24;
      belegt.push([a, b]);
    });
    Object.keys(entries).forEach((k) => {
      const [d] = k.split("|"),
        e = entries[k];
      if (e && ["privat", "individuell"].includes(e.kind) && e.bisTag && tag > d && tag <= e.bisTag) belegt.push([0, 24]);
    });
    belegt.sort((x, y) => x[0] - y[0]);
    const start = tag === dk(new Date()) ? Math.max(8, Math.ceil((new Date().getHours() + new Date().getMinutes() / 60) * 4) / 4) : 8;
    const ende = 21;
    const frei = [];
    let t = start;
    belegt.forEach(([a, b]) => {
      if (a > t && Math.min(a, ende) - t >= mindest) frei.push([t, Math.min(a, ende)]);
      t = Math.max(t, b);
    });
    if (ende - t >= mindest) frei.push([t, ende]);
    return frei;
  }
  const hm = (d) => `${Math.floor(d)}:${pad(Math.round((d % 1) * 60))}`;

  /* Trichter: letzte 4 Wochen gegen die 8 Wochen davor */
  function trichter(art) {
    const jetzt = quoten(4),
      davor12 = quoten(12);
    const sub = (a, b, f) => (f(b) - f(a)) || 0;
    if (art === "fgb") {
      const a = jetzt.fgb,
        g = davor12.fgb;
      const vor = { tueren: g.tueren - a.tueren, erreicht: g.erreicht - a.erreicht, termine: g.termine - a.termine, n: g.n - a.n };
      return {
        n: a.n,
        nVor: vor.n,
        stufen: [
          { name: "Türen → erreicht", jetzt: [a.erreicht, a.tueren], vor: [vor.erreicht, vor.tueren], tipp: "Mehr Menschen antreffen: andere Uhrzeiten testen (später Nachmittag, früher Abend, Samstag) und Straßen mit vielen Häusern wählen." },
          { name: "erreicht → Termin", jetzt: [a.termine, a.erreicht], vor: [vor.termine, vor.erreicht], tipp: "Mehr Termine aus Gesprächen: Einstieg kürzer machen, sofort zwei konkrete Terminvorschläge anbieten, Einwände vorher üben." },
        ],
        sub,
      };
    }
    if (art === "promo") {
      const a = jetzt.promo,
        g = davor12.promo;
      const vor = { ansprachen: g.ansprachen - a.ansprachen, gespraeche: g.gespraeche - a.gespraeche, termine: g.termine - a.termine, n: g.n - a.n };
      return {
        n: a.n,
        nVor: vor.n,
        stufen: [
          { name: "Ansprachen → Gespräche", jetzt: [a.gespraeche, a.ansprachen], vor: [vor.gespraeche, vor.ansprachen], tipp: "Mehr Gespräche: aktiver ansprechen, offene Einstiegsfrage statt Angebot, Standplatz im Laufweg." },
          { name: "Gespräche → Termin", jetzt: [a.termine, a.gespraeche], vor: [vor.termine, vor.gespraeche], tipp: "Mehr Termine: früher nach dem Termin fragen, Kalender sofort zeigen, Kontakt mit Vorteil für den Kunden verbinden." },
        ],
      };
    }
    const a = jetzt.termine,
      g = davor12.termine;
    const vor = { stattgefunden: g.stattgefunden - a.stattgefunden, vorgefuehrt: g.vorgefuehrt - a.vorgefuehrt, verkauft: g.verkauft - a.verkauft, gesamt: g.gesamt - a.gesamt };
    return {
      n: a.gesamt,
      nVor: vor.gesamt,
      stufen: [
        { name: "Termine → stattgefunden", jetzt: [a.stattgefunden, a.gesamt], vor: [vor.stattgefunden, vor.gesamt], tipp: "Weniger Absagen: Termin am Vortag bestätigen und beim Vereinbaren einen klaren Nutzen nennen." },
        { name: "stattgefunden → vorgeführt", jetzt: [a.vorgefuehrt, a.stattgefunden], vor: [vor.vorgefuehrt, vor.stattgefunden], tipp: "Häufiger vorführen: das Gerät immer in die Hand geben, auch wenn der Kunde „nur schauen“ will." },
        { name: "vorgeführt → verkauft", jetzt: [a.verkauft, a.vorgefuehrt], vor: [vor.verkauft, vor.vorgefuehrt], tipp: "Mehr Abschlüsse: Bedarf vor der Vorführung klären, Finanzierung früh anbieten, am Ende klar fragen." },
      ],
    };
  }
  function trichterAntwort(art, titel) {
    const t = trichter(art);
    if (!t.n && !t.nVor) return { text: `Für ${titel} habe ich in den letzten 12 Wochen noch keine Einträge mit Nachbereitung gefunden. Sobald du welche nachbereitest, kann ich dir sagen, wo es hakt.` };
    const q = (x) => (x[1] ? x[0] / x[1] : null);
    let schwach = null;
    const zeilen = t.stufen.map((s) => {
      const j = q(s.jetzt),
        v = q(s.vor);
      const diff = j !== null && v !== null ? Math.round((j - v) * 100) : null;
      const pfeil = diff === null ? "" : diff > 2 ? ` <span class="fpgut">▲ ${diff} Pkt.</span>` : diff < -2 ? ` <span class="fpschlecht">▼ ${-diff} Pkt.</span>` : " · gleich";
      const wert = j === null ? (v === null ? 0 : v) : j;
      if (j !== null || v !== null) if (!schwach || wert - (diff || 0) / 200 < schwach.wert) schwach = { s, wert, diff };
      return `<b>${s.name}:</b> ${j === null ? "–" : Math.round(j * 100) + " %"} <span class="fpklein">(${s.jetzt[0]} von ${s.jetzt[1]}, letzte 4 Wochen)</span>${pfeil}`;
    });
    /* die schwächste Stufe: niedrigste Quote, bei Gleichstand die mit dem größten Rückgang */
    let fazit = "";
    const sortiert = t.stufen
      .map((s) => ({ s, j: q(s.jetzt) ?? q(s.vor), d: q(s.jetzt) !== null && q(s.vor) !== null ? q(s.jetzt) - q(s.vor) : 0 }))
      .filter((x) => x.j !== null);
    if (sortiert.length) {
      const fallend = sortiert.filter((x) => x.d < -0.05).sort((a, b) => a.d - b.d)[0];
      const ziel = fallend || sortiert.sort((a, b) => a.j - b.j)[0];
      fazit = `<p><b>Hier lohnt es sich am meisten: ${ziel.s.name}.</b> ${fallend ? "Diese Quote ist gegenüber den Wochen davor gefallen. " : "Das ist deine niedrigste Quote. "}${ziel.s.tipp}</p>`;
    }
    return { text: `<p>${titel} – deine Quoten:</p>${liste(zeilen)}${fazit}<p class="fpklein">Verglichen mit deinen eigenen 8 Wochen davor. Grundlage sind deine Nachbereitungen.</p>`, knoepfe: [knopf("Auswertungen öffnen", "auswertungen")] };
  }

  /* ---------- Hilfe zur Bedienung ---------- */
  const HILFE = [
    { w: "serientermin serie wiederkehrend jede woche wiederholen", t: "Serientermin anlegen", a: "Im Planer ein freies Feld antippen, „Privat“ oder „Individuell“ wählen und unter „Wiederholen“ z. B. „jede Woche“ einstellen. Löschen kannst du später nur diesen oder alle folgenden Termine.", h: "planer" },
    { w: "urlaub krank abwesend schulung frei mehrtaegig", t: "Urlaub eintragen", a: "Im Planer ein Feld antippen → „Privat“ → Art „Urlaub“ (oder Krank, Schulung, Frei) und bei „bis“ den letzten Tag wählen. Der ganze Zeitraum färbt sich orange.", h: "planer" },
    { w: "kundentermin termin anlegen neuer eintragen", t: "Kundentermin anlegen", a: "Im Planer auf ein freies Feld tippen → „Kundentermin“ → Quelle wählen → Name und Adresse eintragen → Speichern.", h: "planer" },
    { w: "nachbereitung nachbereiten wie lief", t: "Nachbereitung", a: "Termin im Planer öffnen → „Wie lief es?“. Mit „Schritt für Schritt“ führt dich Provisio durch alle Fragen. Offene Nachbereitungen stehen auf „Heute“.", h: "heute" },
    { w: "wochenmeldung kopieren whatsapp senden melden", t: "Wochenmeldung", a: "Unter Auswertungen → „Wochenmeldung kopieren“. Der Text landet in der Zwischenablage und kann direkt in WhatsApp eingefügt werden.", h: "auswertungen" },
    { w: "sicherung sichern export backup daten speichern", t: "Daten sichern", a: "Einstellungen → Daten → „Daten sichern“. Es entsteht die verschlüsselte Datei „Provisio-Sicherung.json“. Zum Zurückholen: „Sicherung einspielen“ mit Passwort oder Wiederherstellungs-Code.", h: "profil" },
    { w: "pdf abrechnung uebernehmen importieren hochladen", t: "Abrechnung als PDF übernehmen", a: "Jahresrückblick → „Aus Abrechnung (PDF) übernehmen“. Provisio liest deine Zahlen und die Monatsdetails. Danach einen Monat antippen, um alles zu sehen.", h: "jahr" },
    { w: "door to door d2d strichliste tuer", t: "Door to Door", a: "Einstellungen → Weitere Funktionen → „Door to Door Selling“ einschalten. Dann im Planer als Terminart wählen; die Strichliste zählt Türen, Gespräche, Vorführungen und Verkäufe.", h: "profil" },
    { w: "passwort aendern code wiederherstellungscode vergessen", t: "Passwort und Wiederherstellungs-Code", a: "Einstellungen → Sicherheit → „Passwort ändern“ oder „Neuer Wiederherstellungs-Code“. Ohne Passwort und Code lassen sich die Daten nicht öffnen – den Code gut aufbewahren.", h: "profil" },
    { w: "teammitglied team anlegen berater hinzufuegen", t: "Teammitglied anlegen", a: "Teammitglieder → „Ohne App anlegen“. Danach kannst du jede Woche die Meldung eintragen – auch nachträglich für den ganzen Vertriebsmonat.", h: "team" },
    { w: "inventur k70 bestand zaehlen mindestbestand", t: "K70-Inventur", a: "K70 Inventur öffnen und Artikel mit Plus und Minus zählen. Mit „Mindestbestand“ legst du fest, ab wann ein Artikel zum Nachbestellen erscheint; Must-have-Artikel schaltest du in den Einstellungen ein.", h: "inventur" },
    { w: "fahrt fahrtenbuch kilometer eintragen", t: "Fahrt eintragen", a: "Fahrtenbuch → „Fahrt eintragen“ mit km-Stand am Anfang und Ende. Provisio rechnet die Kilometer aus.", h: "fahrten" },
    { w: "ziel ziele provisionswunsch wunscheinkommen", t: "Provisionswunsch", a: "Unter „Provisionswunsch“ trägst du ein, was du verdienen willst. Provisio rechnet aus, wie viel Umsatz und wie viele Termine du dafür brauchst.", h: "wunsch" },
    { w: "einladung einladungscode online registrieren", t: "Einladungscode (Provisio Online)", a: "In Provisio Online: Einstellungen → Online-Konto → „Einladungscode erstellen“ und die DK-Nummer der Person eintragen. Der Code gilt einmal und 7 Tage.", h: "profil" },
  ];
  function hilfeSuchen(tok) {
    let best = null;
    HILFE.forEach((h) => {
      const w = h.w.split(" ");
      const sc = tok.filter((t) => t.length >= 4 && w.some((x) => passt(t, x))).length;
      if (sc && (!best || sc > best.sc)) best = { ...h, sc };
    });
    return best;
  }

  /* ---------- Kobold-Antworten ---------- */
  function koboldSuchen(tok, modell) {
    const W = KOBOLD_WISSEN;
    const kandidaten = W.F.filter((f) => f.fam === "alle" || !modell || !modell.fam || f.fam === modell.fam || (modell.fam === "hand" && f.fam === "boden"));
    let best = [];
    kandidaten.forEach((f) => {
      const w = (f.w + " " + normal(f.titel)).split(" ");
      let sc = 0;
      tok.forEach((t) => {
        if (t.length < 3 || /^(vk|vb|vr|vt|eb|sp|pb|vg)\d/.test(t)) return;
        if (w.some((x) => passt(t, x))) sc += t.length > 5 ? 2 : 1;
      });
      if (f.stopp && sc) sc += 1;
      if (sc) best.push({ f, sc });
    });
    best.sort((a, b) => b.sc - a.sc);
    return best.filter((b) => b.sc >= 2 && b.sc >= best[0].sc - 1).slice(0, 2).map((b) => b.f);
  }
  const famName = (f) => (f === "alle" ? "Alle Geräte" : KOBOLD_WISSEN.FAM[f].name);
  function koboldEintrag(f) {
    const W = KOBOLD_WISSEN;
    return `<div class="fpkob ${f.stopp ? "stopp" : f.stufe === "de" || f.stufe === "regio" ? "offiziell" : ""}"><b>${esc(famName(f.fam))} · ${esc(f.titel)}</b><span class="fpart">${f.stopp ? "⚠️ Nicht weiter benutzen" : W.STUFE[f.stufe]}</span>
      ${f.ursache ? `<p><i>Ursache:</i> ${esc(f.ursache)}</p>` : ""}<p><i>Was tun:</i> ${esc(f.massnahme)}</p></div>`;
  }
  const koboldFuss = () => `<p class="fpklein">Quelle: ${esc(KOBOLD_WISSEN.QUELLE)} – interne Arbeitshilfe. Preise und Fristen vor einer Kundenauskunft beim Reparaturservice gegenprüfen.</p>`;
  const preis = (n) => (n ? n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" : "kostenlos");
  function pauschaleVon(code) {
    return KOBOLD_WISSEN.PAUSCHALE.find((p) => p.m.includes(code)) || null;
  }
  function statusVon(code) {
    const st = KOBOLD_WISSEN.STATUS;
    if (!(code in st)) return null;
    const j = st[code];
    const jahr = new Date().getFullYear();
    if (j === null) return { art: "repariert", text: "wird repariert (kein Enddatum)" };
    if (j > jahr) return { art: "repariert", text: `wird repariert – bis ${j}` };
    if (j === jahr) return { art: "laeuft", text: `läuft aus – Reparatur nur noch ${j}, Stichtag beim Reparaturservice erfragen und Abgabe zeitnah anregen` };
    return { art: "eingestellt", text: `wird nicht mehr repariert (seit ${j})` };
  }
  function modellAusKontext(k) {
    if (k.modell) return k.modell;
    /* „eine Reparatur“, „allgemein“ = keine Folgefrage zum zuletzt genannten Gerät */
    if (/ (eine|einen|allgemein|generell|ueberhaupt) /.test(k.s)) return null;
    const c = k.ctx.modell;
    /* anderes Gerät angesprochen (z. B. „der Roboter“ nach einem VK) → kein Bezug */
    if (c && / (roboter|saugroboter) /.test(k.s) && !/^vr/.test(c.fam || "")) return null;
    if (c && / (fensterreiniger|flaechenreiniger) /.test(k.s) && c.fam !== "vg") return null;
    if (k.ctx.thema === "kobold" && k.ctx.modell) return k.ctx.modell;
    return null;
  }
  function antwortCode(k) {
    const W = KOBOLD_WISSEN;
    k.ctx.thema = "kobold";
    const m = modellAusKontext(k);
    if (m) k.ctx.modell = m;
    let tabelle = null;
    if (m && (m.fam === "vk7" || W.AM_VK7.includes(m.code))) tabelle = ["vk7"];
    else if (m && (m.fam === "vr7" || m.fam === "vr300")) tabelle = [m.fam];
    else if (m) {
      const extra = m.fam === "vb100" ? " Beim VB100 zeigen LEDs den Zustand: gelb = Filtertüte voll/Saugweg verstopft, rot blinkend = Störfall (erst Akku-Reset, dann Reparaturauftrag)." : m.fam === "vr200" ? " VR200/VR100 zeigen Klartext-Meldungen im Display – sag mir, was dort steht." : "";
      return { text: `Für ${esc(m.anzeige)} sind keine Zahlencodes veröffentlicht – deshalb rate ich keine Bedeutung für ${k.code}.${extra} Erste Schritte: stromlos machen, Verbrauchsteile prüfen, neu starten.` + koboldFuss(), chips: ["Kann der " + m.anzeige + " noch repariert werden?"] };
    } else tabelle = k.code >= 1000 ? ["vr7", "vr300"] : ["vk7"];
    const treffer = tabelle.map((t) => ({ t, c: W.CODES[t][k.code] })).filter((x) => x.c);
    if (!treffer.length) {
      const t = tabelle[0];
      return { text: `Code ${k.code} ist für ${esc(W.FAM[t].name)} nicht verifiziert. ${esc(W.CODE_LUECKE[t] || "")} Bitte Anzeige, Modell und Softwarestand notieren; bleibt der Fehler nach Reset → Reparaturauftrag.` + koboldFuss() };
    }
    const html = treffer
      .map(({ t, c }) => `<div class="fpkob ${c[2] === "luecke" || c[2] === "niedrig" ? "" : "offiziell"}"><b>${esc(W.FAM[t].name)} · Code ${k.code}</b><span class="fpart">${W.STUFE[c[2]]}</span><p><i>Bedeutung:</i> ${esc(c[0])}</p><p><i>Was tun:</i> ${esc(c[1])}</p></div>`)
      .join("");
    const annahme = !m && tabelle.length === 1 ? `<p class="fpklein">Ohne Modellangabe bin ich vom VK7 ausgegangen (zweistellige Codes).</p>` : !m && treffer.length > 1 ? `<p class="fpklein">Den Code gibt es bei VR7 und VR300 – je nach Roboter.</p>` : "";
    const fam = treffer[0].t;
    const p = pauschaleVon(fam === "vk7" ? "vk7" : fam);
    return { text: html + annahme + (fam === "vk7" ? `<p class="fpklein">Grundregel: Akku mindestens 1 Minute entnehmen und wieder einsetzen. Hilft das nicht → Reparaturauftrag${p ? " (" + preis(p.p) + ")" : ""}.</p>` : "") + koboldFuss(), chips: ["Werksreset VK7", "Was kostet die Reparatur?"] };
  }
  function antwortSymptom(k, update) {
    k.ctx.thema = "kobold";
    const W = KOBOLD_WISSEN;
    const m = modellAusKontext(k);
    if (m) k.ctx.modell = m;
    if (update) {
      const r = m && (W.UPDATE[m.code] || W.UPDATE[m.fam]);
      if (r) return { text: `<p><b>Update ${esc(m.anzeige)}</b></p><p>${r}</p>` + koboldFuss() };
      return { text: `Updates gibt es für die Saugroboter. Für welchen? VR7, VR300, VR200 oder VR100.`, chips: ["Update VR7", "Update VR300", "Update VR200"] };
    }
    const treffer = koboldSuchen(k.tok, m);
    if (!treffer.length) {
      if (m && m.fam) return { text: `Zum ${esc(m.anzeige)} kenne ich: ${W.F.filter((f) => f.fam === m.fam).map((f) => esc(f.titel)).join(" · ") || "keine eigene Störungstabelle"}. Beschreib mir, was das Gerät macht – z. B. „saugt nicht“, „blinkt rot“ oder „lädt nicht“.`, chips: ["Kann der " + m.anzeige + " noch repariert werden?", "Was kostet die Reparatur?"] };
      return { text: "Dazu finde ich im Handbuch nichts Passendes. Sag mir das Modell (z. B. VK7, VB100, VT300, VR7) und was das Gerät macht." };
    }
    return { text: treffer.map(koboldEintrag).join("") + koboldFuss(), chips: ["Kann das noch repariert werden?", "Was kostet die Reparatur?"] };
  }
  function antwortReparierbar(k) {
    k.ctx.thema = "kobold";
    const W = KOBOLD_WISSEN;
    const m = modellAusKontext(k);
    if (m) {
      k.ctx.modell = m;
      const st = statusVon(m.code);
      const p = pauschaleVon(m.code);
      if (!st && !p) return { text: `Zum ${esc(m.anzeige)} steht im Handbuch kein Reparaturstatus. Modelle, die nicht in der Preisliste stehen, werden in der Regel nicht mehr repariert – bitte beim Reparaturservice (${esc(W.KONTAKT.reparatur)}) nachfragen.` + koboldFuss() };
      let t = `<p><b>${esc(m.anzeige)}</b> ${st ? st.text : ""}.</p>`;
      if (p && (!st || st.art !== "eingestellt")) t += `<p>Reparaturpauschale: <b>${preis(p.p)}</b> (${esc(p.t)}) – inkl. Arbeit, Ersatzteilen, Versand und MwSt. In Gewährleistung/Garantie kostenfrei.</p>`;
      if (st && st.art === "eingestellt") t += `<p>Bleibt nur eine freie Werkstatt oder ein Neugerät. Orientierung (Drittanbieter, keine Vorwerk-Preise):</p>${liste(W.DRITT.map(esc))}`;
      t += `<p class="fpklein">Sofort in die Reparatur bei: ${W.STOPP.map(esc).join(", ")}.</p>`;
      return { text: t + koboldFuss(), knoepfe: [], chips: ["Wie läuft eine Reparatur ab?", "Garantie oder Gewährleistung?"] };
    }
    return { text: `<p>Für welches Gerät? Sag mir das Modell (z. B. VK150, VT270, VR200), dann sage ich dir, ob Vorwerk es noch repariert und was es kostet.</p><p><b>Sofort in die Reparatur bei:</b></p>${liste(W.STOPP.map(esc), 10)}` + koboldFuss() };
  }
  function antwortKosten(k) {
    k.ctx.thema = "kobold";
    const W = KOBOLD_WISSEN;
    /* Ersatzteil? */
    const teilTok = k.tok.filter((t) => t.length >= 4 && !/^(was|kostet|kosten|preis|eine|einen|der|die|das|fuer|beim|vom)$/.test(t));
    const m = modellAusKontext(k);
    const teil = W.TEILE.map((x) => ({ x, sc: teilTok.filter((t) => x.w.split(" ").some((w) => w.length >= 4 && passt(t, w))).length })).sort((a, b) => b.sc - a.sc)[0];
    if (teil && teil.sc >= 1 && !hat(k.tok, "rep") && hat(k.tok, "teil")) return { text: `<b>${esc(teil.x.t)}</b>: ${preis(teil.x.p)} (Online-Shop, kann sich ändern).` + koboldFuss() };
    if (/leihgeraet|ueberpruef|pruefpauschale|entsorg/.test(k.s)) return { text: liste(W.EXTRA_PREISE.map((x) => `${esc(x.t)}: <b>${preis(x.p)}</b>`)) + koboldFuss() };
    if (m) {
      k.ctx.modell = m;
      const p = pauschaleVon(m.code);
      const st = statusVon(m.code);
      if (p && (!st || st.art !== "eingestellt"))
        return { text: `Reparatur <b>${esc(m.anzeige)}</b>: Pauschale <b>${preis(p.p)}</b> (${esc(p.t)}) – inkl. Arbeit, Ersatzteilen, Versand und MwSt. Es gilt immer die Pauschale des Geräts, keine Einzelabrechnung. ${st ? "Status: " + esc(st.text) + "." : ""} In Gewährleistung/Garantie kostenfrei; Fall-, Wasser- und Hitzeschäden werden gesondert berechnet.` + koboldFuss() };
      return { text: `Für ${esc(m.anzeige)} gibt es keine Vorwerk-Pauschale – ${st ? esc(st.text) : "das Modell steht nicht in der Preisliste und wird in der Regel nicht mehr repariert"}. Orientierung freier Werkstätten (Drittanbieter):${liste(W.DRITT.map(esc))}` + koboldFuss() };
    }
    return { text: `<p>Reparaturpauschalen (brutto, inkl. Arbeit, Teile, Versand):</p>${liste(W.PAUSCHALE.map((x) => `${esc(x.t)}: <b>${preis(x.p)}</b>`), 12)}${liste(W.EXTRA_PREISE.map((x) => `${esc(x.t)}: ${preis(x.p)}`))}<p class="fpklein">Sag mir das Modell, dann nenne ich dir die passende Pauschale und ob es noch repariert wird.</p>` + koboldFuss() };
  }
  function antwortService(k) {
    k.ctx.thema = "kobold";
    const W = KOBOLD_WISSEN;
    if (hat(k.tok, "garantie")) return { text: `<p><b>Gewährleistung und Garantie</b></p>${liste(W.SERVICE.garantie.map(esc), 8)}` + koboldFuss() };
    if (/telefon|nummer|kontakt|anrufen|mail|adresse|erreich/.test(k.s))
      return { text: liste([`Reparaturservice: <b>${esc(W.KONTAKT.reparatur)}</b>`, `Kundenservice / Reparaturauftrag: ${esc(W.KONTAKT.kunden)}`, `Postadresse: ${esc(W.KONTAKT.adresse)}`, `Altgeräte: ${esc(W.KONTAKT.entsorgung)}`]) + koboldFuss() };
    return { text: `<p><b>So läuft eine Reparatur</b></p>${liste(W.SERVICE.ablauf.map(esc), 10)}<p>Reparaturservice: ${esc(W.KONTAKT.reparatur)}</p>` + koboldFuss(), chips: ["Garantie oder Gewährleistung?", "Was kostet ein Leihgerät?"] };
  }
  function antwortDiagnose() {
    const W = KOBOLD_WISSEN;
    return { text: `<p><b>Diagnose in 6 Schritten</b></p><ol>${W.ABLAUF.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><p class="fpklein">Vorher immer Netzstecker ziehen bzw. Akku entnehmen. Nur Originalteile – Fremdzubehör ist die häufigste vermeidbare Fehlerquelle.</p>` + koboldFuss() };
  }

  /* ---------- Die Fragen ---------- */
  /* g: Gruppen, die alle vorkommen müssen (je Eintrag „a|b“ = a oder b); b: Bonus; n: darf nicht vorkommen */
  const FRAGEN = [
    { id: "hallo", g: ["hallo|danke"], n: ["termin", "umsatz", "prov", "geraet"], f: (k) => ({ text: hat(k.tok, "danke") ? "Gern! Frag mich jederzeit wieder." : "Hallo! Frag mich zu deinen Terminen, Umsätzen, Zielen, deinem Team, dem K70 oder zu Kobold-Geräten. Unten findest du Beispiele." }) },
    { id: "koennen", g: [], wenn: (k) => /was (kannst|weisst) du|wobei hilfst|was kann ich (dich )?fragen|was kann provisio/.test(k.s), f: () => ({ text: faehigkeiten() }), prio: 3 },

    /* Kobold */
    { id: "code", g: ["code"], b: ["geraet"], wenn: (k) => k.code !== null && (k.modell || hat(k.tok, "geraet") || /error|fehlercode/.test(k.s) || k.ctx.thema === "kobold" || k.code >= 1000), f: antwortCode, prio: 3 },
    { id: "kosten", g: ["kosten"], b: ["rep", "geraet", "teil"], wenn: (k) => hat(k.tok, "rep") || hat(k.tok, "teil") || !!k.modell || hat(k.tok, "geraet") || k.ctx.thema === "kobold" || /leihgeraet|pauschale/.test(k.s), f: antwortKosten, prio: 3 },
    { id: "service", g: ["garantie|service"], b: ["rep", "geraet"], wenn: (k) => hat(k.tok, "garantie") || hat(k.tok, "rep") || /reparaturservice|kundenservice|leihgeraet|einschicken/.test(k.s) || k.ctx.thema === "kobold", f: antwortService, prio: 3 },
    { id: "reparierbar", g: ["rep"], b: ["geraet"], wenn: (k) => !hat(k.tok, "kosten"), f: antwortReparierbar, prio: 2 },
    { id: "update", g: ["update"], b: ["geraet"], f: (k) => antwortSymptom(k, true), prio: 2 },
    { id: "diagnose", g: ["diagnose"], b: ["geraet"], wenn: (k) => hat(k.tok, "geraet") || k.ctx.thema === "kobold" || /wie (gehe|geh) ich vor/.test(k.s), f: antwortDiagnose, prio: 2 },
    { id: "symptom", g: [], wenn: (k) => !!k.modell || (hat(k.tok, "geraet") && koboldSuchen(k.tok, null).length > 0) || (k.ctx.thema === "kobold" && koboldSuchen(k.tok, k.ctx.modell).length > 0) || /aufgeblaeht|brandgeruch|funken|rauch/.test(k.s), f: (k) => antwortSymptom(k), prio: 1 },

    /* Termine */
    { id: "frei", g: ["frei"], b: ["termin"], re: /wann (hab|habe) ich .*zeit|zeit fuer|noch platz|termin (rein|unter)/, f: antwortFrei, prio: 2 },
    { id: "naechster", g: ["naechst|zuletzt", "termin"], wenn: (k) => !hat(k.tok, "anzahl") && !k.person && !/zuletzt|letzte[rn]? /.test(k.s), re: /wann ist (mein )?naechste/, f: antwortNaechster, prio: 2 },
    { id: "heute", g: ["plan"], b: ["termin"], wenn: (k) => !hat(k.tok, "umsatz") && !hat(k.tok, "prov"), re: /was steht|was (hab|habe) ich (heute|morgen)|was liegt an|was ist (heute|morgen)/, f: antwortTag, prio: 1 },
    { id: "anzahlTermine", g: ["anzahl", "termin|vorfuehr"], wenn: (k) => !hat(k.tok, "frei"), f: antwortAnzahlTermine, prio: 1 },
    { id: "nachb", g: ["nachb"], b: ["termin"], f: antwortNachb, prio: 2 },
    { id: "wv", g: ["wv"], b: ["anzahl"], wenn: (k) => !hat(k.tok, "team") && k.code === null && !hat(k.tok, "geraet"), f: antwortWv, prio: 2 },
    { id: "zuletztUnbekannt", g: [], wenn: (k) => !k.person && /(zuletzt|letzte mal|wann war ich|wann hatte ich) .*bei (familie |frau |herrn? )?[a-z]{3,}/.test(k.s), f: (k) => {
        const m = /bei (?:familie |frau |herrn? )?([a-zäöüß-]{3,})/i.exec(k.roh);
        return { text: `Zu „${esc(m ? cap(m[1]) : "dieser Person")}“ finde ich niemanden in deinen Terminen, der Potenzial- oder Empfehlungsliste. Stimmt die Schreibweise?` };
      }, prio: 3 },
    { id: "zuletzt", g: [], wenn: (k) => !!k.person && k.person.quelle !== "team" && (/zuletzt|letzte|wann war|wann hatte|wann (hab|habe)/.test(k.s) || hat(k.tok, "termin")), f: antwortZuletzt, prio: 3 },

    /* Geld */
    { id: "ueberweisung", g: ["ueberw"], f: antwortUeberweisung, prio: 3 },
    { id: "provziel", g: ["ziel"], b: ["provziel", "prov", "umsatz"], wenn: (k) => (hat(k.tok, "provziel") || hat(k.tok, "prov")) && !hat(k.tok, "club") && !hat(k.tok, "nadel"), f: antwortProvZiel, prio: 2 },
    { id: "provision", g: ["prov"], n: ["empf", "anm", "team", "km"], f: antwortProvision, prio: 1 },
    { id: "vergleich", g: ["vergl"], wenn: (k) => k.monate.length >= 2 || /vergleich|vormonat|vorjahr/.test(k.s), f: antwortVergleich, prio: 2 },
    { id: "einheiten", g: ["einheit"], wenn: (k) => !hat(k.tok, "club") && !hat(k.tok, "k70"), f: (k) => antwortUmsatz(k, true), prio: 1 },
    { id: "umsatz", g: ["umsatz"], wenn: (k) => !hat(k.tok, "team") && !hat(k.tok, "promo") && !hat(k.tok, "fgb"), f: (k) => antwortUmsatz(k), prio: 1 },

    /* Ziele */
    { id: "club", g: ["club"], f: antwortClub, prio: 2 },
    { id: "nadel", g: ["nadel"], f: antwortNadel, prio: 2 },
    { id: "anm", g: ["anm"], f: antwortAnm, prio: 1 },

    /* Kunden */
    { id: "potenzial", g: ["pot"], wenn: (k) => /lange|potenzial|potential|nichts gehoert|nicht gemeldet|ewig/.test(k.s) && !hat(k.tok, "team"), f: antwortPotenzial, prio: 1 },
    { id: "empf", g: ["empf"], f: antwortEmpf, prio: 3 },

    /* Team */
    { id: "teamNicht", g: ["team|gemeldet", "gemeldet|nicht"], wenn: (k) => /nicht|noch kein|fehlt|fehlen/.test(k.s) && (hat(k.tok, "gemeldet") || hat(k.tok, "team")), f: antwortTeamNicht, prio: 3 },
    { id: "teamPerson", g: [], wenn: (k) => k.person && k.person.quelle === "team", f: antwortTeamPerson, prio: 3 },
    { id: "teamUmsatz", g: ["team"], b: ["umsatz"], f: antwortTeamUmsatz, prio: 2 },

    /* Unterwegs */
    { id: "k70", g: ["k70"], f: antwortK70, prio: 2 },
    { id: "km", g: ["km"], f: antwortKm, prio: 2 },

    /* Statistik */
    { id: "besserFgb", g: ["fgb"], b: ["besser", "quote"], f: () => trichterAntwort("fgb", "Festgebietsbegehung"), prio: 2 },
    { id: "besserPromo", g: ["promo"], b: ["besser", "quote"], f: () => trichterAntwort("promo", "Promotion"), prio: 2 },
    { id: "besser", g: ["besser|quote"], f: () => trichterAntwort("termine", "Kundentermine"), prio: 1 },

    /* Bedienung */
    { id: "hilfe", g: ["hilfe"], wenn: (k) => /wie |wo |kann ich|zeig|erklaer/.test(k.s + " ") && !!hilfeSuchen(k.tok), f: antwortHilfe, prio: 1 },
  ];

  function faehigkeiten() {
    return `<p>Ich beantworte Fragen aus deinen eigenen Daten, zum Beispiel:</p>${liste([
      "Termine: „Was steht morgen an?“, „Wann hab ich Freitag noch Zeit für einen Kundentermin?“",
      "Geld: „Wie viel Umsatz diese Woche?“, „Wie hoch war meine Überweisung im Oktober?“",
      "Ziele: „Wie viel fehlt mir zum Club of Excellence?“",
      "Kunden: „Wann war ich zuletzt bei Müller?“",
      "Team, K70, Fahrtenbuch, Statistik",
      "Kobold: „Mein VK7 zeigt Error 11 – was jetzt?“",
    ], 10)}<p class="fpklein">Ich bin keine echte KI: Alles läuft auf deinem Gerät, nichts wird verschickt.</p>`;
  }

  /* ---------- Antworten ---------- */
  function antwortTag(k) {
    const z = k.zeit && k.zeit.art === "tag" ? k.zeit : { von: dk(new Date()), label: "heute" };
    const istHeute = z.von === dk(new Date());
    const jetzt = new Date().getHours() + new Date().getMinutes() / 60;
    const l = eintraegeAm(z.von).filter((x) => !istHeute || (toDec(x.e.bis || "") || (toDec(uhr(x.e, x.h)) || x.h) + 1) > jetzt);
    const tagText = istHeute ? "heute noch" : z.label;
    if (!l.length) return { text: `${cap(tagText)} steht nichts${istHeute ? " mehr" : ""} im Planer.`, knoepfe: [knopf("Planer öffnen", "planer")], chips: ["Wann hab ich " + (istHeute ? "heute" : z.label.replace(/^am /, "")) + " Zeit für einen Kundentermin?"] };
    return { text: `<p>${cap(tagText)} ${l.length === 1 ? "steht ein Eintrag" : `stehen ${l.length} Einträge`} an:</p>${liste(l.map(beschreibe))}`, knoepfe: [knopf("Planer öffnen", "planer")] };
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const auftr = (n) => `${n || 0} Auftr${n === 1 ? "ag" : "äge"}`;
  function antwortNaechster() {
    const jetzt = new Date();
    const heute = dk(jetzt);
    const l = Object.keys(entries)
      .map((k) => ({ k, tag: k.split("|")[0], h: +k.split("|")[1], e: entries[k] }))
      .filter((x) => ["kunde", "premium"].includes(x.e.kind) && (x.tag > heute || (x.tag === heute && (toDec(uhr(x.e, x.h)) || x.h) >= jetzt.getHours() + jetzt.getMinutes() / 60)))
      .sort((a, b) => (a.tag === b.tag ? (toDec(uhr(a.e, a.h)) || a.h) - (toDec(uhr(b.e, b.h)) || b.h) : a.tag.localeCompare(b.tag)));
    if (!l.length) return { text: "Du hast gerade keinen kommenden Kundentermin im Planer.", chips: ["Wann hab ich morgen Zeit für einen Kundentermin?"] };
    const x = l[0];
    const d = fromDk(x.tag);
    const wann = x.tag === heute ? "heute" : x.tag === dk(plus(heuteD(), 1)) ? "morgen" : datumLang(d);
    const adr = [x.e.strasse || [x.e.str, x.e.hnr].filter(Boolean).join(" "), [x.e.plz, x.e.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return { text: `Dein nächster Kundentermin ist <b>${wann} um ${uhr(x.e, x.h)} Uhr</b> bei <b>${esc(wer(x.e)) || "–"}</b>${adr ? ", " + esc(adr) : ""}.${l.length > 1 ? ` Danach: ${esc(wer(l[1].e))} (${fmt(fromDk(l[1].tag))}).` : ""}`, knoepfe: [knopf("Im Planer zeigen", "planer")] };
  }
  function antwortFrei(k) {
    const z = k.zeit && k.zeit.art === "tag" ? k.zeit : k.zeit && k.zeit.art === "woche" ? k.zeit : { von: dk(new Date()), bis: dk(new Date()), art: "tag", label: "heute" };
    const tage = [];
    for (let d = fromDk(z.von); dk(d) <= (z.bis || z.von); d = plus(d, 1)) tage.push(dk(d));
    const zeilen = [];
    tage.forEach((t) => {
      if (t < dk(new Date())) return;
      const f = freieFenster(t);
      if (z.art === "woche") {
        if (f.length) zeilen.push(`<b>${datumLang(fromDk(t))}:</b> ${f.map(([a, b]) => hm(a) + "–" + hm(b)).join(", ")}`);
      } else f.forEach(([a, b]) => zeilen.push(`${hm(a)} – ${hm(b)} Uhr <span class="fpklein">(${Math.round((b - a) * 10) / 10} Std.)</span>`));
    });
    const wann = z.art === "woche" ? z.label : z.label;
    if (!zeilen.length) return { text: `${cap(wann)} ist kein Fenster von mindestens 2 Stunden mehr frei (zwischen 8 und 21 Uhr).`, chips: ["Wann hab ich nächste Woche Zeit für einen Kundentermin?"] };
    return { text: `<p>${cap(wann)} hast du Zeit für einen Kundentermin (mind. 2 Stunden, 8–21 Uhr):</p>${liste(zeilen, 7)}`, knoepfe: [knopf("Planer öffnen", "planer")] };
  }
  function antwortAnzahlTermine(k) {
    const z = k.zeit || { ...wocheVon(heuteD()), label: "diese Woche" };
    const n = zahlen(z.von, z.bis);
    if (hat(k.tok, "vorfuehr")) return { text: `${cap(z.label)}: <b>${n.vorgefuehrt} Vorführung${n.vorgefuehrt === 1 ? "" : "en"}</b> bei ${n.stattgefunden} stattgefundenen Kundenterminen.` };
    return { text: `${cap(z.label)} ${z.bis >= dk(new Date()) ? "hast du" : "hattest du"} <b>${n.termine} Kundentermin${n.termine === 1 ? "" : "e"}</b>${n.stattgefunden ? `, davon ${n.stattgefunden} stattgefunden und ${n.vorgefuehrt} mit Vorführung` : ""}.`, knoepfe: [knopf("Statistik öffnen", "statistik")] };
  }
  function antwortNachb() {
    const l = offeneNachbereitung();
    if (!l.length) return { text: "Alles nachbereitet – es ist nichts offen. 👍" };
    return { text: `<p>Noch <b>${l.length}</b> Termin${l.length === 1 ? "" : "e"} ohne Nachbereitung:</p>${liste(l.map((x) => `${fmt(fromDk(x.tag))} · ${beschreibe(x)}`))}`, knoepfe: [knopf("Zu „Heute“", "heute")] };
  }
  function antwortWv(k) {
    const h = heuteD();
    let monat = `${h.getFullYear()}-${pad(h.getMonth() + 1)}`;
    let label = "diesen Monat";
    if (k.zeit && k.zeit.art === "monat") {
      const d = fromDk(k.zeit.von);
      d.setDate(d.getDate() + 14);
      monat = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      label = k.zeit.label;
    }
    const faellig = wiedervorlagen.filter((w) => w.monat && w.monat <= monat);
    const genau = faellig.filter((w) => w.monat === monat),
      ueber = faellig.filter((w) => w.monat < monat);
    if (!faellig.length) return { text: `${cap(label)} ist keine Wiedervorlage fällig.` };
    const z = [...genau.map((w) => esc(w.name) + (w.notiz ? ` <span class="fpklein">– ${esc(w.notiz)}</span>` : "")), ...ueber.map((w) => esc(w.name) + ` <span class="fpschlecht">überfällig seit ${w.monat.split("-").reverse().join("/")}</span>`)];
    return { text: `<p><b>${faellig.length}</b> Wiedervorlage${faellig.length === 1 ? "" : "n"} fällig (${label}${ueber.length ? `, davon ${ueber.length} überfällig` : ""}):</p>${liste(z)}`, knoepfe: [knopf("Wiedervorlagen öffnen", "potenzial")] };
  }
  function antwortZuletzt(k) {
    const p = k.person;
    const heute = dk(new Date());
    const tr = Object.keys(entries)
      .map((x) => ({ tag: x.split("|")[0], h: +x.split("|")[1], e: entries[x] }))
      .filter((x) => normal(x.e.nachname) === p.nn && (!p.nv || !x.e.vorname || normal(x.e.vorname) === p.nv || normal(x.e.nachname) === p.nn));
    const vorbei = tr.filter((x) => x.tag <= heute).sort((a, b) => b.tag.localeCompare(a.tag));
    const kommend = tr.filter((x) => x.tag > heute).sort((a, b) => a.tag.localeCompare(b.tag));
    const name = esc([p.vor, p.nach].filter(Boolean).join(" "));
    if (!vorbei.length && !kommend.length) {
      const pot = potenzial.find((x) => normal(x.nachname) === p.nn);
      if (pot && pot.letzterBesuch) return { text: `Laut Potenzialliste warst du zuletzt am <b>${fmt(fromDk(pot.letzterBesuch))}</b> bei ${name}.` };
      return { text: `Zu ${name} finde ich keinen Termin im Planer.` };
    }
    let t = "";
    if (vorbei.length) {
      const x = vorbei[0],
        n = x.e.nb || {};
      t += `Zuletzt warst du am <b>${datumLang(fromDk(x.tag))}</b> bei ${name}${n.verkauft === "Ja" ? ` – verkauft${n.umsatz ? " für " + euro(num(n.umsatz)) : ""}` : x.e.status === "stattgefunden" ? " – ohne Kauf" : ""}.`;
      if (vorbei.length > 1) t += ` Insgesamt ${vorbei.length} Termine.`;
    }
    if (!vorbei.length) t = `Bei ${name} warst du bisher noch nicht.`;
    if (kommend.length) t += ` Nächster Termin: <b>${fmt(fromDk(kommend[0].tag))}</b> um ${uhr(kommend[0].e, kommend[0].h)} Uhr.`;
    return { text: t.trim(), knoepfe: [knopf("Kundenliste öffnen", "kunden")] };
  }
  function antwortUmsatz(k, nurEinheiten) {
    const z = k.zeit || { ...wocheVon(heuteD()), label: "diese Woche" };
    if (z.art === "monat") {
      const r = monatZeile(z.vm);
      if (r) {
        const n = (nachtrag[z.vm.year] || {})[z.vm.startW];
        return { text: nurEinheiten ? `${cap(z.label)} (${r.name}): <b>${r.einheiten || 0} Einheiten</b> bei ${r.auftraege || 0} Aufträgen.` : `${cap(z.label)} (${r.name}, ${r.spanne}): <b>${euro(r.nettoU)} netto</b>, ${r.einheiten || 0} Einheiten, ${r.auftraege || 0} Aufträge.${n && n.quelle === "pdf" ? " <span class=\"fpklein\">Aus deiner Abrechnung.</span>" : ""}${r.vorjahrNetto ? ` Vorjahr: ${euro(r.vorjahrNetto)}.` : ""}`, knoepfe: [{ text: "Monat öffnen", aktion: () => window.monatsansichtOeffnen && monatsansichtOeffnen(z.vm.year, z.vm.startW) }] };
      }
    }
    if (z.art === "jahr") return { text: `Im Vertriebsjahr ${z.jahr}: <b>${euro(jahresNetto(z.jahr))} netto</b>.`, knoepfe: [knopf("Jahresrückblick", "jahr")] };
    const n = zahlen(z.von, z.bis);
    if (nurEinheiten) return { text: `${cap(z.label)}: <b>${n.einheiten} Einheit${n.einheiten === 1 ? "" : "en"}</b> bei ${n.auftraege} Auftr${n.auftraege === 1 ? "ag" : "ägen"}.` };
    return { text: `${cap(z.label)}: <b>${euro(n.netto)} netto</b> Umsatz (Festgebiet ${euro(n.fg)}, Weißgebiet ${euro(n.wg)}${n.u.k70ein ? ", K70-Einkauf " + euro(netto(n.u.k70ein)) : ""}), ${n.einheiten} Einheiten, ${auftr(n.auftraege)}.`, knoepfe: [knopf("Statistik", "statistik")] };
  }
  function antwortProvision(k) {
    const z = k.zeit && k.zeit.art === "monat" ? k.zeit : vmZeit(heuteD(), "in diesem Vertriebsmonat");
    const n = (nachtrag[z.vm.year] || {})[z.vm.startW];
    if (n && n.abr && n.abr.einkommen !== null) {
      return { text: `${cap(z.label)} laut Abrechnung: <b>${geld2(n.abr.einkommen)}</b> Provision insgesamt (Summe Einkommen), davon ${geld2(n.abr.fgPraemie || 0)} Festgebietsprämie. Überwiesen: ${geld2(n.abr.ueberweisung || 0)}.`, knoepfe: [{ text: "Monat öffnen", aktion: () => monatsansichtOeffnen(z.vm.year, z.vm.startW) }] };
    }
    const u = umsatz(z.vm.fromK, z.vm.toK);
    const p = provision(u, z.vm.weeks);
    return { text: `${cap(z.label)} kommst du nach deinen Einträgen ungefähr auf <b>${euro(p.gesamt)}</b> (Bonusstufe ${p.stufe}).${p.next ? ` Bis zur nächsten Stufe (${p.next.pct} %) fehlen ${euro(p.next.fehlt)} netto im Festgebiet.` : ""} <span class="fpklein">Schätzung wie im Provisionsrechner.</span>`, knoepfe: [knopf("Provisionsrechner", "provision")] };
  }
  function antwortUeberweisung(k) {
    const z = k.zeit && k.zeit.art === "monat" ? k.zeit : vmZeit(plus(vertriebsmonat(heuteD()).from, -1), "im letzten Vertriebsmonat");
    const n = (nachtrag[z.vm.year] || {})[z.vm.startW];
    if (n && n.abr && n.abr.ueberweisung !== null) return { text: `${cap(z.label)} wurden <b>${geld2(n.abr.ueberweisung)}</b> aufs Bankkonto überwiesen (Provision insgesamt ${geld2(n.abr.einkommen || 0)}, Verrechnungen ${geld2(n.abr.sonstige || 0)}).`, knoepfe: [{ text: "Monat öffnen", aktion: () => monatsansichtOeffnen(z.vm.year, z.vm.startW) }] };
    return { text: `Für ${z.label.replace(/^im /, "")} ist noch keine Abrechnung hinterlegt. Übernimm die PDF im Jahresrückblick, dann weiß ich die Überweisung genau.`, knoepfe: [knopf("Jahresrückblick", "jahr")] };
  }
  function antwortProvZiel() {
    if (!(wunsch.einkommen > 0)) return { text: "Du hast noch keinen Provisionswunsch eingetragen. Trag ihn unter „Provisionswunsch“ ein, dann rechne ich dir aus, was noch fehlt.", knoepfe: [knopf("Provisionswunsch", "wunsch")] };
    const vm = vertriebsmonat(heuteD());
    const ziel = zielNetto(wunsch.einkommen, vm.weeks);
    const ist = zahlen(vm.fromK, vm.toK).netto;
    const fehlt = Math.max(0, ziel - ist);
    const rest = Math.max(1, Math.round((vm.to - heuteD()) / 864e5) + 1);
    if (!fehlt) return { text: `Geschafft: Für ${euro(wunsch.einkommen)} Provision brauchst du ${euro(ziel)} netto – du hast schon ${euro(ist)}. 🎉` };
    return { text: `Für deinen Wunsch von <b>${euro(wunsch.einkommen)}</b> brauchst du in diesem Vertriebsmonat etwa ${euro(ziel)} netto. Du hast ${euro(ist)} – es fehlen noch <b>${euro(fehlt)} netto</b> in ${rest} Tag${rest === 1 ? "" : "en"}.`, knoepfe: [knopf("Provisionswunsch", "wunsch")] };
  }
  function antwortVergleich(k) {
    let [a, b] = k.monate;
    if (!a) {
      const vm = vertriebsmonat(heuteD());
      a = vmZeit(heuteD(), "dieser Monat");
      b = vmZeit(plus(vm.from, -1), "Vormonat");
    }
    if (!b) b = vmZeit(plus(a.vm.from, -1), "Vormonat");
    const ra = monatZeile(a.vm),
      rb = monatZeile(b.vm);
    if (!ra || !rb) return { text: "Dazu habe ich keine Zahlen gefunden." };
    const d = ra.nettoU - rb.nettoU;
    return { text: `<p><b>${a.label}</b>: ${euro(ra.nettoU)} netto, ${ra.einheiten || 0} Einheiten, ${ra.auftraege || 0} Aufträge.<br><b>${b.label}</b>: ${euro(rb.nettoU)} netto, ${rb.einheiten || 0} Einheiten, ${rb.auftraege || 0} Aufträge.</p><p>${d >= 0 ? `<span class="fpgut">${euro(d)} mehr</span>` : `<span class="fpschlecht">${euro(-d)} weniger</span>`} im ${a.label}.</p>` };
  }
  function antwortClub() {
    const jahr = isoWeek(new Date()).year;
    const j = jt(jahr);
    const zeilen = [];
    if (istTeamleiter()) {
      const tj = teamJahr(jahr);
      zeilen.push(`Teamumsatz: ${euro(tj.team)} von 1.100.000 € – noch ${euro(Math.max(0, 1100000 - tj.team))}`);
      zeilen.push(`Umsatz Berufseinsteiger: ${euro(tj.einsteiger)} von 500.000 € – noch ${euro(Math.max(0, 500000 - tj.einsteiger))}`);
      zeilen.push(`Qualifizierte Anmeldungen: ${j.qualifiziert} von 6 (eigene Region ${j.qualEigene} von 2)`);
      zeilen.push(`Teamleiterförderungen: ${j.foerderung} von 1`);
    } else {
      const n = jahresNetto(jahr);
      zeilen.push(`Nettoumsatz: ${euro(n)} von 250.000 € – noch <b>${euro(Math.max(0, 250000 - n))}</b>`);
      zeilen.push(`Qualifizierte Anmeldungen: ${j.qualifiziert} von 3`);
    }
    return { text: `<p>Club of Excellence ${jahr} – einer der Wege genügt:</p>${liste(zeilen)}`, knoepfe: [knopf("Ziele öffnen", "ziele")] };
  }
  function antwortNadel() {
    const g = gesamtNetto();
    if (g >= 50000) {
      const b = Math.floor(g / 100000) + 1;
      return { text: `Die Goldene Nadel hast du schon (${euro(g)} insgesamt). Bis zum ${b}. Brillanten fehlen ${euro(b * 100000 - g)}.`, knoepfe: [knopf("Ziele öffnen", "ziele")] };
    }
    const fehlt = 50000 - g;
    const jahr = isoWeek(new Date()).year;
    const wocheJetzt = isoWeek(new Date()).week;
    const proWoche = wocheJetzt > 1 ? jahresNetto(jahr) / (wocheJetzt - 1) : 0;
    const rest = weeksInISOYear(jahr) - wocheJetzt + 1;
    const schaffbar = proWoche * rest >= fehlt;
    return { text: `Bis zur Goldenen Nadel (50.000 €) fehlen dir noch <b>${euro(fehlt)}</b> netto. ${proWoche ? `In deinem bisherigen Tempo (${euro(proWoche)} pro Woche) ${schaffbar ? "schaffst du das noch in diesem Vertriebsjahr" : `wird es dieses Jahr knapp – du bräuchtest ${euro(fehlt / Math.max(1, rest))} pro Woche`}.` : ""}`, knoepfe: [knopf("Ziele öffnen", "ziele")] };
  }
  function antwortAnm() {
    const jahr = isoWeek(new Date()).year;
    const j = jt(jahr);
    return { text: `Im Vertriebsjahr ${jahr} hast du <b>${j.qualifiziert} qualifizierte Anmeldung${j.qualifiziert === 1 ? "" : "en"}</b>${istTeamleiter() ? ` (davon ${j.qualEigene} in eigener Region)` : ""}.`, knoepfe: [knopf("Jobtickets", "jobtickets")] };
  }
  function antwortPotenzial() {
    const l = potenzial
      .filter((p) => p.letzterBesuch)
      .sort((a, b) => a.letzterBesuch.localeCompare(b.letzterBesuch))
      .slice(0, 6);
    if (!l.length) return { text: "In deiner Potenzialliste steht noch niemand mit Besuchsdatum." };
    return { text: `<p>Am längsten nichts von dir gehört haben:</p>${liste(l.map((p) => `${esc(wer(p))} · zuletzt ${fmt(fromDk(p.letzterBesuch))}${p.potenzial ? ` <span class="fpklein">(${esc([].concat(p.potenzial).join(", "))})</span>` : ""}`))}`, knoepfe: [knopf("Potenzialliste", "potenzial")] };
  }
  function antwortEmpf(k) {
    const z = k.zeit || vmZeit(heuteD(), "in diesem Vertriebsmonat");
    const l = empfehlungen.filter((e) => e.datum && e.datum >= z.von && e.datum <= z.bis);
    return { text: `${cap(z.label)}: <b>${l.length} Empfehlung${l.length === 1 ? "" : "en"}</b>${l.length ? " – " + l.slice(0, 5).map((e) => esc(wer(e))).join(", ") : ""}. Insgesamt stehen ${empfehlungen.length} auf deiner Empfehlungsliste.`, knoepfe: [knopf("Empfehlungsliste", "empfehlung")] };
  }
  function teamWoche(k) {
    return k.zeit && k.zeit.art === "woche" ? k.zeit : { ...wocheVon(heuteD()), label: "diese Woche" };
  }
  function antwortTeamNicht(k) {
    if (!istTeamleiter()) return { text: "Das kann ich nur in der Teamleiter-Rolle beantworten." };
    const t = typeof teamManuell === "function" ? teamManuell() : [];
    if (!t.length) return { text: "Du hast noch keine Teammitglieder angelegt.", knoepfe: [knopf("Teammitglieder", "team")] };
    const z = teamWoche(k);
    const meld = teamMeldungen();
    const fehlt = t.filter((m) => !(meld[m.id] && meld[m.id][z.von]));
    if (!fehlt.length) return { text: `${cap(z.label)} haben alle ${t.length} gemeldet. 👍` };
    return { text: `${cap(z.label)} fehlt noch die Meldung von: <b>${fehlt.map((m) => esc(m.name)).join(", ")}</b>.`, knoepfe: [knopf("Wochenmeldung", "teammeldung")] };
  }
  function antwortTeamPerson(k) {
    const m = k.person.ref;
    const z = k.zeit && k.zeit.art === "woche" ? k.zeit : { ...wocheVon(heuteD()), label: "diese Woche" };
    const w = (teamMeldungen()[m.id] || {})[z.von];
    if (!w) return { text: `${esc(m.name)} hat ${z.label} noch nichts gemeldet.`, knoepfe: [knopf("Wochenmeldung", "teammeldung")] };
    return { text: `${esc(m.name)} ${z.label}: <b>${w.termine || 0} Termine</b>, ${w.einheiten || 0} Einheiten, ${euro(+w.umsatzNetto || 0)} netto${w.pci ? ", " + w.pci + " Premium CheckIns" : ""}.` };
  }
  function antwortTeamUmsatz(k) {
    if (!istTeamleiter()) return { text: "Das kann ich nur in der Teamleiter-Rolle beantworten." };
    const z = k.zeit && k.zeit.art === "monat" ? k.zeit : vmZeit(heuteD(), "in diesem Vertriebsmonat");
    const t = typeof teamManuell === "function" ? teamManuell() : [];
    const meld = teamMeldungen();
    const zeilen = [];
    let summe = 0;
    t.forEach((m) => {
      let n = 0;
      Object.entries(meld[m.id] || {}).forEach(([wk, w]) => {
        if (wk >= z.von && wk <= z.bis) n += +w.umsatzNetto || 0;
      });
      summe += n;
      zeilen.push({ name: m.name, n });
    });
    const eigen = zahlen(z.von, z.bis).netto;
    const tu = (teamumsatz[z.vm.year] || {})[z.vm.startW];
    zeilen.sort((a, b) => b.n - a.n);
    return { text: `<p>${cap(z.label)}: Team laut Wochenmeldungen <b>${euro(summe + eigen)} netto</b> (mit dir: ${euro(eigen)}).${tu ? ` Laut Abrechnung: ${euro(tu.team)} (Berufseinsteiger ${euro(tu.einsteiger)}).` : ""}</p>${liste(zeilen.map((x) => `${esc(x.name)}: ${euro(x.n)}`))}`, knoepfe: [knopf("Teamumsatz", "teamumsatz")] };
  }
  function antwortK70() {
    const nach = typeof invNachbestellen === "function" ? invNachbestellen() : [];
    const leer = [];
    (katalog.liste || []).forEach((kat) =>
      (kat.artikel || []).forEach((a) => {
        if (!a.top) return;
        const id = artKey(kat.kat + "|" + a.n);
        if (!(+inventur[id] > 0)) leer.push(a.n);
      }),
    );
    if (!nach.length && !leer.length) return { text: "Im K70 fehlt nichts: Alle Must-have-Artikel sind da und nichts liegt unter dem Mindestbestand. 👍", knoepfe: [knopf("K70 Inventur", "inventur")] };
    let t = "";
    if (leer.length) t += `<p><b>Must-have, aber leer (${leer.length}):</b></p>${liste(leer.map(esc), 12)}`;
    const rest = nach.filter((x) => !leer.includes(x.n));
    if (rest.length) t += `<p><b>Unter Mindestbestand:</b></p>${liste(rest.map((x) => `${esc(x.n)} – ${x.ist} von ${x.soll}, ${x.fehlt} nachbestellen`), 12)}`;
    return { text: t, knoepfe: [knopf("K70 Inventur", "inventur")] };
  }
  function antwortKm(k) {
    const z = k.zeit || vmZeit(heuteD(), "in diesem Vertriebsmonat");
    const l = fahrten.filter((f) => f.datum >= z.von && f.datum <= z.bis);
    const km = l.reduce((s, f) => s + fahrtKm(f), 0);
    return { text: `${cap(z.label)}: <b>${Math.round(km).toLocaleString("de-DE")} km</b> in ${l.length} Fahrt${l.length === 1 ? "" : "en"}.`, knoepfe: [knopf("Fahrtenbuch", "fahrten")] };
  }
  function antwortHilfe(k) {
    const h = hilfeSuchen(k.tok);
    return { text: `<p><b>${esc(h.t)}</b></p><p>${esc(h.a)}</p>`, knoepfe: [knopf("Hinführen", h.h)] };
  }

  /* ---------- Auswerten ---------- */
  const ctx = { letzte: null, thema: null, modell: null };
  function beantworten(frage) {
    const s = " " + normal(frage) + " ";
    const tok = woerter(frage);
    const k = {
      roh: String(frage),
      s,
      tok,
      zeit: zeitErkennen(frage),
      monate: monateErkennen(frage),
      person: personErkennen(frage),
      modell: modellErkennen(frage),
      code: fehlercodeErkennen(frage),
      ctx,
    };
    let best = null;
    FRAGEN.forEach((q) => {
      let sc = 0;
      for (const grp of q.g) {
        if (!grp.split("|").some((g) => hat(tok, g))) return;
        sc += 2;
      }
      if (q.n && q.n.some((g) => hat(tok, g))) return;
      if (q.wenn && !q.wenn(k)) return;
      (q.b || []).forEach((g) => hat(tok, g) && (sc += 1));
      if (q.re && q.re.test(s)) sc += 3;
      if (!q.g.length && !q.re) sc += 2;
      sc += (q.prio || 0) * 0.1;
      if (sc > 0 && (!best || sc > best.sc)) best = { q, sc };
    });
    /* Folgefrage: „und morgen?“, „und letzte Woche?“ */
    if ((!best || best.sc < 2) && ctx.letzte && (k.zeit || k.monate.length) && tok.length <= 5) best = { q: ctx.letzte, sc: 2 };
    if (!best) {
      const h = hilfeSuchen(tok);
      if (h && tok.length > 1) return antwortHilfe(k);
      return { text: "Das habe ich leider nicht verstanden – oder dazu habe ich keine Daten. Versuch es anders zu formulieren oder tipp unten auf ein Beispiel.", chips: zufallsBeispiele(3), unklar: true };
    }
    ctx.letzte = best.q;
    if (!["code", "kosten", "reparierbar", "update", "symptom", "service", "diagnose"].includes(best.q.id)) ctx.thema = null;
    try {
      return best.q.f(k);
    } catch (e) {
      console.warn("Frag Provisio:", e);
      return { text: "Dabei ist etwas schiefgegangen. Versuch es bitte noch einmal anders." };
    }
  }

  const BEISPIELE = [
    "Was steht heute noch an?",
    "Wann ist mein nächster Kundentermin?",
    "Wann hab ich morgen Zeit für einen Kundentermin?",
    "Wie viele Termine habe ich diese Woche?",
    "Wen muss ich noch nachbereiten?",
    "Welche Wiedervorlagen sind diesen Monat fällig?",
    "Wie viel Umsatz habe ich diese Woche gemacht?",
    "Wie viel Provision bekomme ich diesen Monat?",
    "Wie viel fehlt mir noch zu meinem Provisionsziel?",
    "Wie lief der Oktober im Vergleich zum September?",
    "Wie hoch war meine Überweisung im Oktober?",
    "Wie viel fehlt mir zum Club of Excellence?",
    "Schaffe ich die Goldene Nadel dieses Jahr?",
    "Wie viele qualifizierte Anmeldungen habe ich?",
    "Wer aus meiner Potenzialliste hat lange nichts von mir gehört?",
    "Wie viele Empfehlungen habe ich diesen Monat bekommen?",
    "Wer im Team hat diese Woche noch nicht gemeldet?",
    "Was muss ich im K70 nachbestellen?",
    "Wie viele Kilometer bin ich diesen Monat gefahren?",
    "Worin muss ich bei der FGB besser werden?",
    "Worin muss ich bei Promo besser werden?",
    "Mein VK7 zeigt Error 11 – was jetzt?",
    "Der VB100 saugt nicht richtig",
    "Kann der VK150 noch repariert werden?",
    "Was kostet die Reparatur beim VR7?",
    "VR7 zeigt 2212",
    "Wie läuft eine Reparatur ab?",
    "Wie lege ich einen Serientermin an?",
  ];
  function zufallsBeispiele(n) {
    const l = BEISPIELE.slice();
    const out = [];
    while (out.length < n && l.length) out.push(l.splice(Math.floor(Math.random() * l.length), 1)[0]);
    return out;
  }

  /* ---------- Oberfläche ---------- */
  let ebene = null;
  let vorlesen = false;
  try {
    vorlesen = store.get("pv-frag-vorlesen") === true;
  } catch (e) {}
  function sprechen(html) {
    if (!vorlesen || !("speechSynthesis" in window)) return;
    try {
      const d = document.createElement("div");
      d.innerHTML = html;
      const u = new SpeechSynthesisUtterance(d.textContent.replace(/\s+/g, " ").slice(0, 600));
      u.lang = "de-DE";
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function blase(wer, html, extra) {
    const log = ebene.querySelector(".fplog");
    const b = document.createElement("div");
    b.className = "fpb " + wer;
    b.innerHTML = html;
    if (extra && extra.knoepfe && extra.knoepfe.length) {
      const k = document.createElement("div");
      k.className = "fpknoepfe";
      extra.knoepfe.forEach((x) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "fpknopf";
        btn.textContent = x.text;
        btn.onclick = () => {
          schliessen();
          if (x.aktion) setTimeout(x.aktion, 300);
          else location.hash = "#" + x.hash;
        };
        k.appendChild(btn);
      });
      b.appendChild(k);
    }
    log.appendChild(b);
    requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
  }
  function chipsSetzen(l) {
    const c = ebene.querySelector(".fpchips");
    c.innerHTML = "";
    (l || zufallsBeispiele(4)).forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fpchip";
      b.textContent = t;
      b.onclick = () => fragen(t);
      c.appendChild(b);
    });
  }
  function fragen(text) {
    text = String(text || "").trim();
    if (!text || !ebene) return;
    blase("ich", esc(text));
    const a = beantworten(text);
    setTimeout(() => {
      blase("pv", a.text, a);
      chipsSetzen(a.chips);
      sprechen(a.text);
    }, 180);
  }
  function oeffnen() {
    if (ebene) return;
    ebene = document.createElement("section");
    ebene.className = "fragpv";
    ebene.setAttribute("role", "dialog");
    ebene.setAttribute("aria-label", "Frag Provisio");
    ebene.innerHTML = `<div class="fpkopf"><button type="button" class="fpzu" aria-label="Schließen">✕</button>
        <div class="fptitel"><b>Frag Provisio</b><span>antwortet aus deinen Daten · offline</span></div>
        <button type="button" class="fplaut" aria-pressed="${vorlesen}" title="Antworten vorlesen">🔊</button></div>
      <div class="fplog" aria-live="polite"></div>
      <div class="fpchips"></div>
      <form class="fpeingabe"><input type="text" id="fpFrage" placeholder="Frag mich etwas …" autocomplete="off" enterkeyhint="send">
        <button type="submit" aria-label="Senden">➤</button></form>
      <p class="fptipp">Zum Sprechen: das Mikrofon auf der Tastatur antippen.</p>`;
    document.body.appendChild(ebene);
    document.body.classList.add("frag-offen");
    requestAnimationFrame(() => ebene.classList.add("auf"));
    ebene.querySelector(".fpzu").onclick = schliessen;
    const laut = ebene.querySelector(".fplaut");
    laut.onclick = () => {
      vorlesen = !vorlesen;
      laut.setAttribute("aria-pressed", String(vorlesen));
      try {
        store.set("pv-frag-vorlesen", vorlesen);
      } catch (e) {}
      if (!vorlesen && "speechSynthesis" in window) speechSynthesis.cancel();
    };
    const inp = ebene.querySelector("#fpFrage");
    ebene.querySelector(".fpeingabe").onsubmit = (ev) => {
      ev.preventDefault();
      const t = inp.value;
      inp.value = "";
      fragen(t);
    };
    blase("pv", `Hallo${me && me.vorname ? " " + esc(me.vorname) : ""}! Was möchtest du wissen?`);
    chipsSetzen();
    setTimeout(() => inp.focus(), 350);
  }
  function schliessen() {
    if (!ebene) return;
    const e = ebene;
    ebene = null;
    e.classList.remove("auf");
    document.body.classList.remove("frag-offen");
    try {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    } catch (x) {}
    setTimeout(() => e.remove(), 300);
  }
  addEventListener("hashchange", schliessen);
  window.fragProvisio = { oeffnen, schliessen, beantworten, fragen };

  /* Einstieg: oben im Menü und auf „Heute“ */
  if (typeof renderMenu === "function") {
    const ohne = renderMenu;
    renderMenu = function () {
      const r = ohne.apply(this, arguments);
      const nav = document.getElementById("navHaupt");
      if (nav && me && !nav.querySelector(".fpnav")) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "navlink fpnav";
        b.innerHTML = `<span class="mic fpmic">💬</span>Frag Provisio`;
        b.onclick = () => {
          if (typeof setMenu === "function") setMenu(false);
          setTimeout(oeffnen, 120);
        };
        nav.prepend(b);
      }
      return r;
    };
  }
  if (typeof renderHeute === "function") {
    const ohne = renderHeute;
    renderHeute = function () {
      const r = ohne.apply(this, arguments);
      const box = document.getElementById("heute");
      if (box && me && !box.querySelector(".fpheute")) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fpheute";
        b.innerHTML = `<span>💬</span> Frag Provisio …`;
        b.onclick = oeffnen;
        box.prepend(b);
      }
      return r;
    };
  }
})();
