/**
 * Demo-Modus zum Ausprobieren (Beta 1.2.2)
 *
 * Aufruf mit ?demo hinter der Adresse. Dann gilt:
 * – keine Anmeldung, ein Demo-Zugang mit Beispieldaten startet sofort,
 * – nichts wird gespeichert: kein localStorage, keine Datei, kein Schlüssel,
 * – echte (verschlüsselte) Daten auf dem Gerät werden weder gelesen noch berührt.
 * Nach dem Neuladen ist alles wieder auf dem Ausgangsstand.
 */
(function () {
  "use strict";
  if (!/[?&]demo(?:[=&]|$)/.test(location.search)) return;
  window.DEMO_AKTIV = true;

  /* Speicher nur im Arbeitsspeicher – verschwindet mit dem Tab */
  const mem = new Map();
  store.get = (k) => (mem.has(k) ? JSON.parse(mem.get(k)) : null);
  store.set = (k, v) => mem.set(k, JSON.stringify(v));
  store.del = (k) => mem.delete(k);

  /* Kein Lesen oder Schreiben echter Daten */
  datenLesen = async () => null;
  datenSchreiben = async () => {};
  userSet = async () => {};
  flushSave = async function () {
    if (!me || !dataReady) return;
    shadow = JSON.parse(JSON.stringify(clean(dataBlob())));
    saveState("Demo", true);
  };
  logout = async function () {
    location.href = location.pathname;
  };

  function demoDaten() {
    const tag = (o) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + o);
      return dk(d);
    };
    const e = {};
    const verkauf = (umsatz, einheiten, gebiet, extra) => ({
      status: "Stattgefunden",
      kundenstatus: "Neukunde",
      gebiet,
      empf: "Ja",
      job: "Nein",
      verkauft: "Ja",
      einheiten,
      umsatz: String(umsatz),
      k70: "Nein",
      ...extra,
    });
    const kein = (gebiet, grund) => ({
      status: "Stattgefunden",
      kundenstatus: "Neukunde",
      gebiet,
      empf: "Nein",
      job: "Nein",
      verkauft: "Nein",
      k70: "Nein",
      grund,
    });
    /* Vorwoche – damit Statistik, Provision und Vergleiche etwas zeigen */
    e[key(tag(-7), 9)] = { kind: "meeting", art: "Teammeeting", von: "09:00", bis: "11:00" };
    e[key(tag(-6), 10)] = {
      kind: "kunde", quelle: "Empfehlung", vorname: "Petra", nachname: "Lang",
      strasse: "Lindenallee 12", plz: "40477", ort: "Düsseldorf", von: "10:00", bis: "12:00",
      status: "stattgefunden", nb: verkauf(2380, 2, "Festgebiet"),
    };
    e[key(tag(-5), 16)] = {
      kind: "terminieren", quelle: "Promotion", von: "16:00", bis: "20:00", ort: "Rewe Bilk",
      gebiet: "Festgebiet", ziel: 6, status: "stattgefunden",
      nb: { ansprachen: 160, gespraeche: 40, termine: 5, kontakte: 4 },
    };
    e[key(tag(-4), 14)] = {
      kind: "kunde", quelle: "Festgebietsbegehung", vorname: "Jonas", nachname: "Weber",
      strasse: "Kölner Str. 80", plz: "40211", ort: "Düsseldorf", von: "14:00", bis: "16:00",
      status: "stattgefunden", nb: kein("Festgebiet", "keine Zinsen"),
    };
    e[key(tag(-3), 11)] = {
      kind: "kunde", quelle: "Promotion", vorname: "Sabine", nachname: "Hoff",
      strasse: "Rheinweg 3", plz: "40545", ort: "Düsseldorf", von: "11:00", bis: "13:00",
      status: "stattgefunden", nb: verkauf(1190, 1, "Weißgebiet"),
    };
    /* Diese Woche */
    e[key(tag(0), 9)] = { kind: "meeting", art: "Teammeeting", von: "09:00", bis: "11:00" };
    e[key(tag(0), 14)] = {
      kind: "kunde", quelle: "Empfehlung", vorname: "Maria", nachname: "Schneider",
      strasse: "Hauptstr. 5", plz: "40210", ort: "Düsseldorf", telefon: "0211 123456",
      von: "14:00", bis: "15:00", status: "stattgefunden", nb: verkauf(2380, 2, "Festgebiet", { k70: "Ja", k70betrag: "120" }),
    };
    e[key(tag(1), 7)] = { kind: "privat", von: "07:00", bis: "08:00", start: "07:00" };
    e[key(tag(1), 10)] = {
      kind: "premium", vorname: "Hans", nachname: "Krüger", strasse: "Am Hang 2",
      plz: "40625", ort: "Düsseldorf", von: "10:00", bis: "12:00",
    };
    e[key(tag(1), 16)] = {
      kind: "terminieren", quelle: "Festgebietsbegehung", von: "16:00", bis: "19:00", gebiet: "Festgebiet", ziel: 4,
    };
    e[key(tag(2), 11)] = {
      kind: "kunde", quelle: "Festgebietsbegehung", vorname: "Lea", nachname: "Brandt",
      strasse: "Ackerstr. 40", plz: "40233", ort: "Düsseldorf", von: "11:00", bis: "13:00",
    };
    e[key(tag(2), 15)] = { kind: "buero", von: "15:00", bis: "16:00" };
    e[key(tag(3), 13)] = {
      kind: "kunde", quelle: "Promotion", vorname: "Tom", nachname: "Richter",
      strasse: "Nordstr. 9", plz: "40477", ort: "Düsseldorf", von: "13:00", bis: "14:00",
    };
    e[key(tag(4), 10)] = {
      kind: "terminieren", quelle: "Promotion", von: "10:00", bis: "15:00", ort: "Edeka Flingern",
      gebiet: "Weißgebiet", ziel: 8,
    };
    return { entries: e, settings: {} };
  }
  /* ?demo=einfuehrung: leeres Konto, die Praxis-Einführung startet sofort */
  const leer = /[?&]demo=einfuehrung/.test(location.search);
  loadData = async () => (leer ? { entries: {}, settings: {} } : demoDaten());

  addEventListener(
    "load",
    () => {
      setTimeout(async () => {
        if (typeof bootWeg === "function") bootWeg();
        await window.starteSitzung({
          dk: "DK00000000",
          vorname: "Demo",
          nachname: "Nutzerin",
          rolle: leer ? "KB" : "TL",
          thema: "Dunkel",
        });
        loginEl.hidden = true;
        saveState("Demo", true);
        const el = document.getElementById("saveState");
        if (el) el.title = "Demo – nichts wird gespeichert";
      }, 50);
    },
    { once: true },
  );
})();
