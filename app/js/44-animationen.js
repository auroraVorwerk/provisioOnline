/**
 * Animationen
 *
 * Legt sich über die Zeichenfunktionen, ohne sie zu verändern.
 * Stufen (Einstellungen): voll, ruhig, aus. Jeder Eingriff ist gekapselt;
 * bei Fehlern zeichnet die App unverändert.
 */
(function () {
  "use strict";

  /* ---------- Stufe ---------- */
  const STUFEN = ["voll", "ruhig", "aus"];
  const sparsam = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stufe() {
    try {
      const s = typeof settings === "object" && settings && settings.anim;
      /* „Volle Pulle“ gibt es nicht mehr – dezent ist der Standard */
      if (s === "aus") return "aus";
    } catch (e) {}
    return "ruhig";
  }
  function stufeSetzen(v) {
    if (!STUFEN.includes(v)) return;
    try {
      settings.anim = v;
      if (typeof saveData === "function") saveData();
    } catch (e) {}
    anwenden();
    try {
      renderProfil();
    } catch (e) {}
  }
  function anwenden() {
    document.documentElement.dataset.anim = stufe();
  }
  anwenden();

  const an = () => document.documentElement.dataset.anim !== "aus";
  const voll = () => document.documentElement.dataset.anim === "voll";

  /* Kurz warten, damit sich Layout und Zeichnen nicht ins Gehege kommen */
  const naechstesBild = (f) => requestAnimationFrame(() => requestAnimationFrame(f));

  /* ---------- Blöcke gestaffelt einblenden ---------- */
  /* Was unterhalb des Bildschirms liegt, läuft erst beim Hinscrollen ein. */
  let beobachter = null;
  function beobachten(el, klasse) {
    if (!beobachter) {
      beobachter = new IntersectionObserver(
        (eintraege) => {
          eintraege.forEach((e) => {
            if (!e.isIntersecting) return;
            beobachter.unobserve(e.target);
            const el2 = e.target,
              k = el2.dataset.wartet || "einlaufen";
            delete el2.dataset.wartet;
            el2.style.visibility = "";
            el2.style.setProperty("--i", 0);
            el2.classList.add(k);
            el2.addEventListener(
              "animationend",
              () => {
                el2.classList.remove(k);
                el2.style.removeProperty("--i");
              },
              { once: true },
            );
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.04 },
      );
    }
    el.dataset.wartet = klasse;
    el.style.visibility = "hidden";
    beobachter.observe(el);
    /*
     * Sicherheitsnetz: nach sechs Sekunden wird auf jeden Fall gezeigt,
     *  damit nie etwas unsichtbar hängen bleibt.
     */
    setTimeout(() => {
      if (!el.dataset.wartet) return;
      delete el.dataset.wartet;
      el.style.visibility = "";
      try {
        beobachter && beobachter.unobserve(el);
      } catch (e) {}
    }, 4000);
  }
  function beobachterLeeren() {
    if (beobachter) {
      beobachter.disconnect();
      beobachter = null;
    }
  }
  function alleZeigen() {
    document.querySelectorAll("[data-wartet]").forEach((el) => {
      el.style.visibility = "";
      delete el.dataset.wartet;
    });
    beobachterLeeren();
  }
  /* Vor dem Drucken darf nichts versteckt sein. */
  addEventListener("beforeprint", alleZeigen);
  if (window.matchMedia)
    try {
      matchMedia("print").addEventListener("change", (e) => {
        if (e.matches) alleZeigen();
      });
    } catch (e) {}

  function staffeln(liste, klasse, hoechstens) {
    if (!an() || !liste || !liste.length) return;
    const max = hoechstens || 12;
    const unten = innerHeight * 1.15;
    /* In drei Durchgängen: messen, zurücksetzen, starten – vermeidet Layout-Thrashing. */
    const els = [...liste].filter((el) => el && el.style);
    const rects = els.map((el) => {
      try {
        return el.getBoundingClientRect();
      } catch (e) {
        return null;
      }
    });
    const los = [];
    els.forEach((el, i) => {
      const r = rects[i];
      if (r && r.width === 0 && r.height === 0) return; /* nicht angezeigt */
      /* liegt der Block noch weit unten? dann erst beim Scrollen */
      if (r && r.top > unten && voll() && klasse === "einlaufen") {
        beobachten(el, klasse);
        return;
      }
      los.push([el, i]);
    });
    if (!los.length) return;
    los.forEach(([el]) => el.classList.remove(klasse));
    void document.body.offsetWidth; /* Lauf neu starten */
    los.forEach(([el, i]) => {
      el.style.setProperty("--i", Math.min(i, max));
      el.classList.add(klasse);
      el.addEventListener(
        "animationend",
        () => {
          el.classList.remove(klasse);
          el.style.removeProperty("--i");
          el.style.willChange = "";
        },
        { once: true },
      );
    });
  }

  /*
   * Der eigentliche Inhaltsknoten einer Seite: viele Seiten sind nur
   * eine Hülle um ein einziges <div>, in dem die Blöcke stecken.
   */
  function inhaltsknoten(seite) {
    let n = seite,
      tiefe = 0;
    while (tiefe++ < 3 && n.children.length === 1 && n.firstElementChild.children.length >= 2)
      n = n.firstElementChild;
    return n;
  }

  /* ---------- Ziffernwalze ---------- */
  const ZIFFERN = "0123456789";
  const letzteWerte = new Map(); /* Schlüssel -> zuletzt gezeigter Text */

  function zeilenHoehe(el) {
    const st = getComputedStyle(el);
    let h = parseFloat(st.lineHeight);
    if (!h || isNaN(h)) h = parseFloat(st.fontSize) * 1.25;
    return Math.round(h);
  }

  function rollen(el, alt, neu) {
    const zh = zeilenHoehe(el);
    const n = neu.split("");
    const a = alt.split("");
    while (a.length < n.length) a.unshift(" ");
    const stapelHtml = (ZIFFERN + ZIFFERN + ZIFFERN + ZIFFERN)
      .split("")
      .map((d) => `<span>${d}</span>`)
      .join("");

    let h = "",
      zi = 0;
    const ziele = [];
    n.forEach((z, i) => {
      if (z >= "0" && z <= "9") {
        const von = a[i] >= "0" && a[i] <= "9" ? +a[i] : 0;
        const bis = +z + 30; /* drei volle Umdrehungen */
        ziele.push({ von: -von * zh, bis: -bis * zh, verz: zi * 45 });
        h +=
          `<span class="zi" data-roll="${ziele.length - 1}">` +
          `<span class="walzestapel">${stapelHtml}</span></span>`;
        zi++;
      } else {
        h += `<span class="fix">${z === " " ? "\u00a0" : z}</span>`;
      }
    });

    el.style.setProperty("--zh", zh + "px");
    el.classList.add("walze");
    el.innerHTML = h;
    const walzen = [...el.querySelectorAll(".zi")];
    walzen.forEach((w) => {
      const z = ziele[+w.dataset.roll];
      const s = w.firstElementChild;
      s.style.transform = `translateY(${z.von}px)`;
      s.style.transitionProperty = "transform";
      s.style.transitionDuration = "1.05s";
      s.style.transitionTimingFunction = "cubic-bezier(.16,.84,.26,1)";
      s.style.transitionDelay = z.verz + "ms";
    });
    naechstesBild(() => {
      walzen.forEach((w) => {
        const z = ziele[+w.dataset.roll];
        w.firstElementChild.style.transform = `translateY(${z.bis}px)`;
      });
    });
    const ende = 1120 + (ziele.length ? (ziele.length - 1) * 45 : 0);
    setTimeout(() => {
      try {
        el.classList.remove("walze");
        el.style.removeProperty("--zh");
        el.textContent = neu;
        el.classList.add("frischgerollt");
        setTimeout(() => el.classList.remove("frischgerollt"), 600);
      } catch (e) {}
    }, ende);
  }

  let laufendeWalzen = 0;
  function zahlBeleben(el, schluessel, beimOeffnen) {
    const neu = (el.textContent || "").trim();
    if (!neu || !/\d/.test(neu)) {
      letzteWerte.set(schluessel, neu);
      return;
    }
    const alt = letzteWerte.get(schluessel);
    letzteWerte.set(schluessel, neu);
    if (!voll()) return;
    /*
     * Beim Öffnen einer Seite zählt alles von null hoch.
     *  Beim stillen Nachzeichnen nur, wenn sich der Wert wirklich geändert hat.
     */
    if (!beimOeffnen && alt === neu) return;
    if (laufendeWalzen > 14) return;
    laufendeWalzen++;
    setTimeout(() => {
      laufendeWalzen = Math.max(0, laufendeWalzen - 1);
    }, 1500);
    const start = beimOeffnen || alt === undefined ? neu.replace(/\d/g, "0") : alt;
    try {
      rollen(el, start, neu);
    } catch (e) {
      el.textContent = neu;
    }
  }

  function zahlenBeleben(wurzel, erstesMal) {
    if (!an() || !wurzel) return;
    if (window.mZaehlwerk) return; /* Hochzählen übernimmt 48-zaehlwerk.js */
    const seite = (document.body.dataset.page || "") + "/";
    wurzel.querySelectorAll(".kpi").forEach((k) => {
      const v = k.querySelector(".kv");
      if (!v) return;
      const l = k.querySelector(".kl");
      const schluessel =
        seite + (l ? l.textContent.trim() : "") + "#" + [...k.parentNode.children].indexOf(k);
      zahlBeleben(v, schluessel, erstesMal);
    });
    wurzel.querySelectorAll("[data-walze]").forEach((v, i) => {
      zahlBeleben(v, seite + "w" + i, erstesMal);
    });
  }

  /* ---------- Balken wachsen ---------- */
  function balkenBeleben(wurzel) {
    if (!an() || !wurzel) return;
    const treffer = wurzel.querySelectorAll(
      ".bar > i, .balken .stab, .balken > i, .zbar > i, .fortschritt > i, .pbalken > i",
    );
    const els = [...treffer].slice(0, 40);
    if (!els.length) return;
    els.forEach((el) => el.classList.remove("waechst"));
    void wurzel.offsetWidth; /* einmal für alle Balken */
    els.forEach((el, i) => {
      el.style.setProperty("--i", Math.min(i, 14));
      el.classList.add("waechst");
      el.addEventListener(
        "animationend",
        () => {
          el.classList.remove("waechst");
          el.style.removeProperty("--i");
        },
        { once: true },
      );
    });
  }

  /* ---------- Segmentleisten ---------- */
  function pilleSetzen(seg, mitSchwung) {
    if (!seg || !an()) return;
    let p = seg.querySelector(":scope > .segpille");
    if (!p) {
      p = document.createElement("span");
      p.className = "segpille";
      p.setAttribute("aria-hidden", "true");
      seg.prepend(p);
      seg.classList.add("mitpille");
    }
    const akt = seg.querySelector('button[aria-pressed="true"]');
    if (!akt) {
      p.style.opacity = 0;
      return;
    }
    const sr = seg.getBoundingClientRect(),
      br = akt.getBoundingClientRect();
    if (!br.width) {
      p.style.opacity = 0;
      return;
    }
    p.style.opacity = 1;
    p.style.width = br.width + "px";
    p.style.height = br.height + "px";
    p.style.transform = `translate(${br.left - sr.left}px, ${br.top - sr.top}px)`;
    if (mitSchwung && voll()) {
      p.animate([{ transform: p.style.transform + " scaleX(1.14)" }, { transform: p.style.transform }], {
        duration: 360,
        easing: "cubic-bezier(.34,1.56,.64,1)",
      });
    }
  }
  function alleSegmente(wurzel) {
    (wurzel || document).querySelectorAll(".seg").forEach((s) => {
      if (s.querySelector("button")) pilleSetzen(s, false);
    });
  }

  /* ---------- Untere Leiste ---------- */
  function tabPille() {
    const bar = document.getElementById("tabbar");
    if (!bar || !an()) return;
    let p = bar.querySelector(":scope > .tabpille");
    if (!p) {
      p = document.createElement("span");
      p.className = "tabpille";
      p.setAttribute("aria-hidden", "true");
      bar.prepend(p);
    }
    const akt = bar.querySelector('[aria-current="page"]');
    if (!akt) {
      p.style.opacity = 0;
      return;
    }
    const br2 = bar.getBoundingClientRect(),
      ar = akt.getBoundingClientRect();
    if (!ar.width) {
      p.style.opacity = 0;
      return;
    }
    p.style.opacity = 1;
    p.style.width = ar.width + "px";
    p.style.height = ar.height - 12 + "px";
    p.style.transform = `translateX(${ar.left - br2.left}px)`;
  }

  /* ---------- Druckwelle auf Schaltflächen ---------- */
  const WELLENZIEL = ".btn,.mini,.todaybtn,.segbtn,.seg button,.checks button";
  document.addEventListener(
    "pointerdown",
    (ev) => {
      if (!voll()) return;
      const b = ev.target.closest(WELLENZIEL);
      if (!b || b.disabled) return;
      try {
        const r = b.getBoundingClientRect();
        const gr = Math.max(r.width, r.height);
        const w = document.createElement("span");
        w.className = "druckwelle";
        w.style.width = w.style.height = gr + "px";
        w.style.left = ev.clientX - r.left - gr / 2 + "px";
        w.style.top = ev.clientY - r.top - gr / 2 + "px";
        b.appendChild(w);
        w.addEventListener("animationend", () => w.remove(), { once: true });
      } catch (e) {}
    },
    { passive: true },
  );

  /* Nach einem Klick auf eine Segmenttaste wandert die Pille */
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest(".seg button");
    if (!b) return;
    const seg = b.closest(".seg");
    setTimeout(() => pilleSetzen(seg, true), 20);
  });

  /* Kleine Rückmeldung am Gerät, wo das geht */
  function tippRuckeln(ms) {
    try {
      if (voll() && navigator.vibrate) navigator.vibrate(ms || 8);
    } catch (e) {}
  }
  document.addEventListener("click", (ev) => {
    if (ev.target.closest(".btn.primary,.slot,.tab")) tippRuckeln(9);
  });

  /* ---------- Seitenwechsel ---------- */
  let welle = null;
  function welleLaufen() {
    if (!voll()) return;
    if (!welle) {
      welle = document.createElement("div");
      welle.id = "seitenwelle";
      welle.innerHTML = "<i></i>";
      document.body.appendChild(welle);
    }
    welle.classList.remove("laeuft");
    void welle.offsetWidth;
    welle.classList.add("laeuft");
    setTimeout(() => welle && welle.classList.remove("laeuft"), 640);
  }

  function seiteBeleben(seite, mitWelle) {
    if (!an() || !seite) return;
    beobachterLeeren();
    /* verwaiste Wartezustände aufheben */
    document.querySelectorAll("[data-wartet]").forEach((el) => {
      el.style.visibility = "";
      delete el.dataset.wartet;
    });
    if (mitWelle) welleLaufen();
    const knoten = inhaltsknoten(seite);
    staffeln(knoten.children, "einlaufen", 11);
    zahlenBeleben(seite, true);
    balkenBeleben(seite);
    naechstesBild(() => {
      alleSegmente(seite);
      tabPille();
    });
    /* Tabellenzeilen, aber höchstens die ersten 14 */
    const zeilen = seite.querySelectorAll("table tbody tr, table tr");
    if (zeilen.length && zeilen.length < 60) staffeln([...zeilen].slice(0, 14), "zeilerein", 13);
    const t = document.getElementById("pagetitle");
    if (t) {
      t.classList.remove("wechsel");
      void t.offsetWidth;
      t.classList.add("wechsel");
    }
  }

  if (typeof window.show === "function") {
    const showVorAnim = window.show;
    window.show = function (k) {
      const vorher = document.body.dataset.page;
      const alte = document.querySelector(".page.active");
      if (an() && alte && vorher && vorher !== k && voll()) {
        alte.classList.add("raus");
        setTimeout(() => alte.classList.remove("raus"), 200);
      }
      showVorAnim.apply(this, arguments);
      if (vorher === document.body.dataset.page) return;
      try {
        seiteBeleben(document.querySelector(".page.active"), true);
      } catch (e) {}
    };
  }

  /* ---------- Nachzeichnen ohne Staffelung ---------- */
  function stillNachziehen() {
    try {
      const seite = document.querySelector(".page.active");
      if (!seite) return;
      zahlenBeleben(seite, false);
      alleSegmente(seite);
      tabPille();
    } catch (e) {}
  }

  if (typeof window.renderAll === "function") {
    const renderAllVorAnim = window.renderAll;
    window.renderAll = function () {
      const r = renderAllVorAnim.apply(this, arguments);
      naechstesBild(stillNachziehen);
      return r;
    };
  }

  /* ---------- Planer: Termine einblenden ---------- */
  /* Welcher Termin zuletzt offen war – der leuchtet nach dem Schließen auf. */
  let frischerSlot = null;
  if (typeof window.openSlot === "function") {
    const openSlotVorAnim = window.openSlot;
    window.openSlot = function (tag, stunde) {
      frischerSlot = { tag, stunde };
      return openSlotVorAnim.apply(this, arguments);
    };
  }
  function slotLeuchten() {
    if (!an() || !frischerSlot) return;
    const g = document.getElementById("grid");
    if (!g) return;
    const s = g.querySelector(
      `.slot.filled[data-day="${frischerSlot.tag}"][data-hour="${frischerSlot.stunde}"]`,
    );
    frischerSlot = null;
    if (!s) return;
    s.classList.remove("neu");
    void s.offsetWidth;
    s.classList.add("neu");
    setTimeout(() => s.classList.remove("neu"), 1300);
  }

  let letzteWoche = null;
  function planerBeleben() {
    if (!an()) return;
    const g = document.getElementById("grid");
    if (!g) return;
    let marke = "";
    try {
      marke = String(+monday);
    } catch (e) {}
    if (marke && marke === letzteWoche) return; /* gleiche Woche */
    letzteWoche = marke;
    const voll2 = g.querySelectorAll(".slot.filled");
    if (voll2.length && voll2.length < 70) staffeln(voll2, "faellt", 16);
  }
  /* Nach dem Schließen eines Fensters wird neu gezeichnet */
  if (typeof window.closeUndZeichnen === "function") {
    const czVorAnim = window.closeUndZeichnen;
    window.closeUndZeichnen = function () {
      const r = czVorAnim.apply(this, arguments);
      setTimeout(() => {
        try {
          slotLeuchten();
        } catch (e) {}
      }, 120);
      return r;
    };
  }
  if (typeof window.render === "function") {
    const renderVorAnim = window.render;
    window.render = function () {
      const r = renderVorAnim.apply(this, arguments);
      naechstesBild(() => {
        try {
          planerBeleben();
          slotLeuchten();
        } catch (e) {}
      });
      return r;
    };
  }

  /* ---------- Fensterinhalt gestaffelt ---------- */
  let fensterSig = "";
  function fensterBeleben() {
    if (!an()) return;
    const k = document.querySelector("#sheet .sheetkoerper");
    if (!k) return;
    /* Nur wenn ein neues Fenster oder ein neuer Schritt kommt – nicht bei jeder Eingabe */
    const t = document.getElementById("mTitle");
    const sig = [
      t ? t.textContent : "",
      typeof step !== "undefined" ? step : "",
      typeof draft !== "undefined" && draft ? draft.nbSchritt : "",
    ].join("|");
    if (sig === fensterSig && modal.classList.contains("open")) return;
    fensterSig = sig;
    [...k.children].forEach((el, i) => {
      el.classList.remove("fensterteil");
      void el.offsetWidth;
      el.style.setProperty("--i", Math.min(i, 8));
      el.classList.add("fensterteil");
      el.addEventListener(
        "animationend",
        () => {
          el.classList.remove("fensterteil");
          el.style.removeProperty("--i");
        },
        { once: true },
      );
    });
    naechstesBild(() => alleSegmente(document.getElementById("sheet")));
  }
  if (typeof window.paint === "function") {
    const paintVorAnim = window.paint;
    window.paint = function () {
      const r = paintVorAnim.apply(this, arguments);
      naechstesBild(() => {
        try {
          fensterBeleben();
        } catch (e) {}
      });
      return r;
    };
  }

  if (typeof window.closeModal === "function") {
    const closeVorSig = window.closeModal;
    window.closeModal = function () {
      fensterSig = "";
      return closeVorSig.apply(this, arguments);
    };
  }

  /* ---------- Menüeinträge ---------- */
  if (typeof window.setMenu === "function") {
    const setMenuVorAnim = window.setMenu;
    window.setMenu = function (offen) {
      const r = setMenuVorAnim.apply(this, arguments);
      if (offen && voll()) {
        naechstesBild(() => {
          document.querySelectorAll(".drawer .navliste a").forEach((a, i) => {
            a.style.setProperty("--i", Math.min(i, 14));
          });
        });
      }
      return r;
    };
  }

  /* ---------- Speicherzustand ---------- */
  if (typeof window.saveState === "function") {
    const saveStateVorAnim = window.saveState;
    window.saveState = function (text, warn) {
      const r = saveStateVorAnim.apply(this, arguments);
      try {
        const el = document.getElementById("saveState");
        if (el && an() && !warn) {
          el.classList.remove("frisch");
          void el.offsetWidth;
          el.classList.add("frisch");
        }
      } catch (e) {}
      return r;
    };
  }

  /* ---------- Schaltfläche mit Ladezustand ---------- */
  window.knopfArbeitet = function (btn, versprechen) {
    if (!btn) return versprechen;
    const fertig = () => {
      btn.classList.remove("laedt");
      if (an()) {
        btn.classList.add("fertig");
        setTimeout(() => btn.classList.remove("fertig"), 700);
      }
    };
    btn.classList.add("laedt");
    return Promise.resolve(versprechen).then(
      (v) => {
        fertig();
        return v;
      },
      (e) => {
        fertig();
        throw e;
      },
    );
  };

  /* ---------- Einstellung ---------- */
  function animEinstellung() {
    const box = document.getElementById("profil");
    if (!box || box.querySelector("#animWahl")) return;
    const a = document.createElement("div");
    a.className = "asec";
    a.id = "animWahl";
    const j = stufe();
    a.innerHTML = `<h3>Bewegung</h3>
      <p class="sub">Wie lebendig die App sich anfühlen soll.</p>
      <div class="seg" id="animSeg">
        <button type="button" data-anim="voll"  aria-pressed="${j === "voll"}">Volle Pulle</button>
        <button type="button" data-anim="ruhig" aria-pressed="${j === "ruhig"}">Dezent</button>
        <button type="button" data-anim="aus"   aria-pressed="${j === "aus"}">Aus</button>
      </div>
      <p class="hinweis">„Volle Pulle“ bringt Seitenwellen, hochzählende Zahlen und
         Druckwellen auf den Knöpfen. „Dezent“ lässt nur die sanften
         Einblendungen stehen. Die Einstellung gilt nur für dieses Gerät
         und wandert mit deinem Konto mit.</p>`;
    box.appendChild(a);
    a.querySelectorAll("[data-anim]").forEach((b) => {
      b.onclick = () => stufeSetzen(b.dataset.anim);
    });
    naechstesBild(() => pilleSetzen(a.querySelector(".seg"), false));
  }

  if (typeof window.renderProfil === "function") {
    const renderProfilVorAnim = window.renderProfil;
    window.renderProfil = async function () {
      const r = await renderProfilVorAnim.apply(this, arguments);
      try {
        animEinstellung();
      } catch (e) {}
      return r;
    };
  }

  /* ---------- Aufräumen ---------- */
  let messTakt = null;
  addEventListener("resize", () => {
    clearTimeout(messTakt);
    messTakt = setTimeout(() => {
      alleSegmente();
      tabPille();
    }, 160);
  });
  addEventListener("hashchange", () => naechstesBild(tabPille));

  /* Beim Start einmal alles in Gang setzen */
  function anwerfen() {
    anwenden();
    naechstesBild(() => {
      try {
        alleSegmente();
        tabPille();
        const s = document.querySelector(".page.active");
        if (s) seiteBeleben(s, false);
      } catch (e) {}
    });
  }
  if (document.readyState === "complete") setTimeout(anwerfen, 120);
  else addEventListener("load", () => setTimeout(anwerfen, 120));

  /* Nach dem Anmelden sind die Daten da – dann noch einmal */
  if (typeof window.starteSitzung === "function") {
    const starteVorAnim = window.starteSitzung;
    window.starteSitzung = async function () {
      const r = await starteVorAnim.apply(this, arguments);
      try {
        anwenden();
        naechstesBild(anwerfen);
      } catch (e) {}
      return r;
    };
  }

  window.animStufe = stufe;
  window.animSetzen = stufeSetzen;
})();
