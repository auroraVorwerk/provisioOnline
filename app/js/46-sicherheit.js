/**
 * Oberfläche
 *
 * Kleiner Helfer für die untere Leiste. Die frühere Admin-Funktion
 * "Zugang zurücksetzen" ist entfernt – ein vergessenes Passwort wird jetzt
 * über den Wiederherstellungs-Code entsperrt (siehe 17-anmeldung.js).
 */

/*
 * Untere Leiste am Handy: "Mehr" öffnet das Menü
 * (kein Inline-Skript wegen Content-Security-Policy).
 */
(function () {
  const m = document.getElementById("tabMehr"),
    b = document.getElementById("burger");
  if (m && b) m.onclick = () => b.click();
})();
