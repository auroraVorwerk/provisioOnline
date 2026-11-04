/**
 * Kobold-Wissen für „Frag Provisio“ (Beta 1.9)
 *
 * Quelle: „Kobold Reparaturhandbuch Deutschland“, Stand 11/2026 (interne
 * Arbeitshilfe aus öffentlich zugänglichen Quellen – keine Vorwerk-Veröffentlichung).
 * Stufe je Angabe: "de" = offiziell Vorwerk Deutschland, "regio" = offizielles
 * Hilfecenter eines anderen Landes, "niedrig" = nur CH-Seiten / widersprüchlich,
 * "dritt" = Drittanbieter (nur Orientierung), "luecke" = nicht verifiziert.
 * Preise und Fristen können sich ändern – vor einer Kundenauskunft beim
 * Reparaturservice gegenprüfen.
 *
 * „w“ sind Suchwörter (auch umgangssprachlich), damit eine Frage auch anders
 * formuliert gefunden wird.
 */
const KOBOLD_WISSEN = (function () {
  const QUELLE = "Kobold Reparaturhandbuch Deutschland, Stand 11/2026";
  const KONTAKT = {
    reparatur: "0202 564 3586 · reparaturservice@vorwerk.de",
    kunden: "0202 564-3000 (Mo–Do 8–18 Uhr, Fr 8–12 Uhr)",
    entsorgung: "kobold-altgeraeteentsorgung.de (kostenloses Rücksendeetikett)",
    adresse: "Vorwerk Deutschland Stiftung & Co. KG, Reparaturservice, Industriestr. 300, Wermelskirchen",
  };

  /* Gerätefamilien und Modelle (Kleinbuchstaben, ohne Leerzeichen) */
  const FAM = {
    vk7: { name: "Akku-Staubsauger VK7", modelle: ["vk7", "sc7", "ca7"] },
    vb100: { name: "Akku-Staubsauger VB100", modelle: ["vb100", "ebb100", "spb100", "pbb100", "mp100", "mr100", "sb100"] },
    vc: { name: "Akkusauger VC100 / VM7", modelle: ["vc100", "vm7"] },
    hand: { name: "Handstaubsauger VK", modelle: ["vk200", "vk150", "vk140", "vk136", "vk135", "vk131", "vk130", "vk122", "vk121", "vk120", "vk119"] },
    boden: { name: "Bodenstaubsauger VT / Tiger", modelle: ["vt300", "vt270", "vt265", "vt260", "tiger", "tiger250", "tiger251", "tiger252", "tiger260", "tiger265", "tiger270", "ess300"] },
    eb: { name: "Elektrobürsten", modelle: ["eb7", "ebb100", "eb400", "eb370", "eb360", "eb351", "eb350"] },
    sp: { name: "Saugwischer", modelle: ["sp7", "spb100", "sp600", "sp530", "sp520"] },
    pb: { name: "Polsterbürsten und Zubehör", modelle: ["pb7", "pbb100", "pb440", "pb430", "pb420", "fd15"] },
    vf: { name: "Frischwasserbürste VF200", modelle: ["vf200"] },
    vr7: { name: "Saugroboter VR7", modelle: ["vr7", "rb7"] },
    vr300: { name: "Saugroboter VR300", modelle: ["vr300"] },
    vr200: { name: "Saugroboter VR200 / VR100", modelle: ["vr200", "vr100"] },
    vg: { name: "Fenster-/Flächenreiniger VG100 / VG100+", modelle: ["vg100", "vg100+"] },
  };
  /* Für SP7/EB7/PB7 (Aufsätze am VK7) zusätzlich die VK7-Codes */
  const AM_VK7 = ["sp7", "eb7", "pb7", "hd7", "fk7"];

  /* ---------- Reparaturpauschalen (brutto, inkl. Arbeit, Teile, Versand, MwSt.) ---------- */
  const PAUSCHALE = [
    { t: "Handstaubsauger ab Kobold 150", m: ["vk150", "vk200"], p: 149.99 },
    { t: "Bodenstaubsauger ab Tiger 270", m: ["vt270", "vt300", "tiger270"], p: 159.99 },
    { t: "Akku-Staubsauger VB100 oder VK7", m: ["vb100", "vk7"], p: 149.99 },
    { t: "Akkusauger VC100 oder VM7", m: ["vc100", "vm7"], p: 79.99 },
    { t: "Saugroboter ab VR200", m: ["vr200", "vr300", "vr7"], p: 199.99 },
    { t: "Fenster-/Flächenreiniger VG100 / VG100+", m: ["vg100", "vg100+"], p: 99.99 },
    { t: "Elektrobürste ab EB370", m: ["eb370", "eb400"], p: 129.99 },
    { t: "Elektrobürste Akku EBB100 oder EB7", m: ["ebb100", "eb7"], p: 129.99 },
    { t: "Saugwischer ab SP530, SPB100 oder SP7", m: ["sp530", "sp600", "spb100", "sp7"], p: 139.99 },
    { t: "Polsterbürste ab PB430, PBB100 oder PB7", m: ["pb430", "pb440", "pbb100", "pb7"], p: 99.99 },
    { t: "Servicestation RB7 (für VR7)", m: ["rb7"], p: 99.99 },
  ];
  const EXTRA_PREISE = [
    { t: "Überprüfungspauschale (nur wenn es nicht zur Reparatur kommt)", p: 39.99 },
    { t: "Leihgerät (VK mit EB oder VT mit EB, auch im Gewährleistungsfall)", p: 39.99 },
    { t: "Entsorgung", p: 0 },
  ];
  const DRITT = [
    "saubersaugen.de: Tiger 250–260 147 € · VK140/150/200 187 € · VK130–136 127 € · VK119–122 92 € (Festpreise)",
    "robo-repair: Roboter-Check-up 59,99 € (Wartung, keine Reparatur)",
    "staubsaugerwelt24 repariert VK7, VC100, VB100, EBB100, SPB100 nicht",
  ];

  /* ---------- Reparaturstatus (Jahr = repariert bis; null = offen) ---------- */
  const STATUS = {
    vk7: null, vk200: 2032, vk150: 2026, vk140: 2024, vk136: 2020,
    vt300: null, vt270: 2027, vt265: 2024, vt260: 2021,
    eb7: null, ebb100: 2033, eb400: 2032, eb370: 2027,
    sp7: null, spb100: 2034, sp600: 2033, sp530: 2027, sp520: 2024,
    pbb100: 2033, pb440: 2032, pb430: 2026, pb420: 2024,
    vr7: null, vr300: 2033, vr200: 2028, vr100: 2024,
    "vg100+": null, vg100: 2034, vf200: null, vc100: null, vm7: null, vb100: 2033,
  };

  /* ---------- Verschleißteile (Online-Shop, Endpreise) ---------- */
  const TEILE = [
    { t: "VR7 Rundbürste", w: "vr7 rundbuerste buerste", p: 29.9 },
    { t: "VR7 Filter", w: "vr7 filter", p: 19.9 },
    { t: "VR7 Motorschutzfilter", w: "vr7 motorschutzfilter", p: 9.0 },
    { t: "VR7 Staubbehälter", w: "vr7 staubbehaelter behaelter", p: 20.0 },
    { t: "VR7 Bürstenabdeckung", w: "vr7 buerstenabdeckung abdeckung", p: 15.0 },
    { t: "VR7 Akku", w: "vr7 akku batterie", p: 129.0 },
    { t: "Seitenbürste VR7/VR300/VR200", w: "seitenbuerste vr7 vr300 vr200", p: 9.9 },
    { t: "CA7-Set (Ladegerät SC7 + CA7)", w: "ca7 sc7 ladegeraet lader vk7", p: 49.0 },
    { t: "VK7 Service-Set plus", w: "vk7 serviceset service set", p: 119.0 },
  ];
  const NEU = "Neugeräte zur Einordnung: VK7 Titanium 1.099 € · VG100+ 269 € · VR7 + RB7 999 € · VM7 199 €.";

  /* ---------- Fehlercodes ---------- */
  const CODES = {
    vk7: {
      0: ["Akku schwach", "Laden.", "regio"],
      10: ["Allgemeiner Fehler", "Akku 1 Minute entnehmen, neu starten.", "regio"],
      11: ["Überhitzt", "Abkühlen lassen; Saugwege prüfen, ggf. neuen Beutel einsetzen.", "regio"],
      14: ["Gebläse blockiert", "Fremdkörper aus dem Gebläseeingang entfernen. (Die CH-Seite nennt „Motorproblem“ → Werksreset; die Angaben widersprechen sich.)", "regio"],
      19: ["Stack-/Watchdog-Reset", "Akku 1 Minute entnehmen.", "regio"],
      20: ["Allgemeiner Akkufehler", "Akku entnehmen und neu einsetzen; Kontakte prüfen.", "regio"],
      23: ["Akkukontakte gestört", "Kontakte trocken säubern.", "regio"],
      25: ["Sensoren/Kommunikation", "Quellenlage widersprüchlich, nicht bestätigt – nur als Hinweis.", "luecke"],
      26: ["Akku zu kalt", "Akku mindestens 2 Stunden bei Raumtemperatur lagern.", "regio"],
      27: ["Akku nicht erkannt", "Nur Original-Akku verwenden – ein Fremdakku ist die Ursache.", "regio"],
      28: ["Ladefehler", "Ladegerät, Akku und Kontakte prüfen (Ladetemperatur 10–35 °C).", "regio"],
      29: ["Akku-Abschaltung fehlgeschlagen", "Akku 1 Minute raus; ggf. Akku ersetzen.", "regio"],
      30: ["Allgemeiner SP7-Fehler (CH: Pumpenfehler)", "Aufsatz abnehmen, neu aufstecken, Akku-Reset.", "regio"],
      32: ["SP7-Tuchmotor überlastet (CH: oszillierende Platte blockiert)", "Blockade entfernen, Tuch prüfen.", "regio"],
      35: ["SP7 Feuchtigkeit", "VK ausschalten, Revisionsklappe öffnen, mit Küchenpapier trocknen, bei Bedarf wiederholen. (CH: mindestens 24 Stunden trocknen lassen.)", "regio"],
      36: ["SP7-Elektronik gestört", "Aus- und einschalten.", "regio"],
      40: ["Allgemeiner EB7-Fehler", "Aufsatz neu aufstecken, Reset.", "regio"],
      41: ["EB7 überhitzt", "Abkühlen lassen.", "regio"],
      42: ["EB7-Bürstenwalzenmotor überlastet", "Haare/Fäden entfernen, niedrigere Saugstufe wählen.", "regio"],
      43: ["EB7-Kontakte", "Kontakte säubern.", "regio"],
      46: ["EB7-Elektronik", "Aus- und einschalten.", "regio"],
      63: ["Aufsatzfehler", "Akku 1 Minute raus, Kontakte säubern, anderen Aufsatz testen (trennt Gerät und Aufsatz).", "regio"],
      80: ["Aufsatzfehler", "Wie Code 63: Akku 1 Minute raus, Kontakte säubern, anderen Aufsatz testen.", "niedrig"],
      81: ["Aufsatzfehler", "Wie Code 63.", "niedrig"],
      82: ["Aufsatzfehler", "Wie Code 63.", "niedrig"],
      83: ["Aufsatzfehler", "Wie Code 63.", "niedrig"],
      84: ["Nur Information", "Keine Maßnahme nötig.", "niedrig"],
      96: ["Interne Konfiguration", "Akku 1 Minute raus, Werksreset; bleibt es → Reparatur.", "niedrig"],
      97: ["Interne Konfiguration", "Akku 1 Minute raus, Werksreset; bleibt es → Reparatur.", "niedrig"],
      98: ["Interne Konfiguration", "Akku 1 Minute raus, Werksreset; bleibt es → Reparatur.", "niedrig"],
      128: ["Speicher", "Akku 1 Minute raus, Taste 10 s halten; bleibt es → Reparatur.", "niedrig"],
      129: ["Systemuhr", "Akku 1 Minute raus, Taste 10 s halten; bleibt es → Reparatur.", "niedrig"],
      130: ["Konfiguration", "Akku 1 Minute raus, Taste 10 s halten; bleibt es → Reparatur.", "niedrig"],
      131: ["Interne Kommunikation", "Akku 1 Minute raus, Taste 10 s halten; bleibt es → Reparatur.", "niedrig"],
      144: ["Systemreset nötig", "Werksreset.", "niedrig"],
    },
    vr7: {
      1004: ["Verbindung zu den Kobold-Servern fehlgeschlagen", "Netzwerk/Login prüfen.", "regio"],
      2002: ["Roboter geneigt", "Auf eine ebene Fläche stellen.", "regio"],
      2003: ["Schmutzbehälter geöffnet", "Behälter richtig einsetzen.", "regio"],
      2110: ["Ladestation nicht gefunden", "Station frei stellen, Roboter an die Station schieben.", "regio"],
      2111: ["Umgebung nicht erkannt", "Roboter ca. 60 cm versetzen.", "regio"],
      2113: ["Nicht richtig auf der Ladestation", "Neu andocken.", "regio"],
      2201: ["Rechter Absturzsensor", "Sensor reinigen, rechtes Rad frei machen.", "regio"],
      2210: ["Antriebsrad blockiert", "Rad frei machen.", "regio"],
      2211: ["Linkes Rad hängt", "Schwellen über 2 cm meiden (CH: Teppichflor über 2,5 cm).", "regio"],
      2212: ["Räder verhaart", "Haare entfernen, Power-Taste zum Neustart halten.", "regio"],
      3001: ["Umgebung/Karte nicht erstellt", "Glas/Spiegel/leere Räume beachten, Basis versetzen, neue Karte per Erkundungsfahrt, Türen öffnen, direktes Sonnenlicht meiden.", "regio"],
      3009: ["Umgebung/Karte nicht erstellt", "Wie 3001: Basis versetzen, neue Karte, Türen öffnen, Sonnenlicht meiden.", "regio"],
      7108: ["Umgebung/Karte nicht erstellt", "Wie 3001: Basis versetzen, neue Karte, Türen öffnen, Sonnenlicht meiden.", "regio"],
      4108: ["Sicht blockiert / Sensorfehler (LDS)", "Hindernis vor dem LDS entfernen, Aufkleber/Folien ab, No-Go-Zonen für bodentiefe Vorhänge/Heizkörper, Neustart.", "regio"],
      8076: ["Demo-/Shop-Modus", "Aus, 60 Sekunden warten, ein. Weitere Schritte unbekannt.", "luecke"],
      8077: ["Demo-/Shop-Modus", "Aus, 60 Sekunden warten, ein. Weitere Schritte unbekannt.", "luecke"],
    },
    vr300: {
      1000: ["Drehsensor (Laser) blockiert", "Neustart, Öffnung unter der runden Abdeckung prüfen (Abdeckung nicht abnehmen), sonst Service.", "de"],
      3000: ["Drehsensor (Laser) blockiert", "Neustart, Öffnung unter der runden Abdeckung prüfen (Abdeckung nicht abnehmen), sonst Service.", "de"],
      2000: ["Weg freiräumen", "Hindernis beseitigen.", "de"],
      2001: ["Weg freiräumen", "Hindernis beseitigen.", "de"],
      2003: ["Weg freiräumen", "Hindernis beseitigen.", "de"],
      2004: ["Weg freiräumen", "Hindernis beseitigen.", "de"],
      2012: ["Weg freiräumen", "Hindernis beseitigen.", "de"],
      2013: ["Weg zur Zone blockiert", "Hindernis beseitigen, Zone prüfen.", "de"],
      4101: ["Vision-Fehler", "START-Taste drücken, Neustart.", "de"],
      4102: ["Vision-Fehler", "START-Taste drücken, Neustart.", "de"],
    },
  };
  const CODE_LUECKE = {
    vk7: "Codes, die hier fehlen, sind nicht verifiziert.",
    vr7: "Die Codes 1005–1019, 2004–2109 und 3002–7102 sind nicht verifiziert (Hilfeseiten gesperrt).",
    vr300: "Weitere VR300-Zahlencodes sind nicht verifiziert.",
  };

  /* ---------- Störungen, LED-Anzeigen ---------- */
  const F = [];
  const fb = (fam, titel, w, ursache, massnahme, stufe = "de", stopp = false) => F.push({ fam, titel, w, ursache, massnahme, stufe, stopp });

  /* VK7 */
  fb("vk7", "Werksreset", "werksreset reset zuruecksetzen neustart", "", "Gerät ausschalten → Akku entnehmen → Ein/Aus-Taste 10 Sekunden gedrückt halten → Akku einsetzen. Bei fast allen Codes hilft zuerst: Akku mindestens 1 Minute entnehmen und wieder einsetzen.", "regio");
  fb("vk7", "Akku tiefentladen / lädt nicht", "tiefentladen laedt nicht laden akku leer tot startet nicht ladegeraet sc7", "Tiefentladener Akku oder Ladetemperatur.", "Das Ladegerät SC7 ist der „Wecker“: die kleine Taste in der Ladeöffnung des SC7 drücken. Laden nur bei 10–35 °C.", "regio");

  /* VB100 */
  fb("vb100", "LED gelb", "led gelb gelb leuchtet saugt schwach saugleistung", "Filtertüte voll, Teppich zu dicht oder Saugwege verstopft.", "Filtertüte wechseln, Saugwege freimachen, Teppichmodus wechseln.");
  fb("vb100", "LED blinkt rot", "led rot blinkt rot stoerung", "Störfall.", "Vorher Akku-Reset; bleibt es: Kundendienst (Reparaturauftrag).");
  fb("vb100", "startet nicht im Lieferzustand", "startet nicht neu lieferzustand transportmodus geht nicht an", "Transportmodus.", "Gerät laden.");
  fb("vb100", "startet nicht mit Ladegerät", "startet nicht ladegeraet angeschlossen gesperrt laden", "Das Gerät ist beim Laden gesperrt.", "Ladegerät abziehen.");
  fb("vb100", "EBB100 zu laut", "ebb100 laut geraeusch buerste", "Rundbürsten falsch eingesetzt.", "Beide Bürsten tauschen bzw. neu einsetzen, nur Originalbürsten.");
  fb("vb100", "EBB100 saugt schwach / blinkt rot", "ebb100 saugt schwach rot blinkt verstopft faeden", "Fremdkörper, Fäden, Teppich zu dicht, Saugkanal blockiert.", "Saugkanal über die Revisionsklappe freimachen.");
  fb("vb100", "EBB100 schwer zu schieben", "ebb100 schwer schieben schwergaengig", "Falsche Bürstenstufe.", "Von „fine“ auf „flex“ wechseln.");

  /* VC100 / VM7 */
  fb("vc", "Störung (keine offizielle Tabelle)", "stoerung startet nicht saugt nicht laedt nicht akku", "Fehlercodes sind nicht öffentlich dokumentiert.", "Erste Maßnahmen: Akku laden, Filter/Staubbehälter prüfen, Kontakte säubern, Akku-Reset. Bei Brandgeruch oder Überhitzung sofort Reparaturauftrag.", "luecke");

  /* VT300 / VK200 */
  fb("boden", "LED-Anzeige (6 Reihen)", "led anzeige gruen gelb reihen", "Alle grün = Filtertüte leer · 4 bzw. 2 Reihen grün = füllt sich · alle gelb = voll · alle blinken rot = Störfall.", "Gelb: 3-in-1-Filtertüte wechseln (FP300 bzw. FP200). Rot blinkend: Netzstecker ziehen, Saugwege prüfen; bleibt es → Reparatur.");
  fb("boden", "blinkt rot, läuft nicht", "rot blinkt blinkend laeuft nicht ueberhitzt heiss", "Überhitzt (Überhitzungs-Sicherheitsstufe).", "Netzstecker ziehen, abkühlen lassen, Filtertüte und Filter prüfen.");
  fb("boden", "Filterraum schließt nicht", "filterraum schliesst nicht deckel zu", "3-in-1-Filtertüte fehlt oder ist falsch eingesetzt; Filterdeckel ausgehängt.", "Filtertüte korrekt einsetzen, Deckel einhängen.");
  fb("boden", "unangenehmer Geruch", "geruch riecht stinkt", "Filtertüte voll/alt.", "Filtertüte und Dovina-Duftchip wechseln, Saugkanal und Motorschutzfilter reinigen.");
  fb("boden", "Saugkraft lässt nach", "saugkraft laesst nach saugt nicht schwach verstopft", "Filtertüte voll, ESS300 nicht eingerastet, Verstopfung in Schlauch/Rohr/Vorsatzgerät, Motorschutzfilter zu.", "Reihenfolge: Filtertüte → ESS300 einrasten → Schlauch/Rohr mit Zollstock durchstoßen → Vorsatzgerät → Motorschutzfilter.");
  fb("boden", "schaltet beim Auto-/Teppichwechsel ab", "schaltet ab auto teppich wechsel aus", "Überhitzungsschutz.", "Abkühlen lassen, Saugwege frei machen.");
  fb("hand", "VK200 ohne Funktion nach Inbetriebnahme", "vk200 neu keine funktion startet nicht teleskopstiel", "Teleskopstiel nicht eingeschoben (Erstinbetriebnahme).", "Teleskopstiel einmal ganz einschieben.");
  fb("hand", "VK200 Filtertüte lässt sich nicht einsetzen", "filtertuete einsetzen banderole", "Banderolen der Filtertüte nicht entfernt.", "Banderolen durchtrennen.");
  fb("hand", "Saugkraft lässt nach", "saugkraft schwach saugt nicht verstopft", "Filtertüte voll oder Verstopfung.", "Filtertüte prüfen, Schlauch/Rohr/Vorsatzgerät und Motorschutzfilter prüfen (wie beim VT300).");
  fb("hand", "blinkt rot, überhitzt", "rot blinkt ueberhitzt heiss schaltet ab", "Überhitzung.", "Netzstecker ziehen, abkühlen lassen, Filtertüte und Filter prüfen.");

  /* Aufsätze */
  fb("eb", "EB400: Rundbürste dreht nicht / sitzt falsch", "eb400 rundbuerste dreht nicht walze sitzt falsch", "Walze nicht korrekt auf TORX-Mitnehmer, Kalotte/grüne Kappe nicht verrastet.", "Walze neu aufsetzen, Kalotte/Kappe verrasten, Bodenplatte einrasten.");
  fb("eb", "EB400: Schieber hängt im Hartbodenmodus", "schieber haengt hartboden", "Mechanik blockiert.", "Staubsauger in Parkposition aus- und wieder einschalten.");
  fb("eb", "EB400: blinkt rot", "eb400 rot blinkt faeden verstopft", "Fremdobjekt, Fäden oder Saugkanal verstopft.", "Objekt/Fäden entfernen, Saugkanal über die Revisionsklappe freimachen.");
  fb("eb", "Haare/Fäden in der Bürste", "haare faeden buerste walze reinigen", "Verschleiß/Verschmutzung.", "Walze entnehmen und reinigen. Häufigste Fehlerquelle bei EBB100/EB7: falsch eingesetzte oder nicht originale Rundbürsten, Haare im Saugkanal.");
  fb("vf", "VF200 gibt kein Wasser frei", "vf200 wasser frei trittschalter dosier", "Dosierbehälter verschmutzt oder Trittschalter.", "Dosierbehälter und Bürste reinigen, Kobosan active verwenden, Trittschalter prüfen.");
  fb("sp", "LED-Wellen rot (SP600)", "led rot wellen feuchtigkeit nass motor ueberlastet", "Motor überlastet oder Feuchtigkeit aufgesaugt.", "Gerät aus, Revisionsklappe öffnen, mit Küchentuch trocknen, mehrfach wiederholen.");
  fb("sp", "Revisionsklappe springt auf", "revisionsklappe springt auf klappe", "Feuchtigkeit/Verklemmung.", "Trocknen wie bei roten LED-Wellen; Dichtlippenrahmen reinigen.");
  fb("sp", "Saugkanal verstopft", "saugkanal verstopft fremdkoerper", "Fremdkörper.", "Über Münze/Revisionsklappe öffnen und reinigen.");
  fb("sp", "Tuch sitzt schief", "tuch schief", "Falsch angebracht.", "Tuch neu ansetzen.");
  fb("sp", "Streifen, matter Boden", "streifen matt schlieren boden", "Tuch MF600 verschmutzt, falsche Befeuchtung.", "Tuch waschen, Befeuchtungsstufe/Trockenmodus anpassen.");
  fb("pb", "PB440 funktioniert nicht", "pb440 polsterbuerste geht nicht akku", "PB440 funktioniert nur am Elektrosaugschlauch mit Netzkabel (nicht an Akku-Geräten).", "Am richtigen Gerät nutzen, Saugschuh korrekt einrasten, Fremdkörper aus dem Saugkanal entfernen.");
  fb("pb", "FD15 Flügelbürste", "fd15 fluegel fluegelbuerste", "Flügel nicht korrekt eingesetzt.", "Flügel korrekt einsetzen.");

  /* VR7 */
  fb("vr7", "Info-Taste-LED und Werksreset", "led info taste farbe gruen orange rot werksreset reset", "Grün = Information, Orange = Warnung, Rot = Störung.", "Werksreset: linken Bumper (gegenüber der Seitenbürste) und Info-Taste gleichzeitig mindestens 7 Sekunden halten.");
  fb("vr7", "tiefentladen / Transportmodus", "tiefentladen transportmodus startet nicht tot reagiert nicht", "Akku tiefentladen oder Transportmodus.", "Roboter an die Station schieben (Home-LED grün/gelb), START mehrere Sekunden halten.");
  fb("vr7", "lädt nicht", "laedt nicht laden ladekontakte", "Ladekontakte verschmutzt oder Bürstenabdeckung schief.", "Ladekontakte säubern, Bürstenabdeckung prüfen.");
  fb("vr7", "Navigation", "navigation faehrt falsch orientierung glas abgrund hochflor", "Große leere Räume (2–3 m ohne Orientierung), Hochflor, Glasböden (werden als Abgrund erkannt).", "Mit No-Go-Zonen arbeiten, Umgebung strukturieren.");
  fb("vr7", "Station RB7", "rb7 station servicestation led rot weiss filtertuete", "Weiße LED, rote LED, Alu-Stab, Filtertüte voll (gelb) / kritisch (rot), Filterdeckel.", "Rote LED: Netzstecker 60 Sekunden ziehen. Filtertüte bei Gelb/Rot wechseln, Filterdeckel prüfen.");
  fb("vr7", "WLAN / App verbindet nicht", "wlan app verbindet nicht internet verbindung", "Falsches WLAN.", "Nur 2,4 GHz, kein WiFi-6-only, kein 5-GHz-only, SSID nicht versteckt, Router-Firewall prüfen.");

  /* VR300 */
  fb("vr300", "blinkt grün (ca. 5 s)", "blinkt gruen gruen akku", "Akku beim Start nicht voll.", "Innerhalb 30 s erneut START drücken oder erst laden.");
  fb("vr300", "blinkt orange", "blinkt orange deckel filter", "Staubbehälterdeckel offen, Filter/Behälter fehlt.", "Deckel schließen (klickt), Behälter inkl. Filter einsetzen.");
  fb("vr300", "leuchtet orange", "leuchtet orange behaelter voll", "Staubbehälter voll.", "Leeren, Filter reinigen, Bodensensoren säubern.");
  fb("vr300", "blinkt rot", "blinkt rot buerste bumper verhakt", "Rund-/Seitenbürste verhakt oder Bumper eingeklemmt.", "Bürste reinigen/neu einsetzen, am Bumper wackeln.");
  fb("vr300", "leuchtet rot", "leuchtet rot stoerung dauerhaft rot", "Störung.", "Kundendienst.");
  fb("vr300", "startet nicht (Akku unter 25 %)", "startet nicht akku 25", "Akku unter 25 %.", "Laden.");
  fb("vr300", "Reinigungsleistung nimmt ab", "reinigt schlecht leistung saugt schlecht", "Behälter, Filter, Bürsten verschmutzt.", "Behälter leeren, Filter und Bürsten reinigen.");
  fb("vr300", "reagiert nicht / lädt nicht", "reagiert nicht laedt nicht tot station", "Station nicht angeschlossen – dann entlädt er sich; nicht ausgeschaltet → entlädt sich nach einigen Tagen.", "Stecker an Station und Steckdose prüfen.");
  fb("vr300", "unterbricht plötzlich", "unterbricht hoert auf stoppt ploetzlich spot", "SPOT-Modus, verdeckte/verschmutzte Sensoren, große leere Räume, Hochflor, Glas/dunkle Teppiche als „Abgrund“.", "Spot-Taste = 2×2 m (4×4 m nur per App); Sensoren reinigen; Hochflor mit Magnetstreifen abgrenzen.");
  fb("vr300", "kehrt nicht zur Station zurück", "kehrt nicht zurueck station findet nicht basis", "Schutzfolie am Infrarotfenster, Platz an der Station, Start nicht von der Basis, Station hinter Hindernis.", "Schutzfolie entfernen; 0,5 m seitlich und 0,3 m oberhalb der Station frei; Testlauf per SPOT von der Station.");
  fb("vr300", "Hotspot-Modus", "hotspot wlan verbinden app einrichten", "", "START und rechte Seite des vorderen Bumpers gleichzeitig drücken.");
  fb("vr300", "App verbindet nicht", "app verbindet nicht wlan server zertifikat", "WLAN oder alter Softwarestand (SSL-Zertifikat).", "WLAN 2,4 GHz, nicht versteckt; Softwarestand prüfen und Update einspielen.");

  /* VR200 / VR100 */
  fb("vr200", "Staubbehälter/Filter prüfen · Bodensensoren säubern", "staubbehaelter filter pruefen bodensensoren saeubern sensoren", "", "Behälter leeren, Filter und Sensoren reinigen.");
  fb("vr200", "Bürste ist blockiert", "buerste blockiert", "", "Haare/Fäden entfernen, Bürste neu einsetzen.");
  fb("vr200", "Bumper klemmt", "bumper klemmt", "", "Bumper lösen, Fremdkörper entfernen.");
  fb("vr200", "Zeit nicht eingestellt", "zeit uhrzeit nicht eingestellt", "", "Uhrzeit im Menü einstellen.");
  fb("vr200", "Navigieren nicht möglich / Weg freiräumen", "navigieren nicht moeglich weg freiraeumen", "", "Hindernis entfernen; hochgehobenen Roboter weniger als 0,5 m versetzen; Staubfachabdeckung prüfen.");
  fb("vr200", "reagiert nicht / lädt nicht", "reagiert nicht laedt nicht", "", "Menü „Roboter ausschalten“ nur bewusst nutzen; Basis anschließen.");
  fb("vr200", "kehrt nicht zur Basis zurück", "kehrt nicht zurueck basis station", "", "Schutzfolie am Infrarotfenster ab; Basis 0,5 m seitlich und 0,3 m oberhalb frei.");
  fb("vr200", "App/Server verbindet nicht", "app server verbindung zertifikat ssl", "Abgelaufene SSL-Zertifikate (alte Software).", "Update einspielen (VR200 ab 2.1.7). Nicht zurücksetzen, bevor das Update eingespielt ist.");

  /* VG100 */
  fb("vg", "lässt sich nicht einschalten", "einschalten startet nicht geht nicht an", "Akku leer; nicht korrekt geladen; Ladekontakte verschmutzt; war beim Laden eingeschaltet.", "Laden; Netzladegerät fest anschließen (Anzeige pulsiert); Kontakte mit trockenem Tuch reinigen; zum Laden ausschalten.");
  fb("vg", "Schlieren, schlechtes Ergebnis", "schlieren streifen schlecht ergebnis abziehlippe", "Öffnung zwischen Abziehlippen verstopft, Abziehlippe beschädigt, Tuch alt, Tank voll/leer, Dosierung falsch, Wasserauslass verschlossen.", "Abziehlippen reinigen (seitlich herausziehen; einseitig beschädigt → drehen, beidseitig → tauschen), Tuch MF100 wechseln, Schmutzwassertank leeren, GC100 nach Markierung dosieren, Wasserauslass freimachen.");
  fb("vg", "Wasser läuft aus", "wasser laeuft aus tropft undicht", "Gummiverschlüsse nicht korrekt, Gerät beim Einschieben geneigt, Schmutztank voll, Tank nicht eingerastet.", "Gummiverschlüsse prüfen, Gerät waagerecht auf die Abstellplatte, Tank leeren, Ver-/Entriegelungstaste hörbar einrasten.");
  fb("vg", "Reinigungsqualität lässt nach", "reinigung laesst nach qualitaet", "Abziehlippe, Tuch oder Tank.", "Abziehlippe reinigen oder tauschen, Tuch wechseln, Schmutzwasser leeren, mit GC100 und Wasser befüllen, Tank einsetzen.");

  /* Sicherheit */
  fb("alle", "Akku aufgebläht, heiß oder riecht", "akku aufgeblaeht heiss warm riecht geruch dick verformt", "Beschädigter Akku.", "Sofort aus dem Verkehr ziehen und fachgerecht entsorgen lassen. Nicht laden, nicht öffnen.", "de", true);
  fb("alle", "Wasser-/Feuchtigkeitsschaden", "wasser nass feuchtigkeit reingelaufen", "Feuchtigkeit in der Elektronik (SP, VG100, Saugwischer).", "Nicht laden, bevor es getrocknet ist. Feuchtigkeit in der Elektronik ist ein Fall für die Reparatur.", "de", true);
  fb("alle", "Brandgeruch, Rauch, Funken", "brandgeruch rauch funken brennt verschmort", "", "Sofort außer Betrieb nehmen – Reparaturauftrag.", "de", true);

  /* ---------- Updates der Roboter ---------- */
  const UPDATE = {
    vr7: "Aktuelle Versionen: 1.9.17 und 2.2.6 – welche passt, zeigt die Seriennummer (Unterseite): ab 260235 → 2.2.6, davor → 1.9.17.<br><b>Per App (empfohlen):</b> Roboter auf die Ladestation, in der MyKobold-App mit WLAN verbunden, Update starten und bis zum Ende auf der Station lassen.<br><b>Per USB-C (nur Windows):</b> Akku ≥ 80 % (Info-Taste 2× kurz zeigt den Stand) → Staubbehälter raus, USB-Abdeckung öffnen → SWU-Datei aufs Roboter-Laufwerk ziehen → LEDs weiß, fertig mit Signalton. Version prüfen: beide Pfeiltasten + i-Taste mind. 10 s drücken, die Version wird angesagt.",
    vr300: "Aktuelle Version: 4.6.4 (WLAN-Stabilität, automatische Sommerzeit). Per App oder USB-Stick:<br>1. Roboter auf die Basis, über START aus- und wieder einschalten.<br>2. Leeren, schnellen USB-Stick (ca. 150 MB/s) vorbereiten.<br>3. Update-ZIP (ca. 15 MB) laden, entpacken, Ordner „RobotData“ auf den Stick.<br>4. Staubfach öffnen, Gummischutz ab (LED bunt).<br>5. Kobold-USB-Adapter mit Stick anschließen (LED grün).<br>6. Warten bis Signalton und bunte LED, dann Stick ab, Gummischutz zu.<br>„Software passt nicht zum Modell“ = falsche Datei.",
    vr200: "Kein Update per App. Die Seite nennt 2.1.7 als aktuell (erneuert das SSL-Zertifikat, App-Steuerung geht wieder). Achtung: Dieselbe Seite nennt „kein Downgrade nach 2.1.9“ – das passt nicht zusammen, vorher die aktuelle Vorwerk-Seite prüfen.<br>1. Roboter aus- und wieder einschalten.<br>2. Leeren USB-Stick, Ordner „RobotData“ draufkopieren.<br>3. Kobold-USB-Adapter und Stick anschließen.<br>4. Display: Einstellungen → „Software Update“ bestätigen.<br>5. Version prüfen: Info → Revision → Sw ver.",
    vr100: "Der VR100 wird nicht mehr repariert. Vorwerk hat eine eigene Seite zu den Betriebssystemen 2011/2013; Details sind nicht verifiziert.",
  };

  const SERVICE = {
    ablauf: [
      "Auftrag online oder per Reparaturauftrag – oder Abgabe im Vorwerk Store (dort auf Anfrage auch Leihgeräte).",
      "Komfortversand: UPS holt ab, DHL bringt zurück.",
      "Dauer: in der Regel rund 7 Tage.",
      "Mitschicken: Tiger mit Elektrosaugschlauch (ESS), Akku-Sauger mit Akku und Ladegerät, Roboter mit Ladestation.",
      "Software wird bei der Reparatur automatisch aktualisiert.",
      "Repariert werden nur Funktions- und Sicherheitsmängel, keine Schönheitsreparaturen.",
      "Ersatzteile gibt es nicht im Store, nur über den Reparaturservice.",
    ],
    garantie: [
      "Gesetzliche Gewährleistung: 2 Jahre – nur bei Direktkauf bei Vorwerk oder mit Kopie der Originalrechnung (Zweiterwerb).",
      "Kobold Garantie: 3 Jahre, nur über Berater, Store oder Online-Shop, nicht verlängerbar; Geräte- und Garantierechnung nötig. Reparierte/ersetzte Teile: 24 Monate neue Garantie.",
      "Eine kostenfreie Gewährleistungsreparatur verlängert die Frist einmalig um 12 Monate – nur bei Kaufverträgen nach dem 31.07.2026.",
      "Nicht abgedeckt: Sturz-, Feuchtigkeits- und Hitzeschäden – werden gesondert berechnet.",
      "In Gewährleistung/Garantie ist die Reparatur kostenfrei; ein Leihgerät kostet trotzdem 39,99 €.",
    ],
  };

  const STOPP = [
    "Brandgeruch, Rauch, Funken",
    "überhitzter oder aufgeblähter Akku",
    "beschädigtes Netzkabel, Netzteil oder Gehäuse",
    "Feuchtigkeit in der Elektronik (SP, VG100)",
    "Fehler kommt nach Reset und Reinigung wieder (z. B. Codes 96–144, 4101)",
  ];
  const ABLAUF = [
    "Symptom aufnehmen: Modell, Seriennummer, Anzeige/LED, Code, wann es auftritt",
    "Verbrauchsteile prüfen: Filtertüte, Motorschutzfilter, Behälter, Bürsten, Saugkanal – etwa die Hälfte der „Defekte“ erledigt sich hier",
    "Gegenprobe: anderer Aufsatz, anderes Netzteil/Akku, andere Steckdose",
    "Reset: stromlos machen (Akku ≥ 1 Minute raus bzw. Stecker ziehen), neu starten; beim VK7 ggf. Werksreset",
    "Update: bei Robotern den Softwarestand prüfen",
    "Bleibt der Fehler oder kommt er wieder → Reparaturauftrag",
  ];
  const STUFE = { de: "offiziell Vorwerk DE", regio: "offiziell (anderes Land)", niedrig: "unsicher (CH-Seite)", dritt: "Drittanbieter", luecke: "nicht verifiziert" };

  return { QUELLE, KONTAKT, FAM, AM_VK7, PAUSCHALE, EXTRA_PREISE, DRITT, STATUS, TEILE, NEU, CODES, CODE_LUECKE, F, UPDATE, SERVICE, STOPP, ABLAUF, STUFE };
})();
