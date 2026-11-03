/**
 * Untere Leiste und Kopfstreifen fest am Bildschirmrand (Beta 1.2)
 *
 * iOS verschiebt nach dem Schließen der Tastatur gelegentlich den sichtbaren
 * Ausschnitt gegenüber dem Layout – fest positionierte Leisten landen dann
 * mitten auf dem Bildschirm. Zwei Gegenmittel:
 * 1 · Nach jeder Eingabe die Ansicht einmal neu ausrichten lassen.
 * 2 · Die Leisten am tatsächlich sichtbaren Ausschnitt (visualViewport) halten.
 */
(function () {
  "use strict";
  const vv = window.visualViewport;
  const wurzel = document.documentElement;
  let takt = 0;
  function ausrichten() {
    cancelAnimationFrame(takt);
    takt = requestAnimationFrame(() => {
      if (!vv) return;
      /* Tastatur offen: nichts verschieben, die Leiste soll dann nicht über der Tastatur kleben */
      const tastatur = window.innerHeight - vv.height > 150 && document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      const oben = tastatur ? 0 : Math.max(0, vv.offsetTop);
      const unten = tastatur ? 0 : window.innerHeight - (vv.offsetTop + vv.height);
      wurzel.style.setProperty("--vvoben", oben.toFixed(1) + "px");
      wurzel.style.setProperty("--vvunten", unten.toFixed(1) + "px");
    });
  }
  if (vv) {
    vv.addEventListener("resize", ausrichten);
    vv.addEventListener("scroll", ausrichten);
  }
  addEventListener("scroll", ausrichten, { passive: true });
  addEventListener("orientationchange", () => setTimeout(ausrichten, 300));
  /* Nach dem Verlassen eines Eingabefelds die Ansicht zurücksetzen */
  document.addEventListener("focusout", (ev) => {
    if (!ev.target || !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    setTimeout(() => {
      if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      window.scrollTo(window.scrollX, window.scrollY);
      ausrichten();
    }, 80);
  });
  addEventListener("hashchange", () => setTimeout(ausrichten, 50));
  ausrichten();
})();
