/**
 * Zählwerk
 *
 * Zahlen zählen beim Öffnen von 0 bzw. bei Änderung vom alten Wert hoch;
 * außerhalb des Sichtbereichs erst beim Hinscrollen. Erkannt werden reine
 * Zahlentexte mit Einheit (€, %, km, Std …); Datum, Uhrzeit, PLZ, Telefonnummern,
 * Eingaben und das Planer-Raster bleiben unberührt.
 */
(function () {
  "use strict";
  const stufe = () => document.documentElement.dataset.anim || "voll";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      return undefined;
    }
  };

  /* Zahl mit optionalem Vorzeichen davor und kurzer Einheit dahinter */
  const MUSTER = /^([+\-−±Ø~≈]\s?)?(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(\s?[A-Za-zÄÖÜäöüß€%.×]{0,10})$/;
  const AUSSCHLUSS = [
    "input",
    "textarea",
    "select",
    "option",
    ".btn",
    ".mini",
    ".stepper",
    ".checks",
    "th",
    "script",
    "style",
    "svg",
    "#grid",
    ".seg",
    "[data-menge]",
    ".vzahl",
    "[data-bis]",
    "[data-keinzaehlen]",
    ".mplus",
    ".walze",
    ".htlachse",
    ".htljetzt",
    '[class*="achse"]',
    ".drawer",
    ".tabbar",
    "#tabbar",
    ".pagetitle",
    ".mgruss",
    "#login",
  ].join(",");

  function lesen(text) {
    const t = text.trim();
    if (!t || t.length > 22) return null;
    const m = MUSTER.exec(t);
    if (!m) return null;
    const vor = m[1] || "",
      ganz = m[2],
      komma = m[3] || "",
      nach = m[4] || "";
    if (nach.trim() === ".") return null; /* "11." = Tag */
    const punkte = ganz.includes(".");
    const roh = ganz.replace(/\./g, "");
    if (!punkte && !komma && !nach.trim()) {
      if (roh.length > 1 && roh[0] === "0") return null; /* Vorwahl, PLZ */
      const n = +roh;
      if (n >= 1900 && n <= 2100) return null; /* Jahreszahl */
      if (n >= 10000) return null; /* PLZ, Nummern */
    }
    const wert = parseFloat(roh + (komma ? "." + komma.slice(1) : ""));
    if (!isFinite(wert)) return null;
    const minus = /^[\-−]/.test(vor);
    return {
      wert,
      vor,
      nach,
      stellen: komma ? komma.length - 1 : 0,
      gruppe: punkte,
      minus,
      text: t,
      links: text.slice(0, text.indexOf(t[0])),
      rechts: text.slice(text.lastIndexOf(t[t.length - 1]) + 1),
    };
  }
  function schreiben(z, w) {
    const zahl = w.toLocaleString("de-DE", {
      minimumFractionDigits: z.stellen,
      maximumFractionDigits: z.stellen,
      useGrouping: z.gruppe,
    });
    return z.links + z.vor + zahl + z.nach + z.rechts;
  }

  /* ---------- Laufende Zähler ---------- */
  const laufend = new Set();
  const belegt = new WeakSet(); /* Knoten, die gerade zählen oder warten */
  const weich = (x) => 1 - Math.pow(1 - x, 4);

  function zaehlen(knoten, z, von, verz) {
    const eltern = knoten.parentElement;
    const ziel = knoten.nodeValue;
    const dauer = stufe() === "voll" ? 1050 : 650;
    const auftrag = { knoten, ziel, eltern, ende: null };
    belegt.add(knoten);
    if (eltern) {
      eltern.dataset.mziel = z.text;
      eltern.classList.add("mzaehlt");
    }
    knoten.nodeValue = schreiben(z, von);
    let start = null;
    const schritt = (jetzt) => {
      if (!knoten.isConnected || (knoten.nodeValue === ziel && start !== null)) {
        fertig();
        return;
      }
      if (start === null) start = jetzt + verz;
      const t = Math.min(1, Math.max(0, (jetzt - start) / dauer));
      if (t >= 1) {
        fertig();
        return;
      }
      knoten.nodeValue = schreiben(z, von + (z.wert - von) * weich(t));
      auftrag.raf = requestAnimationFrame(schritt);
    };
    function fertig() {
      cancelAnimationFrame(auftrag.raf);
      if (knoten.isConnected) knoten.nodeValue = ziel;
      if (eltern) {
        delete eltern.dataset.mziel;
        eltern.classList.remove("mzaehlt");
      }
      belegt.delete(knoten);
      laufend.delete(auftrag);
    }
    auftrag.ende = fertig;
    laufend.add(auftrag);
    auftrag.raf = requestAnimationFrame(schritt);
  }
  /* Sofort alle Zähler auf ihren Endwert setzen */
  function allesFertig() {
    [...laufend].forEach((a) => sicher(a.ende));
  }

  /* ---------- Suchen und vergleichen ---------- */
  const gemerkt = new Map(); /* "wurzel|nr" -> zuletzt gezeigter Wert */
  let wartend = null; /* noch nicht sichtbare Zahlen */

  function sichtbarkeit() {
    if (wartend) return wartend;
    wartend = new IntersectionObserver(
      (eintraege) => {
        eintraege.forEach((e) => {
          if (!e.isIntersecting) return;
          wartend.unobserve(e.target);
          const liste = e.target._mwarte || [];
          delete e.target._mwarte;
          liste.forEach((p, i) =>
            sicher(() => {
              belegt.delete(p.knoten);
              if (p.knoten.isConnected && p.knoten.nodeValue === p.anzeige) {
                p.knoten.nodeValue = p.ziel;
                zaehlen(p.knoten, p.z, p.von, i * 35);
              }
            }),
          );
        });
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    return wartend;
  }

  function zahlenIn(wurzel) {
    const treffer = [];
    const gang = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !/\d/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        const e = n.parentElement;
        if (!e || e.closest(AUSSCHLUSS)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = gang.nextNode()) && treffer.length < 400) {
      const z = lesen(n.nodeValue);
      if (z) treffer.push({ knoten: n, z });
    }
    return treffer;
  }

  function pruefen(wurzel, name) {
    if (!wurzel || !wurzel.isConnected) return;
    const zahlen = zahlenIn(wurzel);
    const aktiv = stufe() !== "aus";
    const hoehe = innerHeight || 800;
    /* Erst alle Werte messen, dann schreiben – vermeidet wiederholte Layoutberechnung. */
    const kandidaten = [];
    zahlen.forEach(({ knoten, z }, i) => {
      const schluessel = name + "|" + i;
      if (belegt.has(knoten)) return; /* zählt schon - nicht dazwischenfunken */
      const alt = gemerkt.get(schluessel);
      gemerkt.set(schluessel, z.wert);
      if (!aktiv || alt === z.wert) return;
      if (alt === undefined && z.wert === 0) return;
      if (kandidaten.length > 120) return;
      kandidaten.push({ knoten, z, von: alt === undefined ? 0 : alt });
    });
    kandidaten.forEach((k) => {
      k.r = k.knoten.parentElement.getBoundingClientRect();
    });
    let nr = 0;
    kandidaten.forEach(({ knoten, z, von, r }) => {
      if (!r.width && !r.height) return; /* unsichtbar */
      if (r.top > hoehe || r.bottom < 0) {
        /* erst beim Hinscrollen: bis dahin steht der Startwert da */
        const e = knoten.parentElement,
          ziel = knoten.nodeValue;
        knoten.nodeValue = schreiben(z, von);
        belegt.add(knoten);
        (e._mwarte = e._mwarte || []).push({ knoten, z, von, ziel, anzeige: knoten.nodeValue });
        sichtbarkeit().observe(e);
        return;
      }
      zaehlen(knoten, z, von, Math.min(nr++ * 28, 420));
    });
  }

  /* Neu geöffnet: Zustand verwerfen, damit wieder von 0 gezählt wird */
  function vergessen(name) {
    [...gemerkt.keys()].forEach((k) => {
      if (k.startsWith(name + "|")) gemerkt.delete(k);
    });
  }

  /* ---------- Seiten und Fenster beobachten ---------- */
  const wurzeln = () => {
    const l = [];
    const seite = document.querySelector(".page.active");
    if (seite) l.push([seite, seite.id || "seite"]);
    const sheet = document.getElementById("sheet");
    const modal = document.getElementById("modal");
    if (sheet && modal && modal.classList.contains("open")) l.push([sheet, "fenster"]);
    return l;
  };
  let geplant = false;
  function allePruefen() {
    geplant = false;
    wurzeln().forEach(([w, n]) => sicher(() => pruefen(w, n)));
  }

  const haupt = document.querySelector("main") || document.body;
  const beob = new MutationObserver((liste) => {
    /* nur echte Neuzeichnungen, nicht unsere eigenen Schritte */
    if (!liste.some((m) => m.type === "childList")) return;
    if (geplant) return;
    geplant = true;
    allePruefen(); /* sofort, damit nichts aufblitzt */
  });
  beob.observe(document.body, { childList: true, subtree: true });

  /* Seitenwechsel: alles von 0 */
  if (typeof window.show === "function") {
    const showVor = window.show;
    window.show = function () {
      const vorher = document.body.dataset.page;
      const r = showVor.apply(this, arguments);
      sicher(() => {
        const seite = document.querySelector(".page.active");
        if (seite && vorher !== document.body.dataset.page) {
          vergessen(seite.id || "seite");
          pruefen(seite, seite.id || "seite");
        }
      });
      return r;
    };
  }
  /* Fenster geht auf: alles von 0 */
  const modal = document.getElementById("modal");
  if (modal) {
    let offen = modal.classList.contains("open");
    new MutationObserver(() => {
      const jetzt = modal.classList.contains("open");
      if (jetzt && !offen) {
        vergessen("fenster");
        requestAnimationFrame(() => sicher(() => pruefen(document.getElementById("sheet"), "fenster")));
      }
      offen = jetzt;
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }
  /* Beim Start und nach dem Anmelden */
  function anwerfen() {
    const s = document.querySelector(".page.active");
    if (s) {
      vergessen(s.id || "seite");
      pruefen(s, s.id || "seite");
    }
  }
  if (document.readyState === "complete") setTimeout(anwerfen, 160);
  else addEventListener("load", () => setTimeout(anwerfen, 160));

  window.mZaehlwerk = { allesFertig, pruefen: allePruefen, lesen };
})();
