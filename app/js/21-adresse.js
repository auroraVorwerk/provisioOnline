/**
 * Adresseingabe (lokal, ohne Netz)
 *
 * Die frühere Adressvervollständigung über Photon/OpenStreetMap ist entfernt,
 * damit die App zu 100 % offline läuft und keine Adresse das Gerät verlässt.
 * Adressen werden ganz normal von Hand eingetippt. Dieses Modul hält nur noch
 * die von anderen Modulen erwartete Variable bereit.
 */
var adrZielFeld = null; // ohne Vorschläge bleibt dieses Feld leer
