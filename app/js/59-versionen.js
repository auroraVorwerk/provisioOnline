/**
 * Versionsverlauf
 *
 * Kurze Liste der Versionen; ein Tipp öffnet, was sich jeweils geändert hat.
 * Neue Versionen kommen oben in VERSIONEN dazu. Bis der Verlauf einmal
 * angesehen wurde, trägt der Eintrag in den Einstellungen einen Punkt.
 */
const VERSIONEN = [
  {
    v: "Online 1.1",
    datum: "November 2026",
    kurz: "Frag Provisio, Monatsansicht im Jahresrückblick",
    teile: [
      [
        "Neu",
        [
          "Frag Provisio: dein Assistent auf „Heute“ und oben im Menü. Er beantwortet Fragen aus deinen eigenen Daten – Termine, freie Zeit, Umsatz, Provision, Überweisung, Ziele, Kunden, Team, K70, Kilometer und wo es bei FGB, Promo oder Kundenterminen hakt. Er versteht auch anders formulierte Fragen und Folgefragen wie „und letzte Woche?“. Keine echte KI: alles läuft auf dem Gerät, nichts wird verschickt.",
          "Kobold-Wissen im Assistenten (Reparaturhandbuch Deutschland, Stand 11/2026): Fehlercodes für VK7, VR7 und VR300, LED-Anzeigen und Störungen aller Geräte und Aufsätze, Reparaturpauschalen, welche Modelle noch repariert werden, Garantie, Ablauf und Kontakt des Reparaturservices sowie Roboter-Updates Schritt für Schritt.",
          "Antworten vorlesen lassen (🔊). Zum Sprechen nutzt du das Mikrofon der iPhone-Tastatur.",
          "Jahresrückblick: Jeden Vertriebsmonat antippen. Mit übernommener PDF siehst du Umsatz, Festgebietsumsatz, Einheiten, Aufträge, Online- und Shop-Umsatz mit der Provision daraus (Kontakt 5 % plus Festgebietsprämie) und ihrem Anteil an deiner Provision, Provision insgesamt, Festgebietsprämie, Umsatzsteuer, Ausgaben und Verrechnungen sowie die Überweisung.",
          "PDF-Import liest dafür die Zusammenfassung und die Kundenaufträge aus – egal, in welcher Reihenfolge die Seiten liegen.",
          "Einführung um den Assistenten und die Monatsansicht ergänzt.",
        ],
      ],
    ],
  },
  {
    v: "Online 1.0.1",
    datum: "November 2026",
    kurz: "Sicherheit vor dem Pentest",
    teile: [
      [
        "Neu",
        [
          "Einladungscodes erstellst du jetzt für eine bestimmte DK-Nummer – nur diese Person kann sich damit registrieren.",
          "Einstellungen → Online-Konto → „Auf allen Geräten abmelden“.",
        ],
      ],
      [
        "Sicherheit",
        [
          "Mehrere Verbesserungen vor dem externen Sicherheitstest – Details unter Security 2.1.",
          "Die erste Anmeldung nach dem Update dauert einmalig etwas länger: Der Zugang wird auf die stärkere Verschlüsselung umgestellt.",
        ],
      ],
    ],
  },
  {
    v: "Security 2.1",
    datum: "3. November 2026",
    ab: "Online 1.0.1",
    kurz: "Härtung vor dem externen Penetrationstest",
    teile: [
      ["Geltungsbereich", ["Gilt für Provisio Online ab Version 1.0.1: Eingabe und Anzeige aller Daten, Schlüsselableitung, Ablage des Nutzersatzes auf dem Gerät, Einbetten in fremde Seiten, PDF-Einlesen sowie Registrierung, Anmeldung, Sitzungen und Begrenzung von Fehlversuchen an der Schnittstelle."]],
      [
        "Anlass",
        [
          "Vorbereitung auf einen externen Penetrationstest. Eine eigene Prüfung ergab: Eingeschleustes HTML wurde bis zum nächsten Laden der App angezeigt, aber durch die Content-Security-Policy an der Ausführung gehindert. Weitere Punkte betreffen Stand der Technik und Härtung, nicht bekannte Angriffe.",
          "Online: Die Bremse je IP-Adresse ließ sich durch eine gefälschte Absender-Angabe umgehen; das wurde bei der eigenen Prüfung festgestellt und behoben.",
        ],
      ],
      [
        "Maßnahmen",
        [
          "Eingaben werden schon beim Tippen und Einfügen entschärft: Spitze Klammern sowie einfache und doppelte Anführungszeichen werden in jedem Textfeld sofort durch gleich aussehende, unschädliche Zeichen ersetzt. Eingeschleustes Markup kann dadurch zu keinem Zeitpunkt in die Oberfläche gelangen – auch nicht vor dem nächsten Laden der App. Die Content-Security-Policy, die fremde und eingebettete Skripte blockiert, bleibt als zweite Schutzschicht bestehen.",
          "Schlüsselableitung verstärkt: PBKDF2-SHA-256 mit 600.000 statt 150.000 Iterationen (OWASP-Empfehlung 2023). Bestehende Zugänge werden beim nächsten Anmelden automatisch umgestellt; ältere Sicherungsdateien lassen sich weiterhin öffnen.",
          "Name, Rolle und Teamliste liegen im Gerätespeicher jetzt ebenfalls verschlüsselt (AES-256-GCM mit dem Master Key). Unverschlüsselt bleiben nur DK-Nummer und die umschlossenen Schlüssel, die zum Anmelden nötig sind.",
          "Schutz gegen Einbetten in fremde Seiten (Clickjacking): Wird die App in einem fremden Rahmen geöffnet, bleibt sie unsichtbar und startet nicht.",
          "PDF-Leser aktualisiert auf pdf.js 6.4.299 (zuvor 3.11.174). Damit ist die Lücke CVE-2024-4367 auch in der Bibliothek selbst behoben; die Ausführung von Code aus PDF-Dateien bleibt zusätzlich abgeschaltet (isEvalSupported: false).",
          "Einladungscodes gelten nur noch für die DK-Nummer, für die sie erstellt wurden. Eine Registrierung unter fremder DK-Nummer ist damit ausgeschlossen.",
          "Sperre nach Fehlversuchen gilt je Konto und Absender (IP-Adresse): Ein Angreifer kann ein fremdes Konto nicht mehr absichtlich für die Inhaberin sperren. Zusätzlich höchstens 50 Fehlversuche je Konto und Tag über alle Absender.",
          "Die Absender-Adresse wird nur noch aus der vom Scaleway-Eingang gesetzten Angabe (X-Real-IP) gelesen. Die vom Client fälschbare Angabe X-Forwarded-For wird nicht mehr verwendet.",
          "Abmelden beendet die Sitzung auch auf dem Server (Sperrliste je Konto). Neu: „Auf allen Geräten abmelden“, etwa bei Verlust eines Geräts. Eine Passwortänderung beendet alle Sitzungen.",
        ],
      ],
      [
        "Hinweise",
        [
          "Die App wird während der Testphase über GitHub Pages ausgeliefert. Dort lassen sich HTTP-Sicherheitsheader (z. B. X-Frame-Options, frame-ancestors, Permissions-Policy) nicht frei setzen; die Content-Security-Policy ist als Meta-Angabe gesetzt, der Schutz gegen Einbetten im Code umgesetzt. Für den Regelbetrieb ist eine interne Adresse mit eigener Datenbank vorgesehen, auf der diese Header serverseitig gesetzt werden.",
          "Für Nutzerinnen und Nutzer ändert sich nichts. Die erste Anmeldung nach dem Update dauert einmalig etwas länger.",
          "Einladungscodes, die vor Version 1.0.1 erstellt wurden, gelten bis zu ihrem Ablauf weiter.",
        ],
      ],
    ],
  },
  {
    v: "Online 1.0",
    datum: "November 2026",
    kurz: "Provisio Online: Anmeldung, Abgleich zwischen iPhone und iPad",
    teile: [
      [
        "Neu",
        [
          "Eigene Online-Version neben der Offline-App, mit eigenem Symbol (grüne Wolke). Die Offline-App bleibt unverändert und unabhängig.",
          "Registrieren nur mit Einladungscode: Teamleitungen erstellen Codes unter Einstellungen → Online-Konto. Jeder Code gilt einmal und 7 Tage.",
          "Deine Daten werden automatisch zwischen deinen Geräten abgeglichen – Ende-zu-Ende-verschlüsselt. Ohne Internet arbeitest du ganz normal weiter, der Abgleich holt alles nach.",
          "Haben zwei Geräte ohne Internet denselben Eintrag geändert, gilt die neuere Fassung. Die ältere findest du unter Einstellungen → Online-Konto → Konflikte und kannst sie zurückholen.",
          "Online-Konto löschen: entfernt Konto und alle Daten vom Server.",
          "Stand der App-Funktionen: Beta 1.8.2. Die iPad-Ansicht folgt; anmelden kannst du dich auf iPhone und iPad schon jetzt.",
        ],
      ],
    ],
  },
  {
    v: "Security 2.0",
    datum: "3. November 2026",
    ab: "Online 1.0",
    kurz: "Online-Betrieb mit Ende-zu-Ende-Verschlüsselung (EU-Hosting)",
    teile: [
      [
        "Geltungsbereich",
        [
          "Gilt ausschließlich für Provisio Online (eigene Adresse, eigenes App-Symbol). Die Offline-App ist nicht betroffen: Sie speichert weiterhin nur auf dem Gerät und baut keine Verbindungen auf.",
          "Betroffen sind die Anmeldung, die Registrierung, die Passwort-Wiederherstellung und der Abgleich aller Arbeitsdaten zwischen den Geräten eines Kontos.",
        ],
      ],
      [
        "Anlass",
        [
          "Mit Provisio Online verlassen Daten erstmals das Gerät. Ziel ist, dass der Betreiber des Servers und jeder, der Zugriff auf den Speicher erlangt, die Inhalte nicht lesen kann.",
        ],
      ],
      [
        "Maßnahmen",
        [
          "Ende-zu-Ende-Verschlüsselung: Alle Arbeitsdaten (Termine, Kundinnen und Kunden, Umsätze, Einstellungen) sowie Name, Rolle und Team werden auf dem Gerät verschlüsselt, bevor sie übertragen werden. Der Server speichert ausschließlich Chiffrat.",
          "Auch die Bezeichnungen der Datensätze sind verschleiert. Erkennbar sind für den Server nur Anzahl, Größe und Zeitpunkt von Änderungen.",
          "Das Passwort und der Wiederherstellungs-Code verlassen das Gerät nie. Ohne eines von beiden kann niemand die Daten entschlüsseln – auch nicht der Betreiber. Ein Zurücksetzen durch Dritte ist deshalb nicht möglich.",
          "Registrierung nur mit Einladungscode (einmalig, 7 Tage gültig, serverseitig nur als Hash gespeichert).",
          "Schutz vor Ausprobieren: Sperre nach 5 Fehlversuchen je Konto (15 Minuten, bei Wiederholung länger), zusätzlich Begrenzung je IP-Adresse. Falsche Angaben und unbekannte DK-Nummern erhalten dieselbe Antwort, damit sich nicht erkennen lässt, welche Konten existieren.",
          "Sitzungen laufen nach 12 Stunden ab. Eine Passwortänderung beendet sofort alle Sitzungen auf anderen Geräten.",
          "Die Schnittstelle nimmt Anfragen aus dem Browser nur von der eigenen App-Adresse an (CORS), überträgt ausschließlich über HTTPS und speichert keine Antworten zwischen.",
          "Online-Konto löschen entfernt Konto und Daten sofort und vollständig vom Server.",
        ],
      ],
      [
        "Technische Umsetzung",
        [
          "Inhalte: AES-256-GCM mit dem Master Key des Kontos, je Datensatz ein neuer zufälliger 96-Bit-Initialisierungsvektor. Der Master Key wird auf dem Gerät erzeugt und nur umschlossen gespeichert (mit Passwort bzw. Wiederherstellungs-Code, PBKDF2-SHA-256, 150.000 Iterationen, 128-Bit-Salt).",
          "Anmeldung: Aus dem Passwort wird auf dem Gerät mit PBKDF2-SHA-256 (150.000 Iterationen, eigener Zweck-Salt) ein Prüfwert abgeleitet. Nur dieser geht an den Server, der ihn zusätzlich mit HMAC-SHA-256 und einem geheimen Server-Schlüssel (Pepper) hasht und zeitkonstant vergleicht. Der Prüfwert lässt keinen Rückschluss auf den Schlüssel zum Entschlüsseln zu.",
          "Kennungen der Datensätze: HMAC-SHA-256 mit einem per HKDF aus dem Master Key abgeleiteten Schlüssel. Konten liegen unter einer HMAC der DK-Nummer, nicht unter der DK-Nummer selbst.",
          "Sitzungen: zustandslose, mit HMAC-SHA-256 signierte Token; sie sind an den aktuellen Passwort-Stand gebunden. Das Token liegt nur im Arbeitsspeicher, nicht im Gerätespeicher.",
          "Abgleich: optimistische Nebenläufigkeit mit Revisionsnummern und bedingten Schreibzugriffen; parallele Änderungen gehen nicht verloren.",
          "Hosting: Scaleway SAS (Frankreich), Region Paris (fr-par) – Serverless Functions und privater Object Storage in der EU. Die App selbst wird als statische Seite über GitHub Pages ausgeliefert und enthält keine Zugangsdaten. Content-Security-Policy erlaubt Verbindungen nur zur eigenen Schnittstelle.",
          "Auf dem Gerät liegen die Daten wie bisher verschlüsselt (Origin Private File System), getrennt von der Offline-App.",
        ],
      ],
      [
        "Hinweise für Nutzerinnen und Nutzer",
        [
          "Wiederherstellungs-Code getrennt vom Gerät aufbewahren. Ohne Passwort und Code sind die Daten auch für den Betreiber nicht wiederherstellbar.",
          "Ein sicheres, nur für Provisio genutztes Passwort wählen.",
          "Auf gemeinsam genutzten Geräten nach der Arbeit abmelden.",
          "Die Online-Version befindet sich in der Testphase und wird durch ein externes Unternehmen auf Schwachstellen geprüft (Penetrationstest).",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.8.2",
    datum: "November 2026",
    kurz: "Eigene Zeile als Berufseinsteiger, Door to Door in der Einführung",
    teile: [
      [
        "Verbessert",
        [
          "PDF-Import: Auch deine eigene Zeile zählt zu „davon Berufseinsteiger“, wenn du am Abrechnungsende höchstens 52 Wochen dabei bist.",
          "Einführung: Door to Door jetzt mit „Kurz raus“ und dem Weg zurück an die Tür.",
          "Die Update-Tour zeigt alles, was seit deiner letzten Tour neu ist – auch wenn du eine Version übersprungen hast.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.8",
    datum: "November 2026",
    kurz: "PDF-Abrechnung, Door to Door, Einführung als Spiel",
    teile: [
      [
        "Neu",
        [
          "Abrechnung als PDF übernehmen – im Jahresrückblick und im Teamumsatz: Provisio findet die Leistungsübersicht, gleicht deine Partner-Nummer ab und liest Einheiten, Nettoumsatz, Aufträge und abgerechneten FG-Umsatz. Als Teamleiterin dazu Teamumsatz netto („Summe mit TL“) und den Umsatz aller Berufseinsteiger (bis 52 Wochen dabei). Alles auf volle Euro abgerundet, zur Kontrolle angezeigt; die PDF wird nicht gespeichert.",
          "Door to Door Selling als eigene Terminart (Einstellungen → Weitere Funktionen): Strichliste auf einer Seite und die Knöpfe Kontakt merken, Kurz raus, Verkauf erfassen und Kein Kauf.",
          "Jobtickets wieder als Menüpunkt unter „Geld und Ziele“ – ohne Kampagnen.",
          "Team-Wochenmeldung: jede Woche des Vertriebsmonats lässt sich nachtragen, übersichtlich in Gruppen mit Plus und Minus.",
          "Einführung als Spiel: Level, XP und Abzeichen. Mit „Ich kenne Provisio schon“ überspringbar. Nach Updates gibt es eine kurze Tour nur durch das Neue.",
        ],
      ],
      [
        "Verbessert",
        [
          "Teamprovision: Satz und Betrag stehen in geraden Spalten, ohne Erklärtext.",
          "Wochenmeldung im Team: gerade Spalten, die Namensspalte bleibt beim Wischen deckend stehen.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.7.4",
    datum: "Oktober 2026",
    kurz: "Versionsverlauf getrennt nach App und Security",
    teile: [
      [
        "Verbessert",
        [
          "Versionsverlauf in zwei Spalten: links die App-Versionen, rechts die Security-Versionen.",
          "Security-Versionen sind als Sicherheitshinweis geschrieben – Geltungsbereich, Maßnahmen, technische Umsetzung und Hinweise – zum Nachlesen und Weitergeben, etwa an eine Rechtsabteilung.",
          "Einstellungen zeigen beide aktuellen Stände.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.7.3",
    datum: "Oktober 2026",
    kurz: "Auslastung ruhiger: nur die Zahl färbt sich",
    teile: [
      [
        "Verbessert",
        [
          "Statt farbiger Kacheln färbt sich nur noch das Datum – je voller der Tag, desto kräftiger grün und fetter. Abwesende Tage haben eine orange Zahl. Gilt im Planer und in der KW-Übersicht.",
          "KW-Übersicht: Wochennummern und Tage zählen beim Öffnen nicht mehr kurz hoch, sondern stehen sofort richtig da.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.7",
    datum: "Oktober 2026",
    kurz: "Wochenmeldung: Promotion nach Gebiet",
    teile: [
      [
        "Verbessert",
        [
          "Wochenmeldung: Promotion getrennt nach Fest- und Weißgebiet – mit Kontakten, Terminen, Einheiten und Umsatz je Gebiet. Es steht nur da, was stattgefunden hat; ohne Promotion steht „Promotion 0“.",
          "Auch die Prognose zeigt geplante Promotions getrennt nach FG und WG.",
          "Team-Wochenmeldung und Excel-Export mit eigenen Spalten für FG und WG; von Hand eingetragene Meldungen fragen beides getrennt ab.",
        ],
      ],
      ["Entfernt", ["Empfehlungen aus der Wochenmeldung."]],
    ],
  },
  {
    v: "Security 1.1",
    datum: "30. Oktober 2026",
    ab: "Beta 1.6",
    kurz: "Verschlüsselung von Sicherungsdateien und Tageskopien",
    teile: [
      [
        "Geltungsbereich",
        [
          "Gilt für alle Daten, die Provisio außerhalb des laufenden Arbeitsspeichers ablegt oder an das Betriebssystem übergibt: die Sicherungsdatei „Provisio-Sicherung.json“ (Export über „Daten sichern“ oder den täglichen Hinweis) und die automatischen Tageskopien.",
        ],
      ],
      [
        "Anlass",
        [
          "Bis einschließlich Beta 1.5.3 wurde die Sicherungsdatei unverschlüsselt erzeugt. Personenbezogene Daten von Kundinnen und Kunden (Namen, Adressen, Telefonnummern, Termine, Umsätze) waren darin im Klartext lesbar, sobald die Datei das Gerät verließ – etwa über iCloud Drive, E-Mail oder einen Messenger.",
        ],
      ],
      [
        "Maßnahmen",
        [
          "Die Sicherungsdatei wird vollständig verschlüsselt. Lesbar bleiben nur technische Kopfdaten: Formatkennung, DK-Nummer, Zeitpunkt und Anzahl der Termine.",
          "Tageskopien werden ebenfalls verschlüsselt abgelegt (sieben Plätze, wöchentlich überschrieben, nur im Speicher der App).",
          "Zum Einspielen ist das Passwort oder der Wiederherstellungs-Code erforderlich. Ohne eines von beiden lässt sich der Inhalt nicht wiederherstellen.",
          "Unverschlüsselte Altdateien können weiterhin eingespielt werden, damit keine Daten verloren gehen. Neu erzeugt werden ausschließlich verschlüsselte Dateien.",
        ],
      ],
      [
        "Technische Umsetzung",
        [
          "Inhalt: AES-256-GCM mit dem Master Key des Kontos, je Sicherung ein neuer zufälliger 96-Bit-Initialisierungsvektor. GCM erkennt jede Veränderung der Datei.",
          "Der Master Key liegt der Datei nur umschlossen bei: einmal mit dem Passwort, einmal mit dem Wiederherstellungs-Code (PBKDF2-SHA-256, 150.000 Iterationen, 128-Bit-Salt).",
          "Verschlüsselung und Entschlüsselung laufen ausschließlich auf dem Gerät über die Web Crypto API. Es gibt keinen Server und keine Übertragung an Dritte.",
          "Tageskopien liegen in der IndexedDB der App, getrennt je Konto.",
        ],
      ],
      [
        "Hinweise für Nutzerinnen und Nutzer",
        [
          "Alte, unverschlüsselte Sicherungsdateien (vor Beta 1.6 erstellt) sollten gelöscht werden – auch aus iCloud Drive, E-Mails und Chats.",
          "Nach einer Passwortänderung öffnet sich eine ältere Sicherung weiterhin mit dem Passwort, das zum Zeitpunkt der Sicherung galt, oder mit dem Wiederherstellungs-Code.",
          "Tageskopien ersetzen keine Sicherungsdatei: Wird die App vom Gerät gelöscht, sind sie ebenfalls gelöscht.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.6",
    datum: "Oktober 2026",
    kurz: "Wie voll ist der Tag – und tägliche Sicherung",
    teile: [
      [
        "Neu",
        [
          "Tage färben sich grün, je voller sie mit Arbeit sind (Arbeitstag 8–22 Uhr = 100 %; Stufen ab 30, 60 und 85 %) – im Planer und in der KW-Übersicht.",
          "Private Zeit zeigen orange Punkte (bis zu drei). Urlaub, Krank, Schulung, Frei und private Mehrtagestermine färben den ganzen Tag orange.",
          "Tageskopie: Einmal am Tag – beim ersten Öffnen und um 23:59, wenn die App offen ist – sichert Provisio still eine verschlüsselte Kopie. Sieben Plätze, die sich wöchentlich ersetzen. Zurückholen unter Einstellungen → Daten → Tageskopien.",
          "Täglicher Hinweis auf „Heute“: ein Tipp speichert „Provisio-Sicherung.json“ in „Dateien“ – immer derselbe Name, die neue ersetzt die alte.",
        ],
      ],
      ["Sicherheit", ["Verschlüsselte Sicherungsdateien – siehe Security 1.1."]],
      ["Verbessert", ["Die blaue Markierung des gewählten Tags sitzt wieder mittig.", "Punkte im Planer nur noch, wo es wirklich etwas zu zeigen gibt."]],
    ],
  },
  {
    v: "Beta 1.5.3",
    datum: "Oktober 2026",
    kurz: "KW-Übersicht und Notiz für Meetings",
    teile: [
      [
        "Neu",
        [
          "Tipp im Planer oder in der Statistik auf „KW …“: Monatskalender mit Kalenderwochen wie bei Apple. Die aktuelle Woche ist umrandet, die angezeigte gefüllt, heute rot. Ein Tipp auf eine Woche springt hin – „Diese Woche“ bringt dich zurück.",
          "Meetings haben eine Notiz, z. B. das Thema der Schulung. Sie steht im Planer direkt hinter der Art.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.5.2",
    datum: "Oktober 2026",
    kurz: "Ohne Erklärtexte, Uhrzeiten mittig",
    teile: [
      [
        "Verbessert",
        [
          "Die kleinen grauen Erklärtexte sind aus der ganzen App verschwunden. Hinweise mit echtem Inhalt – Treffer, Strecke, Status, Knöpfe – bleiben.",
          "Uhrzeiten stehen in den Feldern mittig.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.5.1",
    datum: "Oktober 2026",
    kurz: "iPhone Duo wird zuverlässig erkannt",
    teile: [
      [
        "Verbessert",
        [
          "Der iPhone-Duo-Modus schaltet sich nur noch auf einem echten iPhone Duo von selbst ein. Auf normalen iPhones sprang er in Safari (Leisten oder Tastatur sichtbar) fälschlich an – auch in der Einführung.",
          "Zum Testen im Simulator: Einstellungen → Darstellung → iPhone Duo → An.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.5",
    datum: "Oktober 2026",
    kurz: "Uhrzeiten in Viertelstunden, ViKo und TL Runde",
    teile: [
      [
        "Verbessert",
        [
          "Alle Uhrzeiten wählst du jetzt in 15-Minuten-Schritten statt minutengenau – bei Meetings, Privat, Individuell, Terminieren, Büro, Nachbereitung und Fahrtenbuch.",
          "Leere Zeitfelder öffnen bei der aktuellen Uhrzeit.",
        ],
      ],
      ["Neu", ["Als Teamleiterin gibt es unter Meeting zusätzlich „ViKo“ und „TL Runde“."]],
    ],
  },
  {
    v: "Beta 1.4",
    datum: "Oktober 2026",
    kurz: "Praxis-Einführung und ruhige Fenster",
    teile: [
      [
        "Neu",
        [
          "Praxis-Einführung wie in einem Spiel: Jede Seite, jedes Fenster und jede Funktion probierst du einmal selbst aus – ein Lichtkreis zeigt, wohin du tippst, eine Karte erklärt kurz. 11 Kapitel, 91 Schritte.",
          "Neue Zugänge starten automatisch mit der Einführung. Erst wenn sie geschafft ist und alle Beispiele wieder gelöscht sind, ist die App frei.",
          "Die Einführung merkt sich den Stand – nach einem Neustart geht es am selben Schritt weiter.",
          "Einstellungen → Info → Einführung starten: jederzeit wiederholen. Deine echten Daten werden vorher gesichert und am Ende exakt wiederhergestellt.",
          "Zum Ausprobieren ohne Konto: ?demo=einfuehrung hinter der Adresse.",
        ],
      ],
      [
        "Verbessert",
        [
          "Fenster bauen sich nur beim ersten Öffnen mit Animation auf. Beim Antippen von Ja/Nein, Geräten oder Plus/Minus blinkt nichts mehr.",
          "Verkäufe ohne Vornamen zeigen nur den Nachnamen statt „. Name“.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.3",
    datum: "Oktober 2026",
    kurz: "Für das iPhone Duo",
    teile: [
      [
        "Neu",
        [
          "iPhone Duo zugeklappt: Die Leiste läuft senkrecht rechts unten bis etwa zur halben Höhe, das Plus im Planer sitzt darüber. Die rechte Spalte oben bleibt frei für Uhr und WLAN.",
          "iPhone Duo aufgeklappt quer: Die App verschwimmt, Eingaben sind gesperrt und ein Hinweis bittet ums Hochformat.",
          "iPhone Duo aufgeklappt hoch: Leiste wie gewohnt unten.",
          "Einstellungen → Darstellung → iPhone Duo: Auto erkennt das Gerät am Bildschirmformat (1:√2), An und Aus legen es fest.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.2.2",
    datum: "Oktober 2026",
    kurz: "Demo zum Ausprobieren",
    teile: [
      [
        "Neu",
        [
          "Demo: Mit ?demo hinter der Adresse startet Provisio ohne Anmeldung mit Beispieldaten – zum Testen auf anderen Geräten. Es wird nichts gespeichert, und deine echten Daten bleiben verschlüsselt und unberührt.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.2.1",
    datum: "Oktober 2026",
    kurz: "Menü ganz verschwommen, Statistik-PDF dunkel",
    teile: [
      [
        "Verbessert",
        [
          "Das Mehr-Menü legt sich jetzt über den ganzen Bildschirm – auch hinter der Leiste ist alles verschwommen.",
          "Statistik-PDF im dunklen Provisio-Design mit farbigen Spaltenköpfen und Rand.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.2",
    datum: "Oktober 2026",
    kurz: "Abholtermin, Einstunden-Termine, Provision und Glas",
    teile: [
      [
        "Verbessert",
        [
          "Abholtermin: Verkäufe zählen jetzt wirklich nur einmal – auch in Statistik, Verkäufen und Kundenliste. Bestehende Daten werden beim Start korrigiert.",
          "Planer: Termine von einer Stunde behalten ihre echte Höhe und überlappen nicht mehr.",
          "Provision: Brutto und netto in einer Zeile, die Sätze darunter; Sonstiges mit Leads und Leervorführungen, Zuschuss mit RV und KV getrennt.",
          "Ziele: Goldene Nadel und Vian als bunte Balken wie das persönliche Ziel. Anmeldungen für den Vian trägst du jetzt direkt dort ein.",
          "Statistik: Terminkarten mit Abstand zum Rand.",
          "Untere Leiste bleibt fest unten, auch nach dem Tippen.",
          "Flüssigglas in der Leiste mit Lichtkante und Glanz.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.1.3",
    datum: "Oktober 2026",
    kurz: "Termine in einem Satz eintragen",
    teile: [
      [
        "Neu",
        [
          "Schnell eintragen: Im Planer auf Plus tippen und den Termin in einem Satz sprechen oder tippen – zum Beispiel „Dienstag 10 Uhr Kundentermin Familie Becker, Hauptstraße 5, Empfehlung“. Tag, Uhrzeit, Art, Name, Adresse, Telefon und Ziel werden erkannt und vor dem Anlegen gezeigt.",
        ],
      ],
      ["Entfernt", ["„Termin-Modus starten“ bei Kundenterminen."]],
    ],
  },
  {
    v: "Beta 1.1.2",
    datum: "Oktober 2026",
    kurz: "Anmeldung mit DK-Nummer im Schlüsselbund",
    teile: [
      ["Verbessert", ["Das iPhone speichert beim Passwort nur noch die DK-Nummer als Benutzernamen – nicht mehr den Nachnamen."]],
      ["Entfernt", ["„Aus Chat einfügen“ im Planer."]],
    ],
  },
  {
    v: "Beta 1.1",
    datum: "Oktober 2026",
    kurz: "Serientermine, Rückgängig, Verkäufe und Provision neu",
    teile: [
      [
        "Neu",
        [
          "Serientermine: Meeting, Privat, Individuell und Büro täglich, werktags oder wöchentlich – immer 52 Wochen im Voraus. Beim Löschen: nur dieser oder alle zukünftigen.",
          "Rückgängig im Planer für versehentlich Gelöschtes oder Angelegtes.",
          "Aus Chat einfügen: eine Terminzeile aus dem Chat mit Claude direkt eintragen.",
          "Verkäufe: Leadverkauf (5 %), Leervorführung (10 %) und Eigenkauf neben dem Distanzverkauf.",
          "Provision mit Versicherungszuschuss (9 % RV + 5 % KV), Sonstiges und Teamprovision im Detail; „Was wäre, wenn“ bis +25.",
          "Team: nur noch 10, 6 oder 4 %; erwarteter Umsatz und Einheiten rechnen sich aus deinen bisherigen Meldungen.",
          "Langzeitziel als bunter Balken auf der Heute-Seite; Ziele als Säulen nebeneinander.",
          "Must-have-K70-Artikel in den Einstellungen.",
          "Plus und Minus gedrückt halten zählt immer schneller.",
        ],
      ],
      [
        "Verbessert",
        [
          "Provisionsaufteilung als zwei Häkchen direkt unter dem Bruttoumsatz.",
          "Nachbereitung: erst K70, dann Kauf; Status nur am Anfang; keine Aufbau-Animation bei jeder Eingabe.",
          "Promotion: Ziel zählt Termine und Kontakte; rund 65 % der Kontakte fließen in die Prognose.",
          "Nicht angetroffen bleibt im Planer stehen. Terminierungen zeigen ihre echte Zeit.",
          "Abholtermin zählt Verkäufe nicht mehr doppelt.",
          "Statistik-PDF hell mit farbigen Spaltenköpfen; Säulen flach.",
          "Klareres Glas in der Leiste, Fenster ohne Glas, größere Seitenränder.",
        ],
      ],
      [
        "Entfernt",
        [
          "Sonne oben, Woche kopieren, Jobtickets, Trichter, Hilfe und Rundgang.",
          "Mindestbestand und Nachbestellliste, Wetter, „Für Kundenberater geschrieben“, „Termin startet jetzt“.",
        ],
      ],
    ],
  },
  {
    v: "Beta 1.0",
    datum: "Oktober 2026",
    kurz: "Neues Design und geteilte Provision",
    teile: [
      [
        "Neu",
        [
          "Ruhigeres Design im Apple-Stil mit Glas-Effekt – in den Einstellungen abschaltbar.",
          "Provision aufteilen: Nach jedem Verkauf legst du per Schieberegler fest, wie viel der Verkaufs- (15 %) und Kontaktprovision (5 %) bei dir bleibt.",
          "Teamleiter-Satz je Woche: In der Wochenmeldung eines Teammitglieds wählst du deinen Anteil. Die letzte Angabe ist vorbelegt, ein Wechsel wird im Provisionsrechner getrennt gezeigt.",
          "Statistik als PDF im A4-Querformat.",
          "Versionsverlauf zum Nachlesen.",
        ],
      ],
      [
        "Verbessert",
        [
          "Provisionsrechner zeigt schlicht, woraus sich die Überweisung zusammensetzt.",
          "Einstellungen in klare Bereiche gegliedert, Rolle per Schieberegler.",
          "Neuer Wiederherstellungs-Code jederzeit erzeugbar.",
        ],
      ],
      ["Entfernt", ["Verspielte Effekte wie Münzen, Druckwellen und Konfetti.", "Technische Statusanzeigen in den Einstellungen."]],
    ],
  },
  {
    v: "Security 1.0",
    datum: "Oktober 2026",
    ab: "Beta 1.0",
    kurz: "Lokale, verschlüsselte Datenhaltung ohne Server",
    teile: [
      [
        "Geltungsbereich",
        [
          "Gilt für alle Daten, die in Provisio erfasst werden: Termine, Kundendaten, Listen, Zahlen, Einstellungen und Teamangaben.",
        ],
      ],
      [
        "Maßnahmen",
        [
          "Provisio arbeitet vollständig lokal und offline. Es gibt keine Datenbank, keinen Server, keine Synchronisation und keine Adresssuche bei Drittanbietern. Cloud-Datenbank, Kalender-Synchronisation und Admin-Bereich wurden entfernt.",
          "Alle Arbeitsdaten werden verschlüsselt auf dem Gerät gespeichert. Ohne Anmeldung sind sie nicht lesbar.",
          "Anmeldung mit DK-Nummer und Passwort. Passwortregeln: mindestens 8 Zeichen, Groß- und Kleinbuchstabe, Zahl und Sonderzeichen.",
          "Wiederherstellungs-Code für den Fall eines vergessenen Passworts; er kann jederzeit neu erzeugt werden, der alte verliert dann seine Gültigkeit.",
          "Beim Abmelden wird der Schlüssel aus dem Arbeitsspeicher entfernt; die Daten sind danach wieder unlesbar.",
        ],
      ],
      [
        "Technische Umsetzung",
        [
          "Daten: AES-256-GCM mit einem zufällig erzeugten Master Key je Konto.",
          "Der Master Key wird nie im Klartext gespeichert, nur umschlossen mit Passwort und mit Wiederherstellungs-Code (PBKDF2-SHA-256, 150.000 Iterationen, 128-Bit-Salt).",
          "Wiederherstellungs-Code: 24 Zeichen aus einem Zufallsgenerator für Kryptografie.",
          "Ablage im privaten Dateisystem der App (Origin Private File System), ersatzweise im lokalen Speicher des Browsers; dauerhafte Speicherung wird beim System angefragt.",
          "Content Security Policy: Skripte, Verbindungen und Formulare ausschließlich aus der App selbst („self“); keine Inhalte von fremden Servern.",
        ],
      ],
      [
        "Hinweise für Nutzerinnen und Nutzer",
        [
          "Passwort und Wiederherstellungs-Code getrennt und sicher aufbewahren. Gehen beide verloren, lassen sich die Daten nicht wiederherstellen – auch nicht durch die Entwicklerin.",
          "Regelmäßig Sicherungen anlegen: Die Daten liegen nur auf diesem Gerät.",
        ],
      ],
    ],
  },
];

const istSecurity = (v) => /^Security/.test(v.v);
const aktuelleApp = () => (VERSIONEN.find((v) => !istSecurity(v)) || {}).v || "";
const aktuelleSecurity = () => (VERSIONEN.find(istSecurity) || {}).v || "";

function versionDetail(i) {
  const v = VERSIONEN[i];
  const sec = istSecurity(v);
  const aktuell = sec ? v.v === aktuelleSecurity() : v.v === aktuelleApp();
  unterseiteOeffnen(
    v.v,
    "Versionen",
    `${
      sec
        ? `<div class="vssec"><b>Sicherheitshinweis</b><span>${v.v} · Stand ${v.datum}${v.ab ? ` · gilt ab ${v.ab}` : ""}${aktuell ? " · aktuell" : ""}</span></div>`
        : `<p class="vsdatum">${v.datum}${aktuell ? " · aktuell" : ""}</p>`
    }
     <p class="vskurz">${v.kurz}</p>
     ${v.teile
       .map(
         ([titel, punkte]) => `<p class="esgh">${titel}</p>
       <ul class="vspunkte">${punkte.map((p) => `<li>${p}</li>`).join("")}</ul>`,
       )
       .join("")}`,
  );
}

function versionenUnterseite() {
  store.set("pv-version-gesehen", VERSIONEN[0].v);
  const punkt = document.querySelector("#esVersionen .esneu");
  if (punkt) punkt.remove();
  const spalte = (liste, titel, aktuell) => `<div class="vsspalte">
      <p class="esgh">${titel}</p>
      <div class="esgrp">${liste
        .map(
          ({ v, i }) => `<button type="button" class="vszeile" data-version="${i}">
            <b>${v.v.replace(/^Security /, "")}${v.v === aktuell ? ' <span class="vsjetzt">Aktuell</span>' : ""}</b>
            <small>${v.kurz}</small>${CHEV}</button>`,
        )
        .join("")}</div></div>`;
  const alle = VERSIONEN.map((v, i) => ({ v, i }));
  unterseiteOeffnen(
    "Versionen",
    "Einstellungen",
    `<div class="vsspalten">
       ${spalte(alle.filter((x) => !istSecurity(x.v)), "App", aktuelleApp())}
       ${spalte(alle.filter((x) => istSecurity(x.v)), "Security", aktuelleSecurity())}
     </div>`,
    (ebene) =>
      ebene.querySelectorAll("[data-version]").forEach((b) => (b.onclick = () => versionDetail(+b.dataset.version))),
  );
}
