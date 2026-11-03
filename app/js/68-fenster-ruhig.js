/**
 * Fenster bauen sich nur beim Öffnen auf (Beta 1.4)
 *
 * Jeder Tipp in einem Fenster (Ja/Nein, Geräte, Plus/Minus, Weiter) baut den
 * Inhalt neu. Dabei starteten bisher die Einblend-Animationen erneut – das
 * ganze Fenster und jeder Block blinkten kurz. Jetzt gilt: Beim ersten
 * Aufmachen baut sich das Fenster mit Animation auf, danach steht alles
 * sofort da. Die Einblendungen werden noch vor dem nächsten Bild beendet.
 */
(function () {
  "use strict";
  const modalEl = document.getElementById("modal");
  const sheetEl = document.getElementById("sheet");
  if (!modalEl || !sheetEl || !document.getAnimations) return;

  /* Nur Aufbau-Animationen – Rückmeldungen wie das Antippen bleiben */
  const AUFBAU = new Set([
    "mBlende",
    "mBlattRein",
    "fensterRein",
    "blockRein",
    "einlauf",
    "zeileRein",
    "aufklappen",
    "pop",
    "titelTausch",
    "mSchritt",
    "terminRein",
  ]);
  let gebaut = false;
  let takt = 0;

  function beruhigen() {
    if (!gebaut || !modalEl.classList.contains("open")) return;
    document.getAnimations().forEach((a) => {
      if (a.playState !== "running" && a.playState !== "pending") return;
      if (!AUFBAU.has(a.animationName)) return;
      const ziel = a.effect && a.effect.target;
      if (!ziel) return;
      /* im Fenster und am Seitentitel dahinter */
      if (sheetEl.contains(ziel) || ziel === sheetEl || ziel.id === "pagetitle" || ziel.closest(".page")) {
        try {
          a.finish();
        } catch (e) {
          a.cancel();
        }
      }
    });
  }

  /* Fenster geht auf: erst nach dem ersten Aufbau wird beruhigt */
  new MutationObserver((liste) => {
    const jetztOffen = modalEl.classList.contains("open");
    const neuGeoeffnet = liste.some((m) => !/\bopen\b/.test(m.oldValue || ""));
    if (!jetztOffen) {
      gebaut = false;
      return;
    }
    if (neuGeoeffnet) {
      gebaut = false;
      cancelAnimationFrame(takt);
      /* zwei Bilder: Öffnen und erstes Zeichnen laufen noch mit Animation */
      takt = requestAnimationFrame(() => (takt = requestAnimationFrame(() => (gebaut = true))));
    }
  }).observe(modalEl, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });

  /* Jeder Neuaufbau danach: Einblendungen sofort beenden */
  new MutationObserver(beruhigen).observe(sheetEl, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  /* Seitentitel und Planer hinter dem Fenster werden beim Speichern neu gezeichnet */
  const haupt = document.querySelector("main");
  if (haupt) new MutationObserver(beruhigen).observe(haupt, { childList: true, subtree: true });
})();
