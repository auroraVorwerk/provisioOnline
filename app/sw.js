/**
 * Service Worker – Offlinebetrieb
 *
 * App-Gerüst: Stale-While-Revalidate aus dem Cache.
 * Online-Version: Gerüst offline verfügbar, Daten-Abgleich über die Schnittstelle
 * (POST, wird nie zwischengespeichert).
 * VERSION bei jeder Veröffentlichung erhöhen.
 */
const VERSION = "provisio-online-1.2.2";
const PRAEFIX = "provisio-online-"; // nur eigene Caches anfassen (gleiche Domain wie die Offline-App)
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/01-basis.css?v=62",
  "./css/02-layout.css?v=62",
  "./css/03-farbwelten.css?v=62",
  "./css/04-planer.css?v=62",
  "./css/05-heute-team.css?v=62",
  "./css/06-gestaltung.css?v=62",
  "./css/07-bedienung.css?v=62",
  "./css/08-planer-bloecke.css?v=62",
  "./css/09-fenster-tabellen.css?v=62",
  "./css/10-verkaeufe.css?v=62",
  "./css/11-anmeldungen-katalog.css?v=62",
  "./css/13-animationen.css?v=62",
  "./css/14-inventur-provision.css?v=62",
  "./css/15-motion.css?v=62",
  "./css/16-listen-motion.css?v=62",
  "./css/17-oberflaeche.css?v=62",
  "./css/18-performance.css?v=62",
  "./css/19-langzeitziel.css?v=62",
  "./css/20-heute-provision-planer.css?v=62",
  "./css/21-apple.css?v=62",
  "./css/22-duo.css?v=62",
  "./css/23-einfuehrung.css?v=62",
  "./css/25-monat-assistent.css?v=62",
  "./css/26-druck-statistik.css?v=62",
  "./js/01-konstanten.js?v=62",
  "./js/02-datum.js?v=62",
  "./js/03-daten.js?v=62",
  "./js/04-raster.js?v=62",
  "./js/05-dialog.js?v=62",
  "./js/06-nachbereitung.js?v=62",
  "./js/07-potenzial.js?v=62",
  "./js/08-wiedervorlage.js?v=62",
  "./js/09-dialogschritte.js?v=62",
  "./js/10-statistik.js?v=62",
  "./js/11-druck.js?v=62",
  "./js/12-vertriebsmonat-provision.js?v=62",
  "./js/13-provisionsrechner.js?v=62",
  "./js/14-provisionswunsch.js?v=62",
  "./js/15-auswertungen.js?v=62",
  "./js/16-cloud-sync.js?v=62",
  "./js/17-anmeldung.js?v=62",
  "./js/18-teamansicht.js?v=62",
  "./js/19-profil.js?v=62",
  "./js/20-wochenmeldung.js?v=62",
  "./js/21-adresse.js?v=62",
  "./js/22-inventur.js?v=62",
  "./js/23-ziele-jobtickets.js?v=62",
  "./js/24-team-wochenmeldung.js?v=62",
  "./js/25-fahrtenbuch.js?v=62",
  "./js/26-kundenliste.js?v=62",
  "./js/27-abgleich-papierkorb.js?v=62",
  "./js/28-heute.js?v=62",
  "./js/29-jahresrueckblick.js?v=62",
  "./js/30-zaehlen.js?v=62",
  "./js/31-hilfe.js?v=62",
  "./js/32-rahmen.js?v=62",
  "./js/33-planer-raster.js?v=62",
  "./js/34-messe.js?v=62",
  "./js/35-wochenmeldung-kennzahlen.js?v=62",
  "./js/36-heute-uebersicht.js?v=62",
  "./js/37-inventur-mindestbestand.js?v=62",
  "./js/38-team-provision.js?v=62",
  "./js/39-einstellungen-team.js?v=62",
  "./js/40-nichtkauf-checkin.js?v=62",
  "./js/41-buero-verkaeufe.js?v=62",
  "./js/42-anmeldungen-kampagnen.js?v=62",
  "./js/43-katalog.js?v=62",
  "./js/44-animationen.js?v=62",
  "./js/45-datenfreigabe.js?v=62",
  "./js/46-sicherheit.js?v=62",
  "./js/47-motion.js?v=62",
  "./js/48-zaehlwerk.js?v=62",
  "./js/49-listen-motion.js?v=62",
  "./js/50-interessenten.js?v=62",
  "./js/51-oberflaeche.js?v=62",
  "./js/52-langzeitziel.js?v=62",
  "./js/53-heute-provision-planer.js?v=62",
  "./js/54-terminmodus-trichter-urlaub.js?v=62",
  "./js/55-nachbereitung-assistent.js?v=62",
  "./js/56-provisionsaufteilung.js?v=62",
  "./js/57-teamsatz.js?v=62",
  "./js/58-provision-ansicht.js?v=62",
  "./js/59-versionen.js?v=62",
  "./js/60-einstellungen.js?v=62",
  "./js/61-gedrueckt-halten.js?v=62",
  "./js/62-verkaeufe-provision.js?v=62",
  "./js/63-planer-extras.js?v=62",
  "./js/64-schnelltermin.js?v=62",
  "./js/65-leiste-fixieren.js?v=62",
  "./js/66-demo.js?v=62",
  "./js/67-duo.js?v=62",
  "./js/68-fenster-ruhig.js?v=62",
  "./js/69-einfuehrung.js?v=62",
  "./js/70-viertelstunde.js?v=62",
  "./js/71-kw-uebersicht.js?v=62",
  "./js/72-tagesfuelle.js?v=62",
  "./js/73-sicherung.js?v=62",
  "./js/74-pdf-auslesen.js?v=62",
  "./js/75-pdf-import.js?v=62",
  "./js/76-teammeldung-form.js?v=62",
  "./js/77-door-to-door.js?v=62",
  "./js/78-online.js?v=62",
  "./js/80-monatsansicht.js?v=62",
  "./js/81-frag-provisio.js?v=62",
  "./js/82-kobold-wissen.js?v=62",
  "./js/83-donna-stimme.js?v=62",
  "./vendor/stream-iterator.mjs",
  "./vendor/pdf.min.mjs",
  "./vendor/pdf.worker.start.mjs",
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

/*
 * Cross-Origin-Isolation: GitHub Pages kann keine eigenen Kopfzeilen senden. Der Service Worker
 * hängt COOP/COEP an alle eigenen Antworten – dann darf Donnas Spracherkennung mehrere
 * Prozessorkerne nutzen (SharedArrayBuffer). Fremde Inhalte lädt die App ohnehin nicht.
 */
function isoliert(r) {
  if (!r || r.status === 0 || r.type === "opaqueredirect" || r.type === "opaque") return r;
  const h = new Headers(r.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

self.addEventListener("fetch", (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== "GET") return;
  const eigen = url.origin === location.origin;

  /* Sprachmodell und Laufzeit (über 100 MB) verwaltet transformers.js selbst im
     „transformers-cache“ – nicht zusätzlich hier zwischenspeichern */
  if (/\/(modell|vendor\/ort)\/|transformers\.min\.js/.test(url.pathname)) {
    if (eigen) ev.respondWith(fetch(ev.request).then(isoliert));
    return;
  }
  if (eigen) {
    /* Gerüst: erst aus dem Speicher ausliefern, dann im Hintergrund erneuern */
    ev.respondWith(
      caches.match(ev.request).then(isoliert).then((treffer) => {
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
