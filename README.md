# Provisio Online

Online-Version von Provisio mit Anmeldung und Ende-zu-Ende-verschlüsseltem Abgleich
zwischen Geräten. Die Offline-App (auroraVorwerk/provisio) läuft unabhängig daneben.

- `app/` – die App (statisch, GitHub Pages). Stand der Funktionen: Beta 1.8.2.
- `server/` – Schnittstelle als Scaleway Serverless Function (Node 22, fr-par),
  Daten in privatem Object Storage. Enthält keine Zugangsdaten; diese liegen als
  geheime Umgebungsvariablen bei Scaleway.

## Unterschiede zur Offline-App
- `js/78-online.js`, `css/24-online.css` – Anmeldung über den Server, Abgleich, Online-Konto.
- `js/79-eingabeschutz.js` – wie `78-eingabeschutz.js` der Offline-App.
- `js/16-cloud-sync.js` – eigener Speicher-Namensraum `pvo:` (gleiche Domain wie die Offline-App).
- `js/47-motion.js`, `js/73-sicherung.js` – eigene Speicher-Schlüssel.
- `js/39-einstellungen-team.js`, `js/60-einstellungen.js` – Passwort/Code auch beim Server ändern.
- `js/59-versionen.js`, `js/12-…` – Version „Online 1.0“, Security 2.0.
- `index.html`, `sw.js`, `manifest.json`, Symbole – eigener Name, CSP, eigener Cache.
