/**
 * Uhrzeiten nur in Viertelstunden (Beta 1.5)
 *
 * Das iPhone ignoriert bei Zeitfeldern die Schrittweite und lässt jede Minute
 * zu. Jedes Zeitfeld bekommt deshalb eine Auswahl daneben – 00:00 bis 23:45
 * in 15-Minuten-Schritten, angezeigt wie „12:00 Uhr“. Das eigentliche Feld
 * bleibt versteckt erhalten: Die Auswahl schreibt hinein und löst dieselben
 * Ereignisse aus, also funktioniert alles Bisherige unverändert.
 * Ältere, minutengenaue Werte bleiben als eigene Option erhalten.
 */
(function () {
  "use strict";
  const RASTER = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) RASTER.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

  function fuellen(sel, wert) {
    const werte = RASTER.slice();
    if (wert && !werte.includes(wert)) {
      werte.push(wert);
      werte.sort();
    }
    /* Leeres Feld: der Strich steht bei der aktuellen Uhrzeit – das Rad öffnet dort */
    const d = new Date();
    const jetzt = `${String(d.getHours()).padStart(2, "0")}:${String(Math.floor(d.getMinutes() / 15) * 15).padStart(2, "0")}`;
    sel.innerHTML = werte
      .map(
        (w) =>
          (!wert && w === jetzt ? `<option value="" selected>–</option>` : "") +
          `<option value="${w}"${w === wert ? " selected" : ""}>${w} Uhr</option>`,
      )
      .join("");
    sel.value = wert || "";
  }

  function umbauen(inp) {
    if (inp.dataset.viertel) return;
    inp.dataset.viertel = "1";
    const sel = document.createElement("select");
    sel.className = "viertel";
    if (inp.id) sel.id = inp.id + "_vs";
    const lbl = inp.id && document.querySelector(`label[for="${CSS.escape(inp.id)}"]`);
    if (lbl) {
      lbl.htmlFor = sel.id;
      sel.setAttribute("aria-label", lbl.textContent.trim());
    }
    fuellen(sel, (inp.value || "").slice(0, 5));
    inp.hidden = true;
    inp.style.display = "none";
    inp.after(sel);
    sel.addEventListener("change", () => {
      inp.value = sel.value;
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    });
    /* Setzt die App den Wert selbst, zieht die Auswahl nach */
    const beschreibung = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    Object.defineProperty(inp, "value", {
      configurable: true,
      get() {
        return beschreibung.get.call(this);
      },
      set(v) {
        beschreibung.set.call(this, v);
        const w = (v || "").slice(0, 5);
        if (sel.value !== w) fuellen(sel, w);
      },
    });
  }

  const alle = (wurzel) => {
    if (!wurzel.querySelectorAll) return;
    wurzel.querySelectorAll('input[type="time"]:not([data-viertel])').forEach(umbauen);
  };
  new MutationObserver((liste) => {
    for (const m of liste) m.addedNodes.forEach((n) => n.nodeType === 1 && (n.matches && n.matches('input[type="time"]') ? umbauen(n) : alle(n)));
  }).observe(document.body, { childList: true, subtree: true });
  alle(document);
})();
