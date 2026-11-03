/**
 * Service Worker – Offlinebetrieb
 *
 * App-Gerüst: Stale-While-Revalidate aus dem Cache.
 * Online-Version: Gerüst offline verfügbar, Daten-Abgleich über die Schnittstelle
 * (POST, wird nie zwischengespeichert).
 * VERSION bei jeder Veröffentlichung erhöhen.
 */
const VERSION = "provisio-online-1.0.1";
const PRAEFIX = "provisio-online-"; // nur eigene Caches anfassen (gleiche Domain wie die Offline-App)
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/01-basis.css?v=57",
  "./css/02-layout.css?v=57",
  "./css/03-farbwelten.css?v=57",
  "./css/04-planer.css?v=57",
  "./css/05-heute-team.css?v=57",
  "./css/06-gestaltung.css?v=57",
  "./css/07-bedienung.css?v=57",
  "./css/08-planer-bloecke.css?v=57",
  "./css/09-fenster-tabellen.css?v=57",
  "./css/10-verkaeufe.css?v=57",
  "./css/11-anmeldungen-katalog.css?v=57",
  "./css/13-animationen.css?v=57",
  "./css/14-inventur-provision.css?v=57",
  "./css/15-motion.css?v=57",
  "./css/16-listen-motion.css?v=57",
  "./css/17-oberflaeche.css?v=57",
  "./css/18-performance.css?v=57",
  "./css/19-langzeitziel.css?v=57",
  "./css/20-heute-provision-planer.css?v=57",
  "./css/21-apple.css?v=57",
  "./css/22-duo.css?v=57",
  "./css/23-einfuehrung.css?v=57",
  "./css/24-online.css?v=57",
  "./js/01-konstanten.js?v=57",
  "./js/02-datum.js?v=57",
  "./js/03-daten.js?v=57",
  "./js/04-raster.js?v=57",
  "./js/05-dialog.js?v=57",
  "./js/06-nachbereitung.js?v=57",
  "./js/07-potenzial.js?v=57",
  "./js/08-wiedervorlage.js?v=57",
  "./js/09-dialogschritte.js?v=57",
  "./js/10-statistik.js?v=57",
  "./js/11-druck.js?v=57",
  "./js/12-vertriebsmonat-provision.js?v=57",
  "./js/13-provisionsrechner.js?v=57",
  "./js/14-provisionswunsch.js?v=57",
  "./js/15-auswertungen.js?v=57",
  "./js/16-cloud-sync.js?v=57",
  "./js/17-anmeldung.js?v=57",
  "./js/18-teamansicht.js?v=57",
  "./js/19-profil.js?v=57",
  "./js/20-wochenmeldung.js?v=57",
  "./js/21-adresse.js?v=57",
  "./js/22-inventur.js?v=57",
  "./js/23-ziele-jobtickets.js?v=57",
  "./js/24-team-wochenmeldung.js?v=57",
  "./js/25-fahrtenbuch.js?v=57",
  "./js/26-kundenliste.js?v=57",
  "./js/27-abgleich-papierkorb.js?v=57",
  "./js/28-heute.js?v=57",
  "./js/29-jahresrueckblick.js?v=57",
  "./js/30-zaehlen.js?v=57",
  "./js/31-hilfe.js?v=57",
  "./js/32-rahmen.js?v=57",
  "./js/33-planer-raster.js?v=57",
  "./js/34-messe.js?v=57",
  "./js/35-wochenmeldung-kennzahlen.js?v=57",
  "./js/36-heute-uebersicht.js?v=57",
  "./js/37-inventur-mindestbestand.js?v=57",
  "./js/38-team-provision.js?v=57",
  "./js/39-einstellungen-team.js?v=57",
  "./js/40-nichtkauf-checkin.js?v=57",
  "./js/41-buero-verkaeufe.js?v=57",
  "./js/42-anmeldungen-kampagnen.js?v=57",
  "./js/43-katalog.js?v=57",
  "./js/44-animationen.js?v=57",
  "./js/45-datenfreigabe.js?v=57",
  "./js/46-sicherheit.js?v=57",
  "./js/47-motion.js?v=57",
  "./js/48-zaehlwerk.js?v=57",
  "./js/49-listen-motion.js?v=57",
  "./js/50-interessenten.js?v=57",
  "./js/51-oberflaeche.js?v=57",
  "./js/52-langzeitziel.js?v=57",
  "./js/53-heute-provision-planer.js?v=57",
  "./js/54-terminmodus-trichter-urlaub.js?v=57",
  "./js/55-nachbereitung-assistent.js?v=57",
  "./js/56-provisionsaufteilung.js?v=57",
  "./js/57-teamsatz.js?v=57",
  "./js/58-provision-ansicht.js?v=57",
  "./js/59-versionen.js?v=57",
  "./js/60-einstellungen.js?v=57",
  "./js/61-gedrueckt-halten.js?v=57",
  "./js/62-verkaeufe-provision.js?v=57",
  "./js/63-planer-extras.js?v=57",
  "./js/64-schnelltermin.js?v=57",
  "./js/65-leiste-fixieren.js?v=57",
  "./js/66-demo.js?v=57",
  "./js/67-duo.js?v=57",
  "./js/68-fenster-ruhig.js?v=57",
  "./js/69-einfuehrung.js?v=57",
  "./js/70-viertelstunde.js?v=57",
  "./js/71-kw-uebersicht.js?v=57",
  "./js/72-tagesfuelle.js?v=57",
  "./js/73-sicherung.js?v=57",
  "./js/74-pdf-auslesen.js?v=57",
  "./js/75-pdf-import.js?v=57",
  "./js/76-teammeldung-form.js?v=57",
  "./js/77-door-to-door.js?v=57",
  "./js/78-online.js?v=57",
  "./js/79-eingabeschutz.js?v=57",
  "./vendor/pdf.min.mjs",
  "./vendor/pdf.worker.min.mjs",
];

self.addEventListener("install", (ev) => {
  self.skipWaiting();
  ev.waitUntil(
    caches
      .open(VERSION)
      .then((c) =>
        /* einzeln statt addAll: fehlt eine Datei, bricht nicht die ganze Installation ab */
        Promise.all(DATEIEN.map((d) => c.add(d).catch(() => {}))),
      )
      .catch(() => {}),
  );
});
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PRAEFIX) && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (ev) => {
  if (ev.data === "uebernehmen") self.skipWaiting();
});

self.addEventListener("fetch", (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== "GET") return;

  const eigen = url.origin === location.origin;
  if (eigen) {
    /* Gerüst: erst aus dem Speicher ausliefern, dann im Hintergrund erneuern */
    ev.respondWith(
      caches.match(ev.request).then((treffer) => {
        const frisch = fetch(ev.request)
          .then((r) => {
            const kopie = r.clone();
            caches
              .open(VERSION)
              .then((c) => c.put(ev.request, kopie))
              .catch(() => {});
            return r;
          })
          .catch(() => treffer || caches.match("./index.html"));
        return treffer || frisch;
      }),
    );
    return;
  }
  ev.respondWith(fetch(ev.request).catch(() => caches.match(ev.request)));
});
