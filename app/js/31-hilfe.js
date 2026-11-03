/**
 * Hilfe
 *
 * Hilfeseite und geführter Rundgang.
 */
const FAQ = [
  [
    "Heute",
    "Zeigt die Termine des heutigen Tages mit Adresse, Notiz und Knöpfen zum Anrufen und Navigieren. Ganz oben stehen anstehende Anrufe und Termine, die noch keine Nachbereitung haben.",
  ],
  [
    "Planer",
    "Das Wochenraster. Ein Tipp auf ein freies Feld legt einen Termin an, ein Tipp auf einen Termin öffnet ihn. Gedrückt halten und dann ein freies Feld antippen verschiebt ihn. Unten die Kennzahlen ist/soll.",
  ],
  [
    "Terminarten",
    "Kundentermin mit Quelle · Terminieren als FGB Bestandskunden, FGB Door to Door oder Promotion · Premium CheckIn · Meeting · Eigenkauf ohne Kundendaten · Privat und Individuell blockieren die Zeit nur optisch.",
  ],
  [
    "Nachbereitung",
    "Nach dem Termin auf den Eintrag tippen und den Status wählen. Die Blöcke klappen zu, sobald sie vollständig sind. „Zwischenspeichern“ sichert auch unvollständig, „Abschließen“ prüft auf Vollständigkeit.",
  ],
  [
    "Termin starten",
    "Im Block „Echte Zeiten“ setzen zwei Knöpfe Start- und Endzeit auf die aktuelle Uhrzeit — dadurch stimmt die Stundenauswertung ohne Schätzen.",
  ],
  [
    "Zählmodus",
    "Beim Terminieren öffnet „Einsatz starten“ vier große Zählflächen. Ein Tipp zählt hoch, das kleine Minus zieht ab. „Kurz raus“ sichert den Stand und schließt die Zählfläche, damit du zwischendurch einen Termin eintragen kannst. Der Knopf heißt danach „Einsatz fortsetzen“ und die Startzeit bleibt stehen — überschrieben wird sie nie. „Kontakt merken“ legt jemanden, der später noch einmal angesprochen werden will, direkt in die Potenzialliste. Erst „Einsatz beenden“ schreibt die Endzeit.",
  ],
  [
    "Datierte Aufträge",
    "Verkaufst du heute, wird aber später geliefert, trägst du unter „Späteres Lieferdatum“ das Datum ein. Der Umsatz zählt sofort in die Statistik, aber erst im Vertriebsmonat der Lieferung in die Provision.",
  ],
  [
    "Anrufe",
    "Der Happy Call erscheint 21 Tage nach der Lieferung, die Terminbestätigung fünf Tage vor jedem Premium CheckIn. Mit „Erledigt“ verschwindet der Eintrag.",
  ],
  [
    "Potenzialliste",
    "Kunden ohne Kauf landen hier mit dem, was ihnen fehlt. „Wieder ansprechen am“ holt sie zum richtigen Zeitpunkt nach oben.",
  ],
  [
    "Empfehlungsliste",
    "Empfehlungen aus der Nachbereitung — oder von Hand angelegt. Wird ein Termin daraus, verschwindet der Eintrag.",
  ],
  [
    "Statistik",
    "Die Wochentabelle nach dem Buchkalender. Der PDF-Knopf druckt die Woche auf eine Querseite.",
  ],
  [
    "Auswertungen",
    "Kennzahlen über den gewählten Zeitraum. Der kleine Pfeil oben rechts an jedem Block startet dessen Zählung neu.",
  ],
  [
    "K70 Inventur",
    "Der Shop in Originalreihenfolge. Bestand über Plus und Minus zählen, oben suchen nach Artikel oder Preis.",
  ],
  [
    "Provisionswunsch",
    "Trag ein, was du verdienen willst — daraus entstehen nötige Termine und die Soll-Werte im Planer.",
  ],
  [
    "Provisionsrechner",
    "Rechnet den laufenden Vertriebsmonat mit allen Sätzen und Boni. Der K70-Einkauf wird netto als Warenkredit abgezogen.",
  ],
  [
    "Jahresrückblick",
    "Alle Vertriebsmonate netto mit Vorjahresvergleich und Diagramm. Unten lassen sich Zahlen für beliebige Jahre nachtragen.",
  ],
  ["Kalender", "Im Profil abonnierst du deine Termine für Apple oder Google Kalender."],
  [
    "Offline",
    "Über „Zum Home-Bildschirm“ wird die App installiert und funktioniert ohne Empfang. Oben rechts steht immer, ob gespeichert wurde.",
  ],
];
function renderFaq() {
  const box = document.getElementById("faq");
  if (!box) return;
  box.innerHTML = `<div class="asec">
      <h3>Hilfe</h3>
      <p class="sub">Alle Funktionen zum Nachlesen.</p>
      ${FAQ.map(([t, x]) => `<details class="faq"><summary>${t}</summary><p>${x}</p></details>`).join("")}
      <div class="actions" style="margin-top:20px"><button class="btn" id="faqTour">Rundgang noch einmal ansehen</button></div>
    </div>`;
  document.getElementById("faqTour").onclick = () => tourStart(false);
}
const TOUR = [
  {
    seite: "heute",
    ziel: null,
    t: "Willkommen",
    x: "Diese App ersetzt deinen Wochenplaner aus Papier. Sie erfasst Termine und rechnet daraus Statistik, Provision und Ziele. Ich zeige dir einmal alles — am Ende startest du mit leeren Daten.",
  },

  {
    seite: "heute",
    ziel: "#heute .asec",
    t: "Heute",
    x: "Deine Startseite: die Termine des Tages mit Adresse und Notiz, dazu Knöpfe zum Anrufen und Navigieren. Ganz oben stehen fällige Anrufe und Termine, die noch nachbereitet werden müssen.",
  },

  {
    seite: "planer",
    ziel: "#grid",
    t: "Der Planer",
    x: "Das Wochenraster mit den Fächerterminen von 7 bis 24 Uhr. Auf dem Handy siehst du einen Tag — oben über der Leiste Mo bis So wechselst du. Ein Tipp auf ein freies Feld legt einen Termin an, ein Tipp auf einen Termin öffnet ihn. Gedrückt halten und dann ein freies Feld antippen verschiebt ihn.",
  },

  {
    seite: "planer",
    ziel: "#grid",
    t: "Termin anlegen",
    x: "Erst die Art wählen, dann bei Kundenterminen die Quelle, dann die Kundendaten. Die Adresse wird von Hand eingetippt. Wenn du den Kunden schon einmal hattest, erscheint er über den Feldern zum Übernehmen — so entstehen keine Doppelten.",
  },

  {
    seite: "planer",
    ziel: "#grid",
    t: "Nachbereitung",
    x: "Beim Öffnen eines Kundentermins setzt du oben mit einem Tipp Start- und Endzeit und danach den Status. Darunter füllst du die Blöcke aus. „Zwischenspeichern“ sichert ohne Prüfung, „Abschließen“ prüft alle Pflichtfelder und springt zum ersten, das fehlt. Wer nicht kauft, landet über ein eigenes Fenster in der Potenzialliste.",
  },

  {
    seite: "planer",
    ziel: "#grid .metriclbl",
    t: "Deine Zahlen im Blick",
    x: "Unten im Planer stehen Festgebiet, Weißgebiet und K70 als Ist und Soll. Der farbige Punkt zeigt, ob du im Plan liegst. Ein Tipp auf „K70 Einkauf“ erfasst eine Bestellung, „K70 Verkauf“ setzt den Bestellrahmen.",
  },

  {
    seite: "statistik",
    ziel: "#statTable",
    t: "Statistik",
    x: "Jeder nachbereitete Kundentermin wird eine Zeile — genau wie im Buchkalender. Auf dem Handy siehst du stattdessen eine Karte je Termin. Der PDF-Knopf druckt die Woche auf eine Querseite.",
  },

  {
    seite: "auswertungen",
    ziel: "#ausw .asec",
    t: "Auswertungen",
    x: "Deine Quoten über eine Woche bis zu einem Jahr, dazu wann und wo du am erfolgreichsten terminierst. Ganz unten steht die Wochenmeldung zum Kopieren für deinen Teamleiter.",
  },

  {
    seite: "kunden",
    ziel: "#kunden .asec",
    t: "Kundenliste",
    x: "Baut sich von selbst aus allen Terminen auf. Jeder Kunde steht genau einmal drin, auch wenn der Name mal anders geschrieben wurde. Mit Verlauf, Umsatz, vorhandenen Geräten und einem Knopf für den nächsten Termin.",
  },

  {
    seite: "potenzial",
    ziel: "#plist",
    t: "Potenzial und Empfehlungen",
    x: "Wer nicht gekauft hat, landet automatisch in der Potenzialliste mit dem, was ihm noch fehlt, und einer Wiedervorlage. Direkt daneben liegt die Empfehlungsliste mit allen Namen aus deinen Nachbereitungen — aus beiden legst du mit einem Tipp einen Termin an.",
  },

  {
    seite: "wiedervorlage",
    ziel: "#wvliste",
    t: "Wiedervorlage",
    x: "Jeder Kunde mit einem Rückmelde-Monat steht hier — überfällig zuerst, danach der laufende Monat, dann alles Weitere. Setzen kannst du eine Wiedervorlage im Kein-Kauf-Fenster, unten in der Nachbereitung oder jederzeit über die Kundenliste.",
  },

  {
    seite: "inventur",
    ziel: "#inventur .asec",
    t: "K70 Inventur",
    x: "Der komplette Shop in Originalreihenfolge. Kategorien lassen sich zuklappen, das merkt sich die App. Bestand über Plus und Minus zählen, oben nach Artikel oder Preis suchen. Der Warenbestand fließt in den Provisionsrechner.",
  },

  {
    seite: "wunsch",
    ziel: "#wunschForm",
    t: "Provisionswunsch",
    x: "Drei Angaben genügen: Wunscheinkommen, Abschlussquote und Arbeitstage. Darunter steht, wie viele Termine du dafür pro Monat, Woche und Tag brauchst — und der Planer weiß dann täglich, wie viel noch fehlt.",
  },

  {
    seite: "provision",
    ziel: "#prov .kpis",
    t: "Provisionsrechner",
    x: "Rechnet deinen laufenden Vertriebsmonat mit allen Sätzen und Boni, zieht den K70-Warenkredit ab und zeigt, was überwiesen wird. Die Blöcke darunter zeigen auf Wunsch den ganzen Rechenweg.",
  },

  {
    seite: "ziele",
    ziel: "#ziele .zsec",
    t: "Ziele",
    x: "Club of Excellence, Kobold Club und die Goldene Nadel mit Fortschrittsbalken. Jeder Weg zum Ziel steht einzeln da, erreicht reicht einer. Die Nadel zählt über deine ganze Zeit, nicht nur über dieses Jahr.",
  },

  {
    seite: "jobtickets",
    ziel: "#jobt .asec",
    t: "Jobtickets",
    x: "Geschriebene Jobtickets kommen automatisch aus deinen Kundenterminen. Wird daraus eine qualifizierte Anmeldung — angestellt und die ersten 5.000 Euro netto geschrieben — trägst du sie hier ein. Sie zählt direkt bei den Zielen mit.",
  },

  {
    seite: "fahrten",
    ziel: "#fahrtenbuch .asec",
    t: "Fahrtenbuch",
    x: "Jede Fahrt einzeln: Zeiten, Start- und Zieladresse, Tachostand und ob geschäftlich oder privat. Das Datum setzt sich von selbst. Am Monatsende gibt es eine Tabelle mit getrennten Summen.",
  },

  {
    seite: "jahr",
    ziel: "#jahr .asec",
    t: "Jahresrückblick",
    x: "Alle Vertriebsmonate im Vergleich zum Vorjahr. Warst du vor der App schon dabei, trag deine Zahlen hier nach — sie zählen für die Goldene Nadel mit.",
  },

  {
    seite: "profil",
    ziel: "#profil .asec",
    t: "Profil",
    x: "Name, E-Mail-Adresse, hell oder dunkel und das Kalenderabo für Apple oder Google. Wichtig für die Ziele: trag dein Einstellungsdatum ein. Wer weniger als 52 Wochen dabei ist, gilt als Berufseinsteiger. Ganz unten sicherst du bei Bedarf deine Daten.",
  },

  {
    seite: "teamumsatz",
    ziel: "#tumsatz .asec",
    nur: "tl",
    t: "Nur für Teamleiter",
    x: "Unter Teamumsatz trägst du je Vertriebsmonat den Umsatz deines Teams ein und getrennt davon den deiner Berufseinsteiger — beides zählt bei deinen Zielen. Unter Teammitglieder siehst du die Woche jedes Beraters.",
  },

  {
    seite: "faq",
    ziel: null,
    t: "Los geht’s",
    x: "Unter Hilfe steht jede Funktion noch einmal in Ruhe erklärt, und von dort kannst du diesen Rundgang jederzeit wiederholen. Mit „Fertig“ werden alle Beispieldaten gelöscht und du startest sauber.",
  },
];
var tourListe = TOUR;
let tourSchritt = 0,
  tourLoescht = false;
function tourStart(mitReset) {
  tourListe = TOUR.filter((t) => t.nur !== "tl" || istTeamleiter());
  tourSchritt = 0;
  tourLoescht = !!mitReset;
  closeModal();
  document.body.classList.add("tourlaeuft");
  tourZeigen();
}
function tourEnde(aufraeumen) {
  document.body.classList.remove("tourlaeuft");
  document.querySelectorAll(".tourziel").forEach((el) => el.classList.remove("tourziel"));
  document.getElementById("tourkarte")?.remove();
  if (aufraeumen) {
    applyData(null);
    dataReady = true;
    clearTimeout(saveTimer);
    flushSave();
    renderAll();
  }
}
function tourZeigen() {
  const t = tourListe[tourSchritt];
  const letzte = tourSchritt === tourListe.length - 1;
  location.hash = "#" + t.seite;
  show(t.seite);
  setMenu(false);

  document.querySelectorAll(".tourziel").forEach((el) => el.classList.remove("tourziel"));
  if (t.ziel) {
    const el = document.querySelector(t.ziel);
    if (el) {
      el.classList.add("tourziel");
      setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    }
  } else {
    scrollTo({ top: 0, behavior: "smooth" });
  }

  let karte = document.getElementById("tourkarte");
  if (!karte) {
    karte = document.createElement("div");
    karte.id = "tourkarte";
    document.body.appendChild(karte);
  }
  karte.innerHTML = `
    <div class="tk-kopf">
      <span class="tk-zahl">${tourSchritt + 1} / ${tourListe.length}</span>
      ${letzte ? "" : `<button class="tk-weg" id="tourWeg">überspringen</button>`}
    </div>
    <b>${t.t}</b>
    <p>${t.x}</p>
    <div class="tourpunkte">${tourListe.map((_, i) => `<i class="${i === tourSchritt ? "an" : ""}"></i>`).join("")}</div>
    <div class="actions">
      ${tourSchritt ? `<button class="btn" id="tourZurueck">Zurück</button>` : ""}
      <button class="btn primary" id="tourWeiter">${letzte ? (tourLoescht ? "Fertig und aufräumen" : "Fertig") : "Weiter"}</button>
    </div>`;
  const weg = document.getElementById("tourWeg");
  if (weg) weg.onclick = () => tourEnde(false);
  const zur = document.getElementById("tourZurueck");
  if (zur)
    zur.onclick = () => {
      tourSchritt--;
      tourZeigen();
    };
  document.getElementById("tourWeiter").onclick = () => {
    if (letzte) {
      tourEnde(tourLoescht);
      return;
    }
    tourSchritt++;
    tourZeigen();
  };
}
