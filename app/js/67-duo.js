/**
 * iPhone Duo (Beta 1.3)
 *
 * Drei Lagen, erkannt am Seitenverhältnis 1:√2 (oder fest per Einstellung):
 * – zugeklappt (schmal, hoch): Leiste senkrecht rechts unten, bis etwa zur
 *   halben Höhe; die rechte Spalte bleibt oben frei, dort laufen Uhr und WLAN.
 * – aufgeklappt quer: alles verschwimmt, Eingaben sind gesperrt, Hinweis
 *   „Bitte ins Hochformat drehen“.
 * – aufgeklappt hoch: normale Leiste unten.
 *
 * Einstellung „pv-duo“: auto (Standard) · an · aus. Gilt je Gerät.
 */
(function () {
  "use strict";
  const wurzel = document.documentElement;
  const KLASSEN = ["duo", "duo-zu", "duo-auf", "duo-quer"];

  const duoModus = () => store.get("pv-duo") || "auto";
  window.duoModus = duoModus;

  /* Hinweis fürs Querformat */
  const dreh = document.createElement("div");
  dreh.id = "duoDreh";
  dreh.setAttribute("role", "alertdialog");
  dreh.setAttribute("aria-live", "assertive");
  dreh.innerHTML = `<div class="duodrehkarte">
      <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="15" y="6" width="18" height="30" rx="4"/>
        <path d="M8 30a16 16 0 0 0 14 12" /><path d="M18 44l4-2-2-4" />
      </svg>
      <b>Bitte ins Hochformat drehen</b>
      <span>Provisio ist fürs Hochformat gebaut. Dreh dein iPhone, dann geht es weiter.</span>
    </div>`;
  ["touchstart", "touchmove", "pointerdown", "click", "wheel", "keydown"].forEach((t) =>
    dreh.addEventListener(t, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false }),
  );

  function lage() {
    const m = duoModus();
    if (m === "aus") return "";
    const w = innerWidth,
      h = innerHeight;
    if (!w || !h) return "";
    const quer = w > h;
    const touch = matchMedia("(pointer: coarse)").matches;
    if (m === "auto") {
      /*
       * Erkannt wird am Display selbst (screen), nicht am sichtbaren Fenster:
       * Safari-Leisten und Tastatur verkürzen das Fenster, und ein normales
       * iPhone sah sonst kurz wie 1:√2 aus. Displays: iPhone 1:2,17, SE 1:1,78,
       * iPhone Duo 1:1,42–1,45. iPads (kurze Seite über 700) bleiben außen vor.
       */
      if (!touch) return "";
      const kurz = Math.min(screen.width, screen.height),
        lang = Math.max(screen.width, screen.height);
      if (!kurz) return "";
      const dr = lang / kurz;
      if (dr < 1.3 || dr > 1.56 || kurz > 700) return "";
      if (quer) return "duo-quer";
      return w < 560 ? "duo-zu" : "duo-auf";
    }
    /* fest an */
    if (quer) return "duo-quer";
    return w < 560 ? "duo-zu" : "duo-auf";
  }

  let jetzt = null;
  function anwenden() {
    const l = lage();
    if (l === jetzt) return;
    jetzt = l;
    wurzel.classList.remove(...KLASSEN);
    if (l) wurzel.classList.add("duo", l);
    if (l === "duo-quer") {
      if (!dreh.isConnected) document.body.appendChild(dreh);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      [...document.body.children].forEach((k) => {
        if (k !== dreh) k.inert = true;
      });
    } else {
      [...document.body.children].forEach((k) => (k.inert = false));
      if (dreh.isConnected) dreh.remove();
    }
    if (typeof leistenPille === "function") requestAnimationFrame(leistenPille);
  }
  window.duoAnwenden = anwenden;

  let takt = 0;
  const spaeter = () => {
    cancelAnimationFrame(takt);
    takt = requestAnimationFrame(anwenden);
  };
  addEventListener("resize", spaeter);
  addEventListener("orientationchange", () => setTimeout(anwenden, 250));
  if (window.visualViewport) visualViewport.addEventListener("resize", spaeter);
  try {
    if (navigator.devicePosture) navigator.devicePosture.addEventListener("change", spaeter);
  } catch (e) {}
  if (document.body) anwenden();
  else addEventListener("DOMContentLoaded", anwenden, { once: true });

  /* Die Markierung der Leiste läuft im Duo-zu-Modus senkrecht */
  if (typeof leistenPille === "function") {
    const pilleWaagerecht = leistenPille;
    leistenPille = function () {
      pilleWaagerecht();
      const p = document.querySelector("#tabbar > .pvpille");
      if (!p) return;
      const dr = document.getElementById("drawer");
      if (dr && dr.classList.contains("open")) {
        p.style.opacity = "1";
        p.style.transform = "translateX(400%)";
      }
      if (!wurzel.classList.contains("duo-zu")) return;
      const m = /translateX\(([-\d.]+)%\)/.exec(p.style.transform || "");
      if (m) p.style.transform = `translateY(${m[1]}%)`;
    };
  }

  /* Markierung folgt dem Öffnen und Schließen des Menüs */
  const dr = document.getElementById("drawer");
  if (dr && window.MutationObserver)
    new MutationObserver(() => typeof leistenPille === "function" && leistenPille()).observe(dr, {
      attributes: true,
      attributeFilter: ["class"],
    });

  /* Einstellung: Auto · An · Aus */
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-duo]");
    if (!b) return;
    const seg = b.closest(".ioseg");
    const werte = ["auto", "an", "aus"];
    if (seg) {
      seg.style.setProperty("--i", werte.indexOf(b.dataset.duo));
      seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }
    store.set("pv-duo", b.dataset.duo);
    jetzt = null;
    anwenden();
  });
})();
