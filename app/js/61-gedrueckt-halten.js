/**
 * Plus und Minus gedrückt halten
 *
 * Hält man einen Plus- oder Minus-Knopf gedrückt, zählt er nach kurzer Pause
 * weiter – erst langsam, dann immer schneller. Der Klick beim Loslassen
 * wird danach geschluckt, damit nichts doppelt zählt.
 */
(function () {
  "use strict";
  const ZIEL =
    "[data-zplus], [data-zminus], .stepper button, .pvrund, button[aria-label='mehr'], button[aria-label='weniger']";
  let lauf = null,
    gezaehlt = false;

  /* Ein Knopf wird beim Neuzeichnen ersetzt – über sein data-Merkmal finden wir ihn wieder */
  function wiederfinder(el) {
    for (const a of el.attributes) {
      if (a.name.startsWith("data-")) {
        const sel = `[${a.name}="${CSS.escape(a.value)}"]`;
        return () => (el.isConnected ? el : document.querySelector(sel));
      }
    }
    return () => (el.isConnected ? el : null);
  }
  function stopp() {
    if (lauf) clearTimeout(lauf);
    lauf = null;
  }
  document.addEventListener(
    "pointerdown",
    (ev) => {
      const el = ev.target.closest && ev.target.closest(ZIEL);
      if (!el || el.disabled) return;
      stopp();
      gezaehlt = false;
      const finde = wiederfinder(el);
      let takt = 170,
        n = 0;
      const tick = () => {
        const k = finde();
        if (!k) return stopp();
        gezaehlt = true;
        k.click();
        n++;
        takt = Math.max(35, takt * (n < 6 ? 0.92 : 0.82));
        lauf = setTimeout(tick, takt);
      };
      lauf = setTimeout(tick, 420);
    },
    true,
  );
  ["pointerup", "pointercancel", "blur"].forEach((t) =>
    addEventListener(t, stopp, true),
  );
  /* Klick nach dem Gedrückthalten nicht zusätzlich zählen */
  document.addEventListener(
    "click",
    (ev) => {
      if (!gezaehlt || !ev.isTrusted) return;
      const el = ev.target.closest && ev.target.closest(ZIEL);
      if (!el) return;
      gezaehlt = false;
      ev.stopPropagation();
      ev.preventDefault();
    },
    true,
  );
  /* Langes Drücken soll kein Kontextmenü oder Markieren auslösen */
  document.addEventListener(
    "contextmenu",
    (ev) => {
      if (ev.target.closest && ev.target.closest(ZIEL)) ev.preventDefault();
    },
    true,
  );
})();
