/**
 * Praxis-Einführung (Beta 1.4)
 *
 * Wie ein Spiel-Tutorial: Jede Seite, jede Funktion, jedes Fenster wird
 * einmal selbst ausprobiert. Ein Lichtkreis zeigt, wohin getippt wird, eine
 * Karte erklärt in ein, zwei Sätzen. Alles außerhalb des Lichtkreises ist
 * gesperrt, bis der Schritt geschafft ist. Am Ende werden alle Beispiele
 * wieder gelöscht – erst dann gehört die App dir.
 *
 * Neue Zugänge starten automatisch (leere Daten, Einführung nie beendet).
 * Bestehende Zugänge starten sie in den Einstellungen; ihre echten Daten
 * werden vorher gesichert und am Ende exakt wiederhergestellt.
 *
 * Der Stand liegt verschlüsselt in settings.einfuehrung – nach Neustart
 * geht es am selben Schritt weiter.
 */
(function () {
  "use strict";

  /* ---------- kleine Helfer ---------- */
  const $ = (s) => document.querySelector(s);
  const sichtbar = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };
  const finde = (s) => [...document.querySelectorAll(s)].find(sichtbar) || null;
  const fensterOffen = () => modal.classList.contains("open");
  const seite = () => (location.hash || "#heute").slice(1).split("?")[0] || "heute";
  const menueOffen = () => {
    const d = $("#drawer");
    return !!(d && d.classList.contains("open"));
  };
  const zaehl = (kind) => Object.values(entries).filter((e) => e && e.kind === kind).length;
  const fp = (fn) => {
    try {
      return JSON.stringify(fn()) || "";
    } catch (e) {
      return "";
    }
  };
  const textIn = (sel, t) =>
    [...document.querySelectorAll(sel)].find((el) => sichtbar(el) && el.textContent.trim().startsWith(t)) || null;
  const hOffen = () => {
    const h = document.getElementById("hFenster");
    return !!(h && !h.hidden);
  };
  const unterOffen = () => typeof unterStapel !== "undefined" && unterStapel.length > 0;
  const datenLeer = () =>
    !Object.keys(entries).length &&
    !potenzial.length &&
    !empfehlungen.length &&
    !interessenten.length &&
    !fahrten.length;

  const NAMEN = {
    ...PAGES,
    verkaeufe: "Verkäufe",
    interessenten: "Interessenten",
    profil: "Einstellungen",
    inventur: "K70 Inventur",
  };
  const IN_LEISTE = ["heute", "planer", "inventur", "provision"];

  /* ---------- Zustand ---------- */
  const T = {
    aktiv: false,
    i: 0,
    snap: null,
    rolle: null,
    kk: null, // Schlüssel des Beispiel-Kundentermins
    s: {}, // Werte, die ein Schritt bei Beginn merkt
    klicks: [],
    seit: 0,
    geschafft: false,
  };
  window.einfuehrungZustand = T;

  function sichern() {
    if (!T.aktiv) return;
    settings.einfuehrung = { i: T.i, snap: T.snap, rolle: T.rolle, kk: T.kk, kat: T.kat, modus: T.modus, xp: T.xp, abzeichen: T.abzeichen };
    saveData();
  }

  /* Klicks seit Schrittbeginn – für „tippe auf …“-Schritte */
  const geklickt = (sel, text) => () =>
    T.klicks.some((k) => {
      const el = k.closest && k.closest(sel);
      return !!el && (!text || el.textContent.trim().startsWith(text));
    });

  /* ---------- Schritt-Bausteine ---------- */
  function hin(page, titel, text) {
    const leiste = IN_LEISTE.includes(page);
    return {
      titel: titel || NAMEN[page] + " öffnen",
      text:
        text ||
        (leiste
          ? `Tippe unten in der Leiste auf „${page === "inventur" ? "K70" : NAMEN[page]}“.`
          : () =>
              menueOffen()
                ? `Tippe im Menü auf „${NAMEN[page]}“.`
                : `Tippe unten auf „Mehr“ – dort findest du „${NAMEN[page]}“.`),
      ziel: () =>
        leiste
          ? finde(`.tabbar a[data-page="${page}"]`)
          : menueOffen()
            ? finde(`#drawer a.navlink[data-page="${page}"]`)
            : finde(".tabbar .tabmehr"),
      frei: ["#drawer .navsuche", "#drawer input"],
      nav: true,
      fertig: () => seite() === page && !menueOffen(),
    };
  }
  const info = (titel, text, ziel) => ({ titel, text, ziel: ziel || null, info: true });

  /* Freies Feld im Planer – am liebsten um 10, 16 oder 18 Uhr */
  function freiesFeld(stunden) {
    for (const h of stunden || [10, 11, 9, 14, 16, 18, 12, 15, 17, 19, 20, 8]) {
      const el = finde(`button.slot.gprow[data-hour="${h}"]:not(.soft)`);
      if (el) return el;
    }
    return finde("button.slot.gprow:not(.soft)");
  }
  const fensterOder = (fn) => () => (fensterOffen() ? $("#sheet") : fn());
  /* Sichtbarer privater Termin im Planer */
  function privatFeld() {
    return (
      [...document.querySelectorAll("button.slot.filled[data-day][data-hour]")].find((el) => {
        const e = entries[key(el.dataset.day, +el.dataset.hour)];
        return e && e.kind === "privat" && sichtbar(el);
      }) || null
    );
  }

  /* Text der Nachbereitung, passend zum aktuellen Schritt im Fenster */
  function nbText() {
    const kopf = $("#sheet .uwizkopf");
    const t = kopf ? kopf.textContent : "";
    if (!fensterOffen()) return "Öffne deinen Beispieltermin wieder und mach dort weiter.";
    if (/Zeiten/.test(t))
      return "Schritt Zeiten: Trag ein, wann der Termin wirklich begann und endete – dann „Weiter“. Mit „Zwischenspeichern“ kannst du jederzeit pausieren.";
    if (/Kunde/.test(t) && !/Abschluss/.test(t))
      return "Schritt Kunde: Neu- oder Bestandskunde, Fest- oder Weißgebiet und das Gerät, das der Kunde bisher hat. Dann „Weiter“.";
    if (/Gespräch/.test(t))
      return "Schritt Gespräch: Hast du nach Empfehlungen und nach einem Jobticket gefragt? Ja oder Nein – dann „Weiter“.";
    if (/Vorführung/.test(t))
      return "Schritt Vorführung: Tippe die vorgeführten Geräte an. Demotücher zählst du mit Plus und Minus – gedrückt halten zählt schneller.";
    if (/Abschluss/.test(t))
      return "Schritt Abschluss: Sag „Ja“ bei „Hat der Kunde gekauft?“, trag Einheiten und Bruttoumsatz ein. Die zwei Häkchen darunter zeigen, ob Verkaufs- (15 %) und Kontaktprovision (5 %) bei dir bleiben.";
    if (/Wiedervorlage/.test(t))
      return "Schritt Wiedervorlage: Wann meldest du dich wieder beim Kunden? Dann „Abschließen“ – fertig.";
    if (draft && draft.nb && draft.nb.status !== "Stattgefunden") return "Tippe auf „Stattgefunden“.";
    return "Folge den Schritten im Fenster bis „Abschließen“.";
  }

  /* Text für Terminieren, Privat und Serie – je nach Fensterschritt */
  function anlegeText(art) {
    if (!fensterOffen()) return art.leer;
    if (step === "kind") return `Wähle „${art.wahl}“.`;
    return art[step] || art.sonst;
  }

  /* ---------- Die Einführung ---------- */
  const KAPITEL = [];
  const kap = (name, schritte) => schritte.forEach((s) => KAPITEL.push({ ...s, kap: name }));

  kap("Willkommen", [
    {
      ...info(
        "Willkommen bei Provisio",
        "Spiel dich durch die App: Jedes Kapitel ist ein Level, jeder Schritt bringt XP, jedes Level ein Abzeichen. Der Lichtkreis zeigt, wohin du tippst. Alles, was du anlegst, sind Beispiele – am Ende räumst du sie weg.",
      ),
      zweit: ["Ich kenne Provisio schon", () => ueberspringen()],
    },
    info(
      "Deine Leiste",
      "Unten ist deine Leiste: Heute, Planer, K70, Provision und Mehr. Die Markierung zeigt, wo du gerade bist. Unter „Mehr“ liegt alles Weitere.",
      () => finde(".tabbar"),
    ),
  ]);

  kap("Planer", [
    hin("planer", "Ab in den Planer", "Tippe unten auf „Planer“ – hier planst du deine Woche."),
    {
      titel: "Wochen blättern",
      text: "Mit den Pfeilen blätterst du durch die Wochen. Tippe auf den Pfeil nach rechts.",
      ziel: () => finde("#next"),
      start: (s) => (s.m = +monday),
      fertig: (s) => +monday > s.m,
    },
    {
      titel: "Zurück zu dieser Woche",
      text: "Und wieder zurück: Tippe auf den Pfeil nach links.",
      ziel: () => finde("#prev"),
      start: (s) => (s.m = +monday),
      fertig: (s) => +monday < s.m,
    },
    {
      titel: "Tag wählen",
      text: "Tippe in der Tagesleiste auf einen anderen Tag.",
      ziel: () => finde(".gptage, [data-tag]")?.closest(".gptage") || finde("[data-tag]"),
      frei: ["[data-tag]"],
      fertig: geklickt("[data-tag]"),
    },
    {
      titel: "Drei Tage auf einen Blick",
      text: "Tippe auf „3 Tage“ – so siehst du mehr nebeneinander.",
      ziel: () => textIn("[data-gpansicht]", "3 Tage"),
      fertig: geklickt("[data-gpansicht]", "3 Tage"),
    },
    {
      titel: "Wieder ein Tag",
      text: "Zurück auf „1 Tag“ – die Felder werden wieder breit.",
      ziel: () => textIn("[data-gpansicht]", "1 Tag"),
      fertig: geklickt("[data-gpansicht]", "1 Tag"),
    },
    {
      titel: "Reihenfolge drehen",
      text: "Der Knopf mit den zwei Pfeilen dreht die Stunden: früh oben oder spät oben. Probier ihn einmal aus.",
      ziel: () => finde("[data-gprichtung]"),
      fertig: geklickt("[data-gprichtung]"),
    },
    {
      anker: "termin",
      titel: "Ersten Termin anlegen",
      text: "Tippe auf ein freies Feld im Planer – dort entsteht dein erster Kundentermin.",
      ziel: fensterOder(() => freiesFeld()),
      fertig: () => fensterOffen() && step === "kind",
    },
    {
      zurueck: "termin",
      titel: "Kundentermin",
      text: "Wähle „Kundentermin“.",
      ziel: () => finde('#sheet [data-kind="kunde"]') || $("#sheet"),
      fertig: () => fensterOffen() && step === "quelle",
    },
    {
      zurueck: "termin",
      titel: "Woher kommt der Termin?",
      text: "Wähle die Quelle – zum Beispiel „Empfehlung“. Sie färbt den Termin und zählt in der Statistik.",
      ziel: () => $("#sheet"),
      fertig: () => fensterOffen() && step === "kunde",
    },
    {
      zurueck: "termin",
      titel: "Kundendaten",
      text: "Trag einen Beispielkunden ein: Nachname, Straße, eine PLZ mit fünf Ziffern und Ort. Dann „Termin speichern“. Fehlt etwas, sagt dir das Fenster Bescheid.",
      ziel: () => $("#sheet"),
      start: (s) => (s.keys = new Set(Object.keys(entries))),
      fertig: (s) => {
        const neu = Object.keys(entries).find((k) => !s.keys.has(k) && entries[k].kind === "kunde");
        if (neu) T.kk = neu;
        return !!neu;
      },
    },
    {
      anker: "oeffnen",
      titel: "Termin öffnen",
      text: "Da ist er! Tippe auf deinen neuen Termin.",
      pruef: () => (T.kk && entries[T.kk] ? null : "termin"),
      ziel: fensterOder(() => {
        if (!T.kk) return null;
        const [d, h] = T.kk.split("|");
        return finde(`button.slot.filled[data-day="${d}"][data-hour="${+h}"]`) || finde(`button.slot.filled[data-hour="${+h}"]`);
      }),
      fertig: () => fensterOffen() && step === "view" && draft && key(draft.day, draft.hour) === T.kk,
    },
    info(
      "Das Termin-Fenster",
      "Hier steht alles zum Termin: Kunde, Adresse, Route und Status. Nach dem Termin trägst du hier ein, wie es gelaufen ist. Mit „Kundendaten bearbeiten“ änderst du Name oder Adresse.",
      () => $("#sheet"),
    ),
    {
      zurueck: "oeffnen",
      titel: "Wie lief es?",
      text: "Tippe auf „Stattgefunden“. Verschoben, Abgesagt und Nicht da gibt es auch – der Termin bleibt dann im Planer stehen.",
      ziel: () => textIn("#sheet button", "Stattgefunden") || $("#sheet"),
      fertig: () => !!(draft && draft.nb && draft.nb.status === "Stattgefunden"),
    },
    {
      zurueck: "oeffnen",
      titel: "Nachbereitung",
      text: nbText,
      ziel: () => (fensterOffen() ? $("#sheet") : null),
      pruef: () => {
        if (!T.kk || !entries[T.kk]) return "termin";
        if (!fensterOffen() && !(entries[T.kk].status === "stattgefunden" || entries[T.kk].status === "nachbereitet"))
          return "oeffnen";
        return null;
      },
      fertig: () => {
        const e = T.kk && entries[T.kk];
        return !!e && (e.status === "stattgefunden" || e.status === "nachbereitet") && !fensterOffen();
      },
    },
    info(
      "Geschafft!",
      "Dein erster Termin ist nachbereitet. Fertige Termine bekommen im Planer einen Haken, Verkäufe fließen sofort in Statistik und Provision.",
    ),
    {
      anker: "terminieren",
      titel: "Terminieren",
      text: () =>
        anlegeText({
          leer: "Jetzt ein Terminierungsblock: Tippe auf ein anderes freies Feld.",
          wahl: "Terminieren",
          termQuelle: "Woraus terminierst du? Wähle „Promotion“.",
          promo: "Ort, Bis-Zeit und Gebiet eintragen, das Ziel mit Plus setzen – Termine und Kontakte zählen beide. Dann „Speichern“.",
          termZiel: "Bis wann, und wie viele Termine sind dein Ziel? Dann „Speichern“.",
          sonst: "Folge dem Fenster bis „Speichern“.",
        }),
      ziel: fensterOder(() => freiesFeld([16, 17, 15, 18, 14, 19, 12])),
      start: (s) => (s.n = zaehl("terminieren")),
      fertig: (s) => zaehl("terminieren") > s.n && !fensterOffen(),
    },
    {
      titel: "Privat, jede Woche",
      text: () =>
        anlegeText({
          leer: "Termine können sich wiederholen. Tippe auf ein freies Feld für einen privaten Termin.",
          wahl: "Privat",
          zeit: "Stell Von und Bis ein und wähle bei „Wiederholen“ „Wöchentlich“. Dann „Speichern“ – die Serie läuft 52 Wochen voraus.",
          sonst: "Folge dem Fenster bis „Speichern“.",
        }),
      ziel: fensterOder(() => freiesFeld([19, 20, 8, 18, 21, 7])),
      start: (s) => (s.n = Object.keys(settings.serien || {}).length),
      fertig: (s) => Object.keys(settings.serien || {}).length > s.n && !fensterOffen(),
    },
    {
      titel: "Einen Serientermin löschen",
      text: () =>
        fensterOffen()
          ? "Tippe auf „Löschen“ – die App fragt: nur diesen oder alle zukünftigen? Wähle „Nur diesen“."
          : "Tippe auf deinen privaten Termin.",
      ziel: fensterOder(() => privatFeld() || finde("#next")),
      frei: ["#prev", "#next", "[data-tag]"],
      start: (s) => (s.n = zaehl("privat")),
      fertig: (s) => zaehl("privat") < s.n && !fensterOffen(),
    },
    {
      titel: "Rückgängig",
      text: "Versehentlich gelöscht? Tippe auf „Rückgängig“ – der Termin ist wieder da.",
      ziel: () => finde("#planUndo"),
      frei: ["#prev", "#next"],
      fertig: geklickt("#planUndo"),
    },
    {
      titel: "Termin in einem Satz",
      text: () =>
        fensterOffen()
          ? "Sprich oder tipp einen Satz in das Feld, zum Beispiel: „morgen 10 Uhr Kundentermin Familie Becker, Hauptstraße 5, 40210 Düsseldorf“. Auf der Tastatur ist das Mikrofon. Dann „Termin anlegen“."
          : "Das Plus legt Termine schnell an. Tippe darauf.",
      ziel: fensterOder(() => finde(".gpfab")),
      start: (s) => (s.n = Object.keys(entries).length),
      fertig: (s) => Object.keys(entries).length > s.n,
    },
    {
      titel: "Kurz anschauen",
      text: "Der Termin ist angelegt und das Fenster zeigt ihn. Schließ es mit dem Kreuz oben rechts.",
      ziel: () => (fensterOffen() ? finde("#sheet [data-close], #sheet .x, #sheet header button") || $("#sheet") : null),
      fertig: () => !fensterOffen(),
    },
    {
      titel: "Urlaub und Abwesenheit",
      text: () =>
        fensterOffen()
          ? "Wähle den Grund, Von und Bis – dann „Eintragen“. Diese Tage zählen nicht als Arbeitstage."
          : "Unter dem Planer trägst du freie Tage ein. Tippe auf „Urlaub und Abwesenheit“.",
      ziel: fensterOder(() => finde("#uUrlaubZeile")),
      start: (s) => (s.f = fp(() => settings.urlaub)),
      fertig: (s) => fp(() => settings.urlaub) !== s.f && !fensterOffen(),
    },
    {
      titel: "Kennzahlen der Woche",
      text: () =>
        fensterOffen()
          ? "Trag einen Betrag ein und tippe auf „Speichern“."
          : "Die Zahlen unter dem Planer lassen sich antippen. Tippe auf die erste Zahl mit dem Stift.",
      ziel: fensterOder(() => finde("[data-mclick]")),
      start: (s) => (s.f = fp(() => [settings.bestellrahmen, einkaeufe])),
      fertig: (s) => fp(() => [settings.bestellrahmen, einkaeufe]) !== s.f && !fensterOffen(),
    },
  ]);

  kap("Heute", [
    hin("heute", "Dein Tag", "Tippe unten auf „Heute“."),
    info(
      "Alles für heute",
      "Oben siehst du, wie viel vom Tag erledigt ist, darunter den nächsten Termin, offene Rückrufe und Nachbereitungen. Weiter unten: dein Tag als Leiste und die Vorbereitung für nächste Woche. Ganz unten wächst dein Langzeitziel.",
    ),
    {
      titel: "Nachbereitung im Blick",
      text: () =>
        hOffen()
          ? "Hier stehen alle Termine, die noch nachbereitet werden müssen – ein Tipp öffnet den Termin. Schließ die Liste mit dem Kreuz."
          : "Tippe auf „Nachbereitung“ – so siehst du, was noch offen ist.",
      ziel: () => (hOffen() ? finde("#hFenster .hfbox") : finde("#hNb")),
      start: (s) => (s.auf = false),
      fertig: (s) => {
        if (hOffen()) s.auf = true;
        return !hOffen() && (s.auf || geklickt("#hNb")());
      },
    },
    {
      titel: "Offene Calls",
      text: () =>
        hOffen()
          ? "Hier landen Rückrufe und vorgemerkte Kontakte – mit Anrufen, Öffnen und Erledigt. Schließ die Liste wieder."
          : "Tippe auf „Offene Calls“: Hier landen Kunden, die du zurückrufen wolltest.",
      ziel: () => (hOffen() ? finde("#hFenster .hfbox") : finde("#hCalls")),
      start: (s) => (s.auf = false),
      fertig: (s) => {
        if (hOffen()) s.auf = true;
        return !hOffen() && (s.auf || geklickt("#hCalls")());
      },
    },
    { ...hin("heute", "Zurück zu „Heute“", "Tippe unten in der Leiste auf „Heute“."), seit: "1.9" },
    {
      titel: "Das ist Donna",
      text: "Deine Assistentin: Sie beantwortet Fragen aus deinen Daten und trägt Termine für dich ein – offline, nichts wird verschickt. Tippe auf „Frag Donna …“.",
      ziel: () => finde(".fpheute"),
      nav: true,
      fertig: () => !!document.querySelector(".fragpv.auf"),
      seit: "1.9",
    },
    {
      titel: "Frag etwas",
      text: "Tippe auf ein Beispiel unten oder schreib selbst eine Frage – zum Beispiel „Was steht morgen an?“ oder „Mein VK7 zeigt Error 11“. Zum Sprechen nimmst du das Mikrofon der Tastatur.",
      ziel: () => finde(".fragpv .fpchips") || finde(".fragpv .fpeingabe"),
      frei: [".fragpv .fpchip", ".fragpv input", ".fragpv .fpeingabe button", ".fragpv .fplog"],
      start: (s) => (s.n = document.querySelectorAll(".fragpv .fpb.pv").length),
      fertig: (s) => document.querySelectorAll(".fragpv .fpb.pv").length > s.n,
      seit: "1.9",
    },
    {
      titel: "Fenster schließen",
      text: "Mit 🔊 liest Donna Antworten vor. Schließ sie mit dem Kreuz – du findest sie hier auf „Heute“ und oben im Menü.",
      ziel: () => finde(".fragpv .fpzu"),
      fertig: () => !document.querySelector(".fragpv"),
      seit: "1.9",
    },
    {
      ...info(
        "Donna trägt Termine ein",
        "Sag oder schreib Donna einfach: „Buch mir einen Termin für Mario Müller morgen 12 Uhr“. Fehlt etwas – Quelle, Adresse, Telefon – fragt sie nach, prüft Überschneidungen und trägt erst nach deinem „Ja“ ein.",
        () => finde(".fpheute"),
      ),
      seit: "1.9.1",
    },
  ]);

  const verkauf = (nr, titel, text, kind) => ({
    titel,
    text: () => (fensterOffen() ? text : `Tippe auf „${titel}“.`),
    ziel: fensterOder(() => document.querySelectorAll("[data-vkweg]")[nr] || null),
    start: (s) => (s.n = zaehl(kind)),
    fertig: (s) => zaehl(kind) > s.n && !fensterOffen(),
  });
  kap("Verkäufe", [
    hin("verkaeufe", "Verkäufe"),
    info(
      "Vier Wege zum Verkauf",
      "Nicht jeder Verkauf ist ein Kundentermin. Hier trägst du Distanzverkäufe, Leads, Leervorführungen und Eigenkäufe ein. Probier alle vier einmal aus.",
    ),
    verkauf(0, "Distanzverkauf", "Kunde, Datum, Gebiet, Einheiten und Bruttoumsatz eintragen. Die Häkchen regeln die Provision. Dann „Verkauf eintragen“.", "distanz"),
    verkauf(1, "Leadverkauf", "Datum und Bruttoumsatz eintragen – du bekommst 5 % Provision. Dann „Eintragen“.", "lead"),
    verkauf(2, "Leervorführung", "Datum und Bruttoumsatz eintragen – 10 % Provision. Dann „Eintragen“.", "leer"),
    verkauf(3, "Eigenkauf", "Datum, Einheiten und Bruttoumsatz – zählt im Festgebiet. Dann „Eintragen“.", "eigenkauf"),
  ]);

  const person = (seiteK, knopf, titel, liste, text) => ({
    titel,
    text: () => (fensterOffen() ? text : `Tippe auf „${titel}“.`),
    ziel: fensterOder(() => finde(knopf)),
    start: (s) => (s.n = liste().length),
    fertig: (s) => liste().length > s.n && !fensterOffen(),
  });
  kap("Kunden", [
    hin("kunden", "Kundenliste"),
    info("Alle deine Kunden", "Jeder Kundentermin und jeder Distanzverkauf landet automatisch hier – mit Route, Anruf und Verlauf."),
    {
      titel: "Suchen",
      text: "Tipp ein paar Buchstaben deines Beispielkunden in die Suche.",
      ziel: () => finde("#kdSuche"),
      fertig: () => (($("#kdSuche") || {}).value || "").trim().length > 1,
    },
    {
      titel: "Filtern",
      text: "Tippe auf „Käufer“ – so siehst du nur Kunden mit Kauf.",
      ziel: () => textIn("[data-kdf]", "Käufer"),
      fertig: geklickt("[data-kdf]", "Käufer"),
    },
    {
      titel: "Alle zeigen",
      text: "Zurück auf „Alle“.",
      ziel: () => textIn("[data-kdf]", "Alle"),
      fertig: geklickt("[data-kdf]", "Alle"),
    },
    {
      titel: "Verlauf",
      text: () => (fensterOffen() ? "Das ist die Geschichte des Kunden. Schließ das Fenster wieder." : "Tippe bei einem Kunden auf „Verlauf“."),
      ziel: fensterOder(() => finde("[data-kdhist]")),
      start: (s) => (s.auf = false),
      fertig: (s) => {
        if (fensterOffen()) s.auf = true;
        return s.auf && !fensterOffen();
      },
    },
    {
      titel: "Folgetermin",
      text: () =>
        fensterOffen()
          ? "Datum, Uhrzeit und Quelle wählen, dann „Termin eintragen“. Die Kundendaten sind schon drin."
          : "Tippe bei einem Kunden auf „Termin anlegen“.",
      ziel: fensterOder(() => finde("[data-kdtermin]")),
      start: (s) => (s.n = Object.keys(entries).length),
      fertig: (s) => Object.keys(entries).length > s.n && !fensterOffen(),
    },
    hin("potenzial", "Potenzialliste"),
    person("potenzial", "#potNeu", "Person hinzufügen", () => potenzial, "Name und Adresse eintragen, die vorhandenen Geräte antippen und wann du wieder ansprichst. Dann „Speichern“."),
    hin("empfehlung", "Empfehlungsliste"),
    person("empfehlung", "#empNeu", "Empfehlung hinzufügen", () => empfehlungen, "Name, Adresse und von wem die Empfehlung kommt – dann „Speichern“."),
    hin("interessenten", "Interessenten"),
    person("interessenten", "#intNeu", "Interessent hinzufügen", () => interessenten, "Wer Interesse hat, aber noch keinen Termin: Name und Telefon reichen. Dann „Speichern“."),
  ]);

  kap("Zahlen", [
    hin("statistik", "Statistik"),
    info("Deine Woche in Zahlen", "Verkäufe, Einheiten, Umsatz und alle Termine der Woche – mit Vergleich zur Vorwoche."),
    {
      titel: "Statistik als PDF",
      text: () =>
        fensterOffen()
          ? "Wähle die Woche. „PDF erstellen“ öffnet das Teilen-Menü – oder tippe auf „Abbrechen“."
          : "Tippe auf „Als PDF laden“.",
      ziel: fensterOder(() => finde("#statPdfBtn")),
      start: (s) => (s.auf = false),
      fertig: (s) => {
        if (fensterOffen()) s.auf = true;
        return s.auf && !fensterOffen();
      },
    },
    hin("auswertungen", "Auswertungen"),
    {
      titel: "Zeitraum",
      text: "Tippe auf „13 Wochen“ – die Auswertung rechnet über ein Quartal.",
      ziel: () => textIn("[data-rw]", "13 Wochen"),
      fertig: geklickt("[data-rw]", "13 Wochen"),
    },
    {
      titel: "Wochenmeldung kopieren",
      text: "Tippe auf „Als Text kopieren“ – so schickst du deine Zahlen per Nachricht.",
      ziel: () => finde("[data-meldcopy]"),
      fertig: geklickt("[data-meldcopy]"),
    },
    hin("jahr", "Jahresrückblick"),
    {
      titel: "Zahlen nachtragen",
      text: "Warst du schon vor der App dabei? Hier trägst du alte Monate nach. Gib Einheiten und Umsatz ein und tippe auf „Nachtragen“.",
      ziel: () => finde("#ntSpeichern")?.closest(".asec, .karte, section, div") || finde("#ntSpeichern"),
      frei: ["#ntJahr", "#ntMonat", "#ntEinheiten", "#ntUmsatz", "#ntAuftraege", "#ntFgAbger", "[data-ntm]", "#ntSpeichern"],
      start: (s) => (s.f = fp(() => nachtrag)),
      fertig: (s) => fp(() => nachtrag) !== s.f,
    },
    { ...hin("jahr", "Jahresrückblick"), seit: "1.8" },
    {
      ...info(
        "Abrechnung als PDF",
        "Noch schneller: Mit diesem Knopf wählst du deine Provisionsabrechnung als PDF. Provisio liest Einheiten, Nettoumsatz, Aufträge und abgerechneten FG-Umsatz – als Teamleiterin auch Teamumsatz und Berufseinsteiger – und zeigt alles zur Kontrolle. Die PDF wird nicht gespeichert.",
        () => finde("#pdfJahr"),
      ),
      seit: "1.8",
    },
    { ...hin("jahr", "Jahresrückblick"), seit: "1.9" },
    {
      ...info(
        "Monat antippen",
        "Jeder Vertriebsmonat lässt sich antippen. Mit übernommener PDF siehst du dort Online- und Shop-Verkäufe mit Provision, Provision insgesamt, Festgebietsprämie, Umsatzsteuer, Ausgaben und deine Überweisung. Monate mit Abrechnung haben einen grünen Punkt.",
        () => finde(".atable tbody tr.maklick"),
      ),
      seit: "1.9",
    },
  ]);

  kap("Geld und Ziele", [
    hin("provision", "Provisionsrechner", "Tippe unten auf „Provision“."),
    info(
      "Deine Überweisung",
      "Oben die Summe, darunter, woraus sie besteht: Fest- und Weißgebiet, K70, Sonstiges, Team und Versicherungszuschuss.",
    ),
    {
      titel: "Was wäre, wenn …",
      text: "Wie viel mehr bekämst du mit einer Einheit mehr? Tippe auf das Plus.",
      ziel: () => textIn("[data-pvwenn]", "+") || finde("[data-pvwenn]"),
      frei: ["[data-pvwenn]"],
      fertig: geklickt("[data-pvwenn]"),
    },
    {
      titel: "Details",
      text: "Unten klappen Details auf – Prämienstufen, Stundenlohn, Ausgleich. Tippe auf einen davon.",
      ziel: () => finde("#page-provision [data-klapp]"),
      frei: ["[data-klapp]", ".klapp"],
      fertig: geklickt("[data-klapp]"),
    },
    hin("wunsch", "Provisionswunsch"),
    {
      titel: "Was willst du verdienen?",
      text: "Trag dein Wunsch-Einkommen ein – die App rechnet aus, wie viele Termine und Abschlüsse du dafür brauchst.",
      ziel: () => finde("#w_einkommen")?.closest(".grp, .field, div") || finde("#w_einkommen"),
      frei: ["[data-wf]", "#useQuote", "input"],
      start: (s) => (s.f = fp(() => wunsch)),
      fertig: (s) => fp(() => wunsch) !== s.f,
    },
    hin("ziele", "Ziele"),
    info("Club, Nadel und Vian", "Club of Excellence, Kobold Club, Goldene Nadel – und für Teamleiter der Vian. Die Balken füllen sich mit deinen Zahlen."),
    {
      titel: "Eigenes Langzeitziel",
      text: () =>
        fensterOffen()
          ? "Wofür sparst du? Betrag und Datum eintragen, dann „Speichern“. Das Ziel erscheint auch auf „Heute“."
          : "Tippe auf „Eigenes Langzeitziel“.",
      ziel: fensterOder(() => finde("#lzNeu")),
      start: (s) => (s.f = fp(() => settings.langziel)),
      fertig: (s) => fp(() => settings.langziel) !== s.f && !fensterOffen(),
    },
    { ...hin("jobtickets", "Jobtickets"), seit: "1.8" },
    {
      titel: "Jobticket zählen",
      text: "Hier zählst du Jobtickets und qualifizierte Anmeldungen fürs Jahr – sie fließen in deine Ziele. Tippe bei „Zusätzliche Jobtickets“ auf Plus.",
      ziel: () => finde('#jobt [data-jplus="jbManuell"]') || finde("#jobt [data-jplus]"),
      frei: ["[data-jplus]", "[data-jminus]"],
      start: (s) => (s.f = fp(() => jobtickets)),
      fertig: (s) => fp(() => jobtickets) !== s.f,
      seit: "1.8",
    },
  ]);

  kap("Unterwegs", [
    hin("inventur", "K70 im Kofferraum", "Tippe unten auf „K70“."),
    {
      titel: "Bestand zählen",
      text: "Was liegt im Kofferraum? Tippe bei einem Artikel auf Plus.",
      ziel: () => finde("#page-inventur [data-plus]"),
      frei: ["[data-plus]", "[data-minus]", "[data-katzu]"],
      start: (s) => (s.f = fp(() => inventur)),
      fertig: (s) => fp(() => inventur) !== s.f,
    },
    {
      titel: "Suchen",
      text: "Tipp einen Artikel oder Preis in die Suche – ein Vorschlag lässt sich direkt antippen.",
      ziel: () => finde("#invSuche"),
      frei: ["#invVorschlaege", "[data-inv]"],
      fertig: () => (($("#invSuche") || {}).value || "").trim().length > 1,
    },
    {
      titel: "Nur Vorhandenes",
      text: "Tippe auf „Nur Vorhandene“ – so siehst du, was wirklich da ist.",
      ziel: () => textIn("[data-invda]", "Nur"),
      fertig: geklickt("[data-invda]", "Nur"),
    },
    hin("fahrten", "Fahrtenbuch"),
    {
      titel: "Fahrt eintragen",
      text: () =>
        fensterOffen()
          ? "Business oder Privat, Zeiten, Start und Ziel, Kilometerstand – dann „Fahrt eintragen“."
          : "Tippe auf „Fahrt hinzufügen“.",
      ziel: fensterOder(() => finde("#fbNeu")),
      start: (s) => (s.n = fahrten.length),
      fertig: (s) => fahrten.length > s.n && !fensterOffen(),
    },
  ]);

  kap("Einstellungen", [
    hin("profil", "Einstellungen"),
    {
      titel: "Profil",
      text: () => (unterOffen() ? "Hier änderst du Name und Vertriebsdaten. Tippe oben links auf „Einstellungen“, um zurückzugehen." : "Tippe oben auf dein Profil."),
      ziel: () => (unterOffen() ? finde(".unter .unterzurueck") : finde("#esProfil")),
      unter: true,
      start: (s) => (s.auf = false),
      fertig: (s) => {
        if (unterOffen()) s.auf = true;
        return s.auf && !unterOffen();
      },
    },
    info(
      "Darstellung",
      "Hell oder dunkel, Glas-Effekt, weniger Bewegung und der iPhone-Duo-Modus. Das gilt nur auf diesem Gerät.",
      () => finde("[data-thema]")?.closest(".esgrp"),
    ),
    {
      titel: "Must-have-Artikel",
      text: () =>
        unterOffen()
          ? "Schalte einen Artikel ein – er wird in der Inventur hervorgehoben. Dann zurück zu den Einstellungen."
          : "Tippe auf „Must-have-Artikel“.",
      ziel: () => (unterOffen() ? $(".unter:last-of-type") : finde("#esMusthave")),
      unter: true,
      start: (s) => ((s.auf = false), (s.f = fp(() => store.get("bw-katalog")))),
      fertig: (s) => {
        if (unterOffen()) s.auf = true;
        return s.auf && !unterOffen();
      },
    },
    {
      titel: "Versionsverlauf",
      text: () =>
        unterOffen()
          ? "Tippe auf eine Version, um zu lesen, was neu ist – dann zurück bis zu den Einstellungen."
          : "Tippe auf „Versionsverlauf“.",
      ziel: () => (unterOffen() ? $(".unter:last-of-type") : finde("#esVersionen")),
      unter: true,
      start: (s) => (s.auf = false),
      fertig: (s) => {
        if (unterOffen()) s.auf = true;
        return s.auf && !unterOffen();
      },
    },
    info(
      "Sicherheit und Daten",
      "Passwort ändern, neuer Wiederherstellungs-Code, Daten sichern und einspielen. Sichere deine Daten regelmäßig – sie liegen nur auf diesem Gerät.",
      () => finde("#esPw")?.closest(".esgrp"),
    ),
    {
      titel: "Teamleitung ausprobieren",
      text: "Tippe bei „Rolle“ auf „Teamleitung“. Am Ende stellt die App deine echte Rolle wieder her.",
      ziel: () => finde('[data-rolle="TL"]'),
      fertig: () => istTeamleiter(),
      wenn: () => true,
    },
  ]);

  const d2dFeld = () =>
    [...document.querySelectorAll("button.slot.filled[data-day][data-hour]")].find((el) => {
      const e = entries[key(el.dataset.day, +el.dataset.hour)];
      return e && e.kind === "d2d" && sichtbar(el);
    }) || null;
  kap("Door to Door", [
    { ...hin("profil", "Zu den Einstellungen"), seit: "1.8" },
    {
      titel: "Weitere Funktionen",
      text: () =>
        unterOffen()
          ? settings.d2d
            ? "Eingeschaltet! Tippe oben links auf „Einstellungen“, um zurückzugehen."
            : "Schalte „Door to Door Selling“ ein."
          : "Etwas versteckt: Tippe unten in den Einstellungen auf „Weitere Funktionen“.",
      ziel: () => (unterOffen() ? $(".unter:last-of-type") : finde("#esWeitere")),
      unter: true,
      fertig: () => !!settings.d2d && !unterOffen(),
      seit: "1.8",
    },
    { ...hin("planer", "Zurück in den Planer"), seit: "1.8" },
    {
      titel: "Door to Door anlegen",
      text: () =>
        anlegeText({
          leer: "Tippe auf ein freies Feld – dort planst du deinen Einsatz an den Türen.",
          wahl: "Door to Door Selling",
          d2dneu: "Von und Bis einstellen, dann „Speichern“.",
          sonst: "Folge dem Fenster bis „Speichern“.",
        }),
      ziel: fensterOder(() => freiesFeld([17, 16, 18, 15, 10, 11])),
      start: (s) => (s.n = zaehl("d2d")),
      fertig: (s) => zaehl("d2d") > s.n && !fensterOffen(),
      seit: "1.8",
    },
    {
      titel: "Strichliste an der Tür",
      text: () =>
        fensterOffen()
          ? "Jede Kachel ist ein Zähler: Tippe dreimal auf „Türen“. Mit Minus nimmst du einen Strich zurück. Darunter: Kontakt merken, Kurz raus, Verkauf erfassen und Kein Kauf."
          : "Tippe auf deinen Door-to-Door-Einsatz.",
      ziel: fensterOder(() => d2dFeld()),
      fertig: () => Object.values(entries).some((e) => e && e.kind === "d2d" && (+(e.nb || {}).tueren || 0) >= 3),
      seit: "1.8",
    },
    {
      titel: "Kurz raus",
      text: () =>
        fensterOffen()
          ? "Jemand will einen Termin? Tippe auf „Kurz raus“ – du landest im Planer und siehst deine Woche."
          : "Tippe auf deinen Door-to-Door-Einsatz.",
      ziel: fensterOder(() => d2dFeld()),
      fertig: () => !!(window.d2dKurzRaus && window.d2dKurzRaus()) && !fensterOffen(),
      seit: "1.8.2",
    },
    {
      titel: "Zurück an die Tür",
      text: "Termin vereinbart? Mit dem grünen Knopf bist du sofort wieder in deiner Strichliste.",
      ziel: () => finde("#d2dZurueck"),
      fertig: () => fensterOffen() && !document.getElementById("d2dZurueck"),
      seit: "1.8.2",
    },
    {
      titel: "Einsatz schließen",
      text: "„Kontakt merken“ legt einen Interessenten an, „Kein Kauf“ einen Eintrag in der Potenzialliste, „Verkauf erfassen“ führt durch Kundendaten und Nachbereitung. Alles wird sofort gespeichert – schließ das Fenster jetzt mit dem Kreuz.",
      ziel: () => (fensterOffen() ? finde("#sheet header .x") || $("#sheet") : null),
      fertig: () => !fensterOffen(),
      seit: "1.8",
    },
  ]);

  kap("Team", [
    hin("team", "Teammitglieder"),
    {
      titel: "Teammitglied anlegen",
      text: () => (fensterOffen() ? "Name eintragen, dann „Speichern“." : "Tippe auf „Teammitglied hinzufügen“."),
      ziel: fensterOder(() => finde("#tmOhneApp")),
      start: (s) => (s.n = (settings.teamManuell || []).length),
      fertig: (s) => (settings.teamManuell || []).length > s.n && !fensterOffen(),
    },
    {
      titel: "Wochenmeldung eintragen",
      text: () =>
        fensterOffen()
          ? "Wähle deinen Anteil (10, 6 oder 4 %) und trag die Zahlen der Woche ein. Dann „Woche speichern“."
          : "Tippe beim Teammitglied auf „Meldung eintragen“.",
      ziel: fensterOder(() => finde("[data-mmel]")),
      start: (s) => (s.f = fp(() => settings.teamMeldungen)),
      fertig: (s) => fp(() => settings.teamMeldungen) !== s.f && !fensterOffen(),
    },
    { ...hin("team", "Teammitglieder"), seit: "1.8", wenn: () => istTeamleiter() && (settings.teamManuell || []).length > 0 },
    {
      titel: "Andere Woche nachtragen",
      text: () =>
        fensterOffen()
          ? "Oben wählst du jede Woche dieses Vertriebsmonats – so trägst du auch eine vergangene Woche nach. Zahl eintragen, dann „Woche speichern“."
          : "Unter jedem Teammitglied stehen die Wochen des Vertriebsmonats – grün ist schon eingetragen. Tippe auf eine noch graue Woche.",
      ziel: fensterOder(() => finde(".tmwochen button:not(.da)") || finde(".tmwochen button")),
      start: (s) => (s.f = fp(() => settings.teamMeldungen)),
      fertig: (s) => fp(() => settings.teamMeldungen) !== s.f && !fensterOffen(),
      seit: "1.8",
      wenn: () => istTeamleiter() && (settings.teamManuell || []).length > 0,
    },
    hin("teammeldung", "Wochenmeldung"),
    {
      titel: "Wochen vergleichen",
      text: "Mit den Pfeilen blätterst du durch die Meldungen deines Teams. Tippe auf den Pfeil zurück.",
      ziel: () => finde("#tmmVor"),
      fertig: geklickt("#tmmVor"),
    },
    hin("teamumsatz", "Teamumsatz"),
    {
      titel: "Teamumsatz eintragen",
      text: () => (fensterOffen() ? "Betrag eintragen und speichern." : "Tippe auf ein Feld und trag einen Monatsumsatz deines Teams ein."),
      ziel: fensterOder(() => finde("[data-tu]")),
      frei: ["[data-tu]", "input"],
      start: (s) => (s.f = fp(() => teamumsatz)),
      fertig: (s) => fp(() => teamumsatz) !== s.f && !fensterOffen(),
    },
    hin("ziele", "Vian"),
    {
      titel: "Anmeldung für den Vian",
      text: () =>
        fensterOffen()
          ? "Name und Einstellungsdatum eintragen, dann „Hinzufügen“. Die Qualifizierung trägst du später nach."
          : "Tippe beim Vian auf das Plus.",
      ziel: fensterOder(() => finde("#vianNeu")),
      start: (s) => (s.n = (settings.anmeldungen || []).length),
      fertig: (s) => (settings.anmeldungen || []).length > s.n && !fensterOffen(),
    },
  ]);

  kap("Aufräumen", [
    info(
      "Du kennst jetzt alles",
      "Jede Seite, jedes Fenster, jede Funktion – einmal selbst gemacht. Jetzt räumst du die Beispiele weg.",
    ),
    hin("profil", "Zu den Einstellungen"),
    {
      anker: "loeschen",
      titel: "Alle Beispiele löschen",
      text: () =>
        snapLeer()
          ? "Tippe unter „Daten“ auf „Alle Einträge zurücksetzen“ und bestätige zweimal. Damit sind alle Beispiele weg."
          : "Deine echten Daten wurden vor der Einführung gesichert. Tippe hier auf „Beispiele löschen“ – alles ist wieder wie vorher.",
      ziel: () => (snapLeer() ? finde("#esLeeren") : null),
      knopf: () => (snapLeer() ? null : ["Beispiele löschen", () => abschliessen()]),
      fertig: () => snapLeer() && datenLeer(),
    },
  ]);

  /* ---------- Welche Schritte laufen: alles oder nur das Neue ---------- */
  const STAND = "1.9.1"; // bei jedem Update mit neuen Funktionen anheben und Schritte mit seit: markieren
  const NEU_LISTE = [
    {
      ...info(
        `Neu in Beta ${STAND}`,
        "Seit deinem letzten Besuch ist einiges dazugekommen. In ein paar Minuten probierst du jede neue Funktion einmal aus – mit XP und Abzeichen. Danach wird wieder alles aufgeräumt.",
      ),
      kap: "Neu",
      zweit: ["Später", () => ueberspringen()],
    },
    /* gefüllt beim Start: alles, was seit dem letzten Stand dazukam */
    {
      titel: "Alles Neue gesehen",
      text: "Deine echten Daten wurden vorher gesichert. Tippe auf „Fertig“ – die Beispiele verschwinden und alles ist wie vorher.",
      knopf: () => ["Fertig", () => abschliessen()],
      kap: "Neu",
    },
  ];
  let LISTE = KAPITEL;
  const aelter = (a, b) => {
    const x = String(a).split(".").map(Number),
      y = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
    return false;
  };
  const listeFuer = (modus) => {
    if (modus !== "neu") return KAPITEL;
    const seit = settings.einfuehrungStand || "0";
    const neu = KAPITEL.filter((k) => k.seit && aelter(seit, k.seit));
    return [NEU_LISTE[0], ...neu, NEU_LISTE[NEU_LISTE.length - 1]];
  };

  function snapLeer() {
    if (!T.snap) return true;
    try {
      const d = JSON.parse(T.snap);
      return (
        !Object.keys(d.entries || {}).length &&
        !(d.potenzial || []).length &&
        !(d.empfehlungen || []).length &&
        !(d.interessenten || []).length &&
        !(d.fahrten || []).length
      );
    } catch (e) {
      return true;
    }
  }

  /* ---------- Oberfläche ---------- */
  let wurzel, ring, dimm, karte, laufTakt, pruefTakt, ueberspringTakt;
  function bauen() {
    if (wurzel) return;
    wurzel = document.createElement("div");
    wurzel.id = "tut";
    wurzel.innerHTML = `<div class="tutdimm"></div><div class="tutring"></div>
      <section class="tutkarte" role="dialog" aria-live="polite">
        <button type="button" class="tutkopf" aria-label="Karte ein- oder ausklappen">
          <span class="tutkap"></span><span class="tutzahl"></span></button>
        <div class="tutbalken"><i></i></div>
        <b class="tuttitel"></b>
        <p class="tuttext"></p>
        <div class="tutknoepfe"></div>
        <button type="button" class="tutweg" hidden>Klappt nicht? Schritt überspringen</button>
      </section>`;
    document.body.appendChild(wurzel);
    ring = wurzel.querySelector(".tutring");
    dimm = wurzel.querySelector(".tutdimm");
    karte = wurzel.querySelector(".tutkarte");
    karte.querySelector(".tutkopf").onclick = () => karte.classList.toggle("klein");
    karte.querySelector(".tutweg").onclick = () => weiter(true);
  }

  function zielVon(st) {
    try {
      const z = typeof st.ziel === "function" ? st.ziel() : st.ziel ? finde(st.ziel) : null;
      return z && sichtbar(z) ? z : null;
    } catch (e) {
      return null;
    }
  }

  /* Zugeklapptes iPhone Duo: Die Leiste steht rechts statt unten */
  function ort(t) {
    if (!t || !document.documentElement.classList.contains("duo-zu")) return t;
    return t
      .replace(/Tippe unten in der Leiste/g, "Tippe rechts in der Leiste")
      .replace(/Tippe unten auf/g, "Tippe rechts auf")
      .replace(/Unten ist deine Leiste/g, "Rechts ist deine Leiste");
  }
  let letztesZiel = null;
  function zeichnen() {
    if (!T.aktiv) return;
    if (karte.classList.contains("level")) {
      laufTakt = requestAnimationFrame(zeichnen);
      return;
    }
    const st = LISTE[T.i];
    if (!st) return;
    const z = zielVon(st);
    if (z !== letztesZiel) {
      letztesZiel = z;
      if (z && !fensterOffen() && !z.closest("#tabbar") && !z.closest("#drawer")) {
        const r = z.getBoundingClientRect();
        if (r.top < 80 || r.bottom > innerHeight - 120) z.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    if (z) {
      const r = z.getBoundingClientRect();
      const p = z === $("#sheet") || z.classList.contains("unter") ? 0 : 6;
      ring.style.cssText = `opacity:1;left:${r.left - p}px;top:${r.top - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px;border-radius:${p ? 18 : 24}px`;
      dimm.style.opacity = "0";
      /* Karte weg vom Ziel */
      const mitte = r.top + r.height / 2;
      const inUnter = !!z.closest(".unter");
      const oben = inUnter
        ? mitte > innerHeight * 0.55 && r.height < innerHeight * 0.5
        : fensterOffen() || mitte > innerHeight * 0.52 || r.height > innerHeight * 0.6;
      karte.classList.toggle("oben", oben);
    } else {
      ring.style.opacity = "0";
      dimm.style.opacity = st.info ? "1" : "0";
      karte.classList.toggle("oben", fensterOffen());
    }
    const txt = ort(typeof st.text === "function" ? st.text() : st.text);
    const te = karte.querySelector(".tuttext");
    if (te.textContent !== txt) te.textContent = txt;
    laufTakt = requestAnimationFrame(zeichnen);
  }

  function karteFuellen() {
    const st = LISTE[T.i];
    const kapitel = [...new Set(LISTE.map((k) => k.kap))].filter((k) => k !== "Willkommen");
    karte.querySelector(".tutkap").textContent =
      T.modus === "neu"
        ? `Neu in Beta ${STAND}`
        : st.kap === "Willkommen"
          ? `Einführung · ${kapitel.length} Level`
          : `Level ${kapitel.indexOf(st.kap) + 1} von ${kapitel.length} · ${st.kap}`;
    karte.querySelector(".tutzahl").innerHTML = `<span class="tutxp">★ ${T.xp || 0} XP</span>`;
    karte.querySelector(".tutbalken i").style.width = `${((T.i + 1) / LISTE.length) * 100}%`;
    karte.querySelector(".tuttitel").textContent = st.titel;
    karte.classList.remove("geschafft", "klein");
    const kn = karte.querySelector(".tutknoepfe");
    kn.innerHTML = "";
    const extra = st.knopf && st.knopf();
    if (st.info || extra) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tutlos";
      b.textContent = extra ? extra[0] : T.i === 0 ? "Los geht’s" : "Weiter";
      b.onclick = extra ? extra[1] : () => weiter();
      kn.appendChild(b);
    }
    if (st.zweit) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tutzweit";
      b.textContent = st.zweit[0];
      b.onclick = st.zweit[1];
      kn.appendChild(b);
    }
    const weg = karte.querySelector(".tutweg");
    weg.hidden = true;
    clearTimeout(ueberspringTakt);
    if (!st.info) ueberspringTakt = setTimeout(() => (weg.hidden = false), 45000);
    karte.classList.remove("rein");
    void karte.offsetWidth;
    karte.classList.add("rein");
  }

  function schrittStarten() {
    const st = LISTE[T.i];
    if (!st) return abschliessen();
    if (st.wenn && !st.wenn()) return weiter(true);
    /* Schon auf der richtigen Seite: Navigationsschritt still überspringen */
    try {
      if (st.nav && st.fertig && st.fertig()) return weiter(true);
    } catch (e) {}
    if (!st.nav && menueOffen() && typeof setMenu === "function") setMenu(false);
    /* Tastatur und Vorschlagslisten vom vorigen Schritt schließen */
    const fokus = document.activeElement;
    if (fokus && /INPUT|TEXTAREA|SELECT/.test(fokus.tagName) && !fokus.closest("#modal")) fokus.blur();
    try {
      if (typeof invVorschlagZu === "function") invVorschlagZu();
    } catch (e) {}
    T.s = {};
    T.klicks = [];
    T.geschafft = false;
    T.seit = Date.now();
    letztesZiel = null;
    try {
      if (st.start) st.start(T.s);
    } catch (e) {
      console.warn("Einführung:", e);
    }
    karteFuellen();
    sichern();
  }

  function weiter(ohneHaken) {
    clearTimeout(ueberspringTakt);
    const st = LISTE[T.i] || {};
    if (!ohneHaken) {
      karte.classList.add("geschafft");
      let plus = st.info ? 5 : 10;
      const schnell = !st.info && Date.now() - T.seit < 12000;
      if (schnell) plus += 5;
      T.xp = (T.xp || 0) + plus;
      xpZeigen(plus, schnell);
      try {
        if (typeof stups === "function") stups(12);
      } catch (e) {}
    }
    T.geschafft = true;
    setTimeout(
      () => {
        const alt = st.kap;
        T.i++;
        if (T.i >= LISTE.length) return abschliessen();
        const neu = LISTE[T.i] && LISTE[T.i].kap;
        if (T.modus !== "neu" && alt && neu && alt !== neu && alt !== "Willkommen") return levelKarte(alt, neu);
        schrittStarten();
      },
      ohneHaken ? 0 : 650,
    );
  }

  /* ---------- Spiel: XP, Level, Abzeichen ---------- */
  const ABZEICHEN = {
    Planer: "🗓️", Heute: "☀️", "Verkäufe": "💶", Kunden: "👥", Zahlen: "📊", "Geld und Ziele": "🎯",
    Unterwegs: "🚗", Einstellungen: "⚙️", "Door to Door": "🚪", Team: "🤝", "Aufräumen": "🧹",
  };
  function xpZeigen(plus, schnell) {
    const x = karte.querySelector(".tutxp");
    if (x) x.textContent = `★ ${T.xp} XP`;
    const f = document.createElement("span");
    f.className = "tutplus";
    f.textContent = `+${plus} XP${schnell ? " · schnell!" : ""}`;
    karte.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }
  function levelKarte(alt, neu) {
    const kapitel = [...new Set(LISTE.map((k) => k.kap))].filter((k) => k !== "Willkommen");
    const nr = kapitel.indexOf(alt);
    T.abzeichen = [...new Set([...(T.abzeichen || []), alt])];
    sichern();
    karte.classList.remove("geschafft", "oben", "klein");
    karte.classList.add("level");
    ring.style.opacity = "0";
    dimm.style.opacity = "1";
    karte.querySelector(".tutkap").textContent = `Level ${nr + 1} geschafft`;
    karte.querySelector(".tuttitel").innerHTML = `<span class="tutabz">${ABZEICHEN[alt] || "🏅"}</span>${alt}`;
    karte.querySelector(".tuttext").textContent = `Abzeichen „${alt}“ freigeschaltet. Weiter geht’s mit ${neu}.`;
    karte.querySelector(".tutbalken i").style.width = `${((nr + 1) / kapitel.length) * 100}%`;
    const kn = karte.querySelector(".tutknoepfe");
    kn.innerHTML = `<div class="tutkarte-level">${kapitel
      .map((k) => `<span class="${(T.abzeichen || []).includes(k) ? "an" : ""}" title="${k}">${ABZEICHEN[k] || "•"}</span>`)
      .join("")}</div><button type="button" class="tutlos">Weiter zu Level ${nr + 2}: ${neu}</button>`;
    kn.querySelector(".tutlos").onclick = () => {
      karte.classList.remove("level");
      schrittStarten();
    };
    karte.classList.remove("rein");
    void karte.offsetWidth;
    karte.classList.add("rein");
  }

  function zuAnker(name) {
    const i = LISTE.findIndex((k) => k.anker === name);
    if (i < 0 || i === T.i) return;
    T.i = i;
    schrittStarten();
  }

  function pruefen() {
    if (!T.aktiv || T.geschafft) return;
    const st = LISTE[T.i];
    if (!st || st.info) return;
    /* Vorschlagslisten der Suche überdecken sonst das nächste Ziel */
    if (!(st.frei || []).includes("#invVorschlaege")) {
      const v = document.getElementById("invVorschlaege");
      if (v && !v.hidden && typeof invVorschlagZu === "function") {
        invVorschlagZu();
        const f = document.getElementById("invSuche");
        if (f) f.blur();
      }
    }
    try {
      if (st.fertig && st.fertig(T.s)) return weiter();
      /* Bedingung verloren (Fenster zu, Termin gelöscht) → einen Schritt zurück */
      if (st.zurueck && !fensterOffen() && Date.now() - T.seit > 400) return zuAnker(st.zurueck);
      const zurueck = st.pruef && st.pruef();
      if (zurueck) return zuAnker(zurueck);
    } catch (e) {
      console.warn("Einführung:", e);
    }
  }

  /* ---------- Sperre: nur der Lichtkreis ist bedienbar ---------- */
  function erlaubt(el, st) {
    if (!el || !el.closest) return true;
    if (el.closest("#tut") || el.closest("#duoDreh")) return true;
    if (st.info) return !!el.closest("#modal") && !st.ziel; // Info-Schritte: nur die Karte
    if (el.closest("#modal") || el.closest("#hFenster")) return true; // Fenster sind immer bedienbar
    if (st.unter && el.closest(".unter")) return true;
    const z = zielVon(st);
    if (z && (z === el || z.contains(el))) return true;
    /* Das Menü darf auf dem Weg zum Ziel geöffnet und geschlossen werden */
    if (menueOffen() && (el.closest("#menueZu") || el.closest("#scrim"))) return true;
    return (st.frei || []).some((s) => el.closest(s));
  }
  function sperre(ev) {
    if (!T.aktiv) return;
    if (!ev.isTrusted) return; // Klicks, die die App selbst auslöst (z. B. „Mehr“ → Menü)
    const st = LISTE[T.i];
    if (!st) return;
    if (erlaubt(ev.target, st)) {
      if (ev.type === "click") T.klicks.push(ev.target);
      return;
    }
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (ev.type === "click" && karte) {
      karte.classList.remove("stups");
      void karte.offsetWidth;
      karte.classList.add("stups", "aufgeklappt");
      karte.classList.remove("klein");
    }
  }
  ["click", "mousedown", "pointerdown", "pointerup"].forEach((t) => document.addEventListener(t, sperre, true));
  document.addEventListener(
    "focusin",
    (ev) => {
      if (!T.aktiv) return;
      const st = LISTE[T.i];
      if (st && !erlaubt(ev.target, st) && ev.target.blur) ev.target.blur();
    },
    true,
  );

  /* ---------- Start, Fortsetzen, Ende ---------- */
  function starten(fortsetzen, modus) {
    bauen();
    if (modus) T.modus = modus;
    LISTE = listeFuer(T.modus);
    if (!fortsetzen) {
      T.xp = 0;
      T.abzeichen = [];
      const blob = clean(dataBlob());
      if (blob.settings) {
        delete blob.settings.einfuehrung;
        delete blob.settings.einfuehrungFertig;
      }
      T.snap = JSON.stringify(blob);
      T.rolle = me && me.rolle;
      /* Must-have-Auswahl liegt im Gerätespeicher – mitsichern */
      try {
        T.kat = { gespeichert: !!store.get("bw-katalog"), liste: JSON.stringify(katalog.liste) };
      } catch (e) {
        T.kat = null;
      }
      T.i = 0;
      T.kk = null;
    }
    T.aktiv = true;
    document.body.classList.add("tut-an");
    wurzel.hidden = false;
    if (typeof closeModal === "function" && fensterOffen()) closeModal();
    if (typeof setMenu === "function") setMenu(false);
    schrittStarten();
    cancelAnimationFrame(laufTakt);
    laufTakt = requestAnimationFrame(zeichnen);
    clearInterval(pruefTakt);
    pruefTakt = setInterval(pruefen, 250);
  }
  window.einfuehrungStarten = (modus) => starten(false, modus || "voll");
  function ueberspringen() {
    T.uebersprungen = true;
    abschliessen();
  }

  async function abschliessen() {
    clearInterval(pruefTakt);
    cancelAnimationFrame(laufTakt);
    T.aktiv = false;
    try {
      if (fensterOffen()) closeModal();
      while (unterOffen()) unterseiteSchliessen();
    } catch (e) {}
    try {
      const d = T.snap ? JSON.parse(T.snap) : null;
      applyData(d);
    } catch (e) {
      applyData(null);
    }
    settings.einfuehrungFertig = true;
    settings.einfuehrungStand = STAND;
    delete settings.einfuehrung;
    try {
      if (T.kat && T.kat.liste) {
        katalog.liste = JSON.parse(T.kat.liste);
        if (T.kat.gespeichert) store.set("bw-katalog", katalog.liste);
        else store.del("bw-katalog");
      }
    } catch (e) {}
    if (me && T.rolle && me.rolle !== T.rolle) {
      me.rolle = T.rolle;
      try {
        await userSet(me);
      } catch (e) {}
    }
    dataReady = true;
    saveData();
    try {
      if (typeof renderMenu === "function") renderMenu();
      renderAll();
    } catch (e) {}
    /* Abschlusskarte */
    karte.classList.remove("oben", "klein", "geschafft");
    karte.classList.add("ende");
    wurzel.classList.add("tutende");
    ring.style.opacity = "0";
    dimm.style.opacity = "1";
    const ueber = T.uebersprungen;
    T.uebersprungen = false;
    karte.querySelector(".tutkap").textContent = ueber ? "Einführung übersprungen" : T.modus === "neu" ? `Neu in Beta ${STAND}` : "Alle Level geschafft";
    karte.querySelector(".tutzahl").innerHTML = ueber ? "" : `<span class="tutxp">★ ${T.xp || 0} XP</span>`;
    karte.querySelector(".tutbalken i").style.width = "100%";
    karte.querySelector(".tuttitel").textContent = ueber ? "Viel Erfolg!" : T.modus === "neu" ? "Du bist auf dem neuesten Stand" : "Die App gehört dir";
    karte.querySelector(".tuttext").textContent = ueber
      ? "Du kannst die Einführung jederzeit unter Einstellungen → Info → Einführung starten nachholen."
      : T.modus === "neu"
        ? "Alle neuen Funktionen ausprobiert, die Beispiele sind weg."
        : "Alle Beispiele sind gelöscht. Du kennst jede Funktion – jetzt geht es mit deinen echten Terminen los. Die Einführung kannst du jederzeit in den Einstellungen wiederholen.";
    karte.querySelector(".tutweg").hidden = true;
    const kn = karte.querySelector(".tutknoepfe");
    const abz = (T.abzeichen || []).map((k) => ABZEICHEN[k] || "🏅").join("");
    kn.innerHTML = `${!ueber && abz ? `<div class="tutkarte-level alle">${abz}</div>` : ""}<button type="button" class="tutlos">Los geht’s</button>`;
    kn.querySelector("button").onclick = () => {
      wurzel.hidden = true;
      karte.classList.remove("ende");
      wurzel.classList.remove("tutende");
      document.body.classList.remove("tut-an");
      location.hash = "#heute";
    };
  }
  window.einfuehrungAbschliessen = abschliessen;

  /* Nach dem Anmelden: fortsetzen oder bei neuen Zugängen starten */
  function pruefeStart() {
    if (!me || T.aktiv) return;
    const st = settings.einfuehrung;
    if (st && typeof st.i === "number") {
      T.modus = st.modus || "voll";
      LISTE = listeFuer(T.modus);
      T.xp = st.xp || 0;
      T.abzeichen = st.abzeichen || [];
      T.i = Math.min(st.i, LISTE.length - 1);
      T.snap = st.snap || null;
      T.rolle = st.rolle || (me && me.rolle);
      T.kk = st.kk || null;
      T.kat = st.kat || null;
      /* Fortsetzen am Anfang eines Ankerschritts, falls ein Fenster nötig war */
      const k = LISTE[T.i];
      if (k && k.zurueck) {
        const a = LISTE.findIndex((x) => x.anker === k.zurueck);
        if (a >= 0) T.i = a;
      }
      return warteAufRuhe(() => starten(true));
    }
    if (!settings.einfuehrungFertig && datenLeer()) return warteAufRuhe(() => starten(false, "voll"));
    /* Bestehende Nutzer: nach einem Update nur das Neue */
    const demoOhne = window.DEMO_AKTIV && !/demo=neu/.test(location.search);
    if (!demoOhne && aelter(settings.einfuehrungStand || "0", STAND) && listeFuer("neu").length > 2) warteAufRuhe(() => starten(false, "neu"));
  }
  /* Erst starten, wenn kein anderes Fenster (z. B. Wiederherstellungs-Code) offen ist */
  function warteAufRuhe(fn) {
    const login = document.getElementById("login");
    if (!me) return; // abgemeldet – beim nächsten Anmelden wird neu geprüft
    if (fensterOffen() || (login && !login.hidden)) return setTimeout(() => warteAufRuhe(fn), 600);
    setTimeout(() => {
      /* in der Zwischenzeit abgemeldet? Dann nicht starten */
      if (!me || (login && !login.hidden)) return;
      if (fensterOffen()) return warteAufRuhe(fn);
      fn();
    }, 400);
  }
  if (typeof window.starteSitzung === "function") {
    const sitzungOhneEinfuehrung = window.starteSitzung;
    window.starteSitzung = async function () {
      const r = await sitzungOhneEinfuehrung.apply(this, arguments);
      try {
        pruefeStart();
      } catch (e) {
        console.warn("Einführung:", e);
      }
      return r;
    };
  }

  /* Abmelden beendet die Anzeige (der Stand bleibt gespeichert) */
  if (typeof logout === "function") {
    const abmeldenOhne = logout;
    logout = async function () {
      if (T.aktiv) {
        sichern();
        T.aktiv = false;
        clearInterval(pruefTakt);
        cancelAnimationFrame(laufTakt);
        if (wurzel) wurzel.hidden = true;
        document.body.classList.remove("tut-an");
      }
      return abmeldenOhne.apply(this, arguments);
    };
  }

  /* Einstellungen: Einführung wiederholen */
  if (typeof renderProfil === "function") {
    const profilOhne = renderProfil;
    renderProfil = async function () {
      const r = await profilOhne.apply(this, arguments);
      const v = document.getElementById("esVersionen");
      if (v && !document.getElementById("esEinfuehrung")) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = v.className;
        b.id = "esEinfuehrung";
        b.innerHTML = `<span class="eszt">Einführung starten</span><em>${settings.einfuehrungFertig ? "erledigt" : ""}</em>${typeof CHEV === "string" ? CHEV : ""}`;
        b.onclick = () => {
          if (T.aktiv) return;
          if (confirm("Einführung starten? Deine Daten werden vorher gesichert und am Ende exakt wiederhergestellt.")) {
            location.hash = "#heute";
            setTimeout(() => starten(false, "voll"), 300);
          }
        };
        v.parentNode.insertBefore(b, v);
      }
      return r;
    };
  }

  /* Für Tests */
  window.einfuehrungKapitel = KAPITEL;
  Object.defineProperty(window, "einfuehrungListe", { get: () => LISTE });
  window.einfuehrungZiel = () => (T.aktiv && LISTE[T.i] ? zielVon(LISTE[T.i]) : null);
})();
