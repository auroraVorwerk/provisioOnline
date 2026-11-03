/**
 * Listen- und Seitenanimationen
 *
 * Ein-/Ausblenden von Listeneinträgen, Wiedervorlage abhaken, Markierung neuer
 * Empfehlungen, Wochenwechsel, Ziele, Jobtickets, Jahresrückblick, Auswertung,
 * Hilfe, Themenwechsel, Löschbestätigung und Kundenhistorie.
 */
(function () {
  "use strict";
  const stufe = () => document.documentElement.dataset.anim || "voll";
  const voll = () => stufe() === "voll";
  const an = () => stufe() !== "aus";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      return undefined;
    }
  };
  const bild = (f) => requestAnimationFrame(() => requestAnimationFrame(f));
  const neuStarten = (el, k) => {
    el.classList.remove(k);
    void el.offsetWidth;
    el.classList.add(k);
  };
  const seiteAktiv = () => document.querySelector(".page.active");
  const rm = (el, ms) => setTimeout(() => el && el.remove(), ms);

  /* ---------- Listen ---------- */
  const EINTRAG = ".pcard, .vkzeile, .fbkarte, .aline, .tuzeile, .ntzeile, .zzeile, .invzeile";
  function schluessel(el) {
    const ids = [];
    el.querySelectorAll("*").forEach((k) => {
      if (ids.length >= 2) return;
      for (const a of k.attributes) {
        if (a.name.startsWith("data-") && a.value && !/^(true|false)$/.test(a.value)) {
          ids.push(a.value);
          break;
        }
      }
    });
    if (el.dataset && el.dataset.fbedit) ids.unshift(el.dataset.fbedit);
    const text = (el.textContent || "").replace(/\d/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
    return { id: ids.length ? ids.join("|") : text, text };
  }
  let schnapp = null; /* Zustand vor einer Aktion */
  const uebersprungen = new Set(); /* schon selbst animiert (Erledigt) */

  function knipsen() {
    if (!an()) return;
    const seite = seiteAktiv();
    if (!seite) return;
    const eintraege = [...seite.querySelectorAll(EINTRAG)].slice(0, 160);
    const karte = new Map();
    eintraege.forEach((el) => {
      const s = schluessel(el);
      if (karte.has(s.id)) return;
      karte.set(s.id, { el, text: s.text, rect: el.getBoundingClientRect() });
    });
    schnapp = { seite: seite.id, karte, zeit: Date.now() };
  }
  ["pointerdown", "keydown", "input"].forEach((t) =>
    document.addEventListener(t, () => sicher(knipsen), true),
  );

  function geist(alt) {
    const r = alt.rect;
    if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
    const g = alt.el.cloneNode(true);
    g.removeAttribute("id");
    g.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    g.classList.add("mgeistkarte");
    g.setAttribute("aria-hidden", "true");
    g.inert = true;
    Object.assign(g.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
    document.body.appendChild(g);
    rm(g, 700);
  }

  function vergleichen() {
    const s = schnapp;
    if (!s || Date.now() - s.zeit > 6000) return;
    const seite = seiteAktiv();
    if (!seite || seite.id !== s.seite) return;
    const jetzt = [...seite.querySelectorAll(EINTRAG)].slice(0, 160);
    if (!jetzt.length && !s.karte.size) return;
    schnapp = null;
    const gesehen = new Set();
    const neue = [];
    jetzt.forEach((el) => {
      const k = schluessel(el);
      gesehen.add(k.id);
      const alt = s.karte.get(k.id);
      if (!alt) {
        neue.push(el);
        return;
      }
      const r = el.getBoundingClientRect();
      const dy = alt.rect.top - r.top,
        dx = alt.rect.left - r.left;
      if ((Math.abs(dy) > 3 || Math.abs(dx) > 3) && Math.abs(dy) < innerHeight && el.animate) {
        el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], {
          duration: 520,
          easing: "cubic-bezier(.34,1.3,.64,1)",
        });
      }
      if (alt.text !== k.text && alt.el !== el) neuStarten(el, "mblitz");
    });
    /* Viele neue auf einmal = Filter oder Suche: nur weich einblenden */
    if (neue.length > 2 || !s.karte.size) {
      neue.slice(0, 24).forEach((el, i) => {
        el.style.setProperty("--mi", i);
        neuStarten(el, "mrein");
      });
    } else {
      neue.forEach((el) => neuStarten(el, "mneu"));
    }
    s.karte.forEach((alt, id) => {
      if (gesehen.has(id)) return;
      if (uebersprungen.has(id)) {
        uebersprungen.delete(id);
        return;
      }
      geist(alt);
    });
  }
  new MutationObserver((liste) => {
    if (!schnapp || !an()) return;
    const betrifft = (n) => n.nodeType === 1 && (n.matches(EINTRAG) || !!n.querySelector(EINTRAG));
    if (
      !liste.some(
        (m) =>
          m.type === "childList" &&
          m.target.closest &&
          m.target.closest(".page") &&
          ([...m.addedNodes].some(betrifft) || [...m.removedNodes].some(betrifft)),
      )
    )
      return;
    sicher(vergleichen);
  }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });

  /* ---------- Wiedervorlage: Erledigt ---------- */
  let durchlass = false;
  document.addEventListener(
    "click",
    (ev) => {
      if (durchlass || !an()) return;
      const b = ev.target.closest && ev.target.closest("[data-wvweg]");
      if (!b) return;
      const karte = b.closest(".pcard");
      if (!karte || karte.classList.contains("merledigt")) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      sicher(() => uebersprungen.add(schluessel(karte).id));
      karte.classList.add("merledigt");
      if (!karte.querySelector(".mhaken")) {
        const h = document.createElement("span");
        h.className = "mhaken";
        h.setAttribute("aria-hidden", "true");
        h.innerHTML =
          '<svg viewBox="0 0 26 26"><circle cx="13" cy="13" r="13"></circle><path d="M7.5 13.5l3.6 3.6 7.4-7.6"></path></svg>';
        karte.appendChild(h);
      }
      setTimeout(
        () => {
          const leerVorher = document.querySelectorAll("#wvliste .pcard").length <= 1;
          durchlass = true;
          try {
            b.click();
          } finally {
            durchlass = false;
          }
          if (leerVorher)
            bild(() =>
              sicher(() => {
                if (document.querySelector("#wvliste .pcard")) return;
                const box = document.getElementById("wvliste");
                const r = box ? box.getBoundingClientRect() : { left: innerWidth / 2, top: 200, width: 0 };
                if (window.mKonfetti && voll())
                  window.mKonfetti(r.left + r.width / 2, Math.max(120, r.top + 120));
                if (window.mRueckmeldung) window.mRueckmeldung("Alles erledigt");
              }),
            );
        },
        voll() ? 620 : 300,
      );
    },
    true,
  );

  /* ---------- Neue Empfehlungen (7 Tage) ---------- */
  function empfMarken() {
    if (typeof empfehlungen === "undefined" || typeof fromDk !== "function") return;
    const sortiert = empfehlungen.slice().sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
    const karten = document.querySelectorAll("#elist .plist > .pcard");
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    karten.forEach((k, i) => {
      const p = sortiert[i];
      if (!p || !p.datum) return;
      const tage = Math.round((heute - fromDk(p.datum)) / 86400000);
      if (tage < 0 || tage > 7) return;
      const nm = k.querySelector(".nm");
      if (!nm || nm.querySelector(".m7")) return;
      const m = document.createElement("span");
      m.className = "m7";
      m.innerHTML = "<i></i>neu";
      nm.appendChild(m);
    });
  }
  if (typeof window.renderEmpfehlung === "function") {
    const vor = window.renderEmpfehlung;
    window.renderEmpfehlung = function () {
      const r = vor.apply(this, arguments);
      sicher(empfMarken);
      return r;
    };
  }

  /* ---------- Wochenwechsel ---------- */
  const PFEILE = {
    prev: [-1, ["#grid", "#tagbar"]],
    next: [1, ["#grid", "#tagbar"]],
    prev2: [-1, ["#statTable", "#statMobil"]],
    next2: [1, ["#statTable", "#statMobil"]],
    tmmVor: [-1, ["#tmeldung .ascroll"]],
    tmmZur: [1, ["#tmeldung .ascroll"]],
  };
  let gleiten = null;
  document.addEventListener(
    "click",
    (ev) => {
      const b = ev.target.closest && ev.target.closest("button[id]");
      if (!b || !PFEILE[b.id] || !voll()) return;
      gleiten = { richtung: PFEILE[b.id][0], ziele: PFEILE[b.id][1], zeit: Date.now() };
    },
    true,
  );
  function gleitenAnwenden() {
    if (!gleiten || Date.now() - gleiten.zeit > 4000) return;
    let getroffen = false;
    gleiten.ziele.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!el.offsetParent) return;
        getroffen = true;
        el.classList.remove("mgleitL", "mgleitR");
        void el.offsetWidth;
        el.classList.add(gleiten.richtung < 0 ? "mgleitL" : "mgleitR");
        setTimeout(() => el.classList.remove("mgleitL", "mgleitR"), 600);
      });
    });
    /* Wochenmeldung lädt nach - bis die Tabelle da ist, warten */
    if (getroffen && !document.querySelector("#tmeldung .laedt")) gleiten = null;
  }
  new MutationObserver(() => {
    if (gleiten) sicher(gleitenAnwenden);
  }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });

  /* ---------- Ziele, Jahresrückblick, Auswertung ---------- */
  function zieleSchmuecken() {
    document.querySelectorAll("#ziele .zziel, #heute .zziel").forEach((z) => {
      const i = z.querySelector(".zbalken i");
      const pct = i ? parseFloat((i.getAttribute("style") || "").replace(/.*--soll:\s*/, "")) : 0;
      z.classList.toggle("mfast", pct >= 85 && pct < 100 && !z.classList.contains("erreicht"));
    });
  }
  function jahrSchmuecken() {
    const saeulen = [...document.querySelectorAll("#jahr .bpaar")];
    let best = null,
      max = 0;
    saeulen.forEach((p, k) => {
      const j = p.querySelector(".bjetzt");
      if (!j) return;
      j.style.setProperty("--mi", k);
      const h = parseFloat(j.style.height) || 0;
      if (h > max) {
        max = h;
        best = p;
      }
      p.querySelectorAll("i").forEach((x) => neuStarten(x, "mhoch"));
    });
    saeulen.forEach((p) => p.classList.toggle("mbest", p === best && max > 0));
  }
  function fazitSchreiben() {
    if (!voll()) return;
    document.querySelectorAll("#ausw .fazit:not(.leer)").forEach((f) => {
      if (f.dataset.mgeschrieben) return;
      f.dataset.mgeschrieben = "1";
      let n = 0;
      const gang = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
      const knoten = [];
      let t;
      while ((t = gang.nextNode())) knoten.push(t);
      knoten.forEach((k) => {
        if (k.parentElement && k.parentElement.closest(".warn")) return;
        const teile = k.nodeValue.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        teile.forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) {
            frag.appendChild(document.createTextNode(w));
            return;
          }
          const s = document.createElement("span");
          s.className = "mwort";
          s.style.setProperty("--mi", Math.min(n++, 60));
          s.textContent = w;
          frag.appendChild(s);
        });
        k.parentNode.replaceChild(frag, k);
      });
    });
  }
  [
    ["renderZiele", zieleSchmuecken],
    ["renderHeute", zieleSchmuecken],
    ["renderJahr", jahrSchmuecken],
    ["renderAuswertung", fazitSchreiben],
    ["renderAusw", fazitSchreiben],
  ].forEach(([name, f]) => {
    if (typeof window[name] !== "function") return;
    const vor = window[name];
    window[name] = function () {
      const r = vor.apply(this, arguments);
      if (r && typeof r.then === "function") r.then(() => sicher(f));
      else sicher(f);
      return r;
    };
  });
  /* Auswertung hat je nach Stand einen anderen Funktionsnamen - zur Sicherheit auch beobachten */
  const ausw = document.getElementById("ausw");
  if (ausw) new MutationObserver(() => sicher(fazitSchreiben)).observe(ausw, { childList: true });
  const jahrBox = document.getElementById("jahr");
  if (jahrBox) new MutationObserver(() => sicher(jahrSchmuecken)).observe(jahrBox, { childList: true });
  const zielBox = document.getElementById("ziele");
  if (zielBox) new MutationObserver(() => sicher(zieleSchmuecken)).observe(zielBox, { childList: true });

  /* ---------- Zählzeilen: +1 ---------- */
  document.addEventListener(
    "click",
    (ev) => {
      if (!an()) return;
      const b = ev.target.closest && ev.target.closest("[data-jplus], [data-jminus]");
      if (!b) return;
      sicher(() => {
        const plus = !!b.dataset.jplus;
        const st = b.closest(".stepper");
        const r = (st || b).getBoundingClientRect();
        if (voll()) {
          const f = document.createElement("span");
          f.className = "mplus mplusfrei" + (plus ? "" : " minus");
          f.textContent = plus ? "+1" : "−1";
          f.setAttribute("aria-hidden", "true");
          f.style.left = r.left + r.width / 2 + "px";
          f.style.top = r.top + "px";
          document.body.appendChild(f);
          rm(f, 760);
        }
        if (plus && b.dataset.jplus === "jbQual") {
          if (window.mKonfetti && voll()) window.mKonfetti(r.left + r.width / 2, r.top + r.height / 2);
          if (window.mRueckmeldung) setTimeout(() => window.mRueckmeldung("Jobticket wird Anmeldung"), 80);
        }
      });
    },
    true,
  );

  /* ---------- Hilfe: Auf- und Zuklappen ---------- */
  document.addEventListener(
    "click",
    (ev) => {
      const sum = ev.target.closest && ev.target.closest("details.faq > summary, details.legend > summary");
      if (!sum || !an() || !sum.parentElement.animate) return;
      const d = sum.parentElement;
      ev.preventDefault();
      if (d._manim) d._manim.cancel();
      const start = d.offsetHeight;
      if (d.open) {
        const ende = sum.offsetHeight + (parseFloat(getComputedStyle(d).paddingTop) || 0) * 2;
        d.classList.add("mzu");
        const a = d.animate([{ height: start + "px" }, { height: ende + "px" }], {
          duration: 300,
          easing: "cubic-bezier(.4,0,.2,1)",
        });
        d._manim = a;
        a.onfinish = () => {
          d.open = false;
          d.classList.remove("mzu");
          d._manim = null;
        };
        a.oncancel = () => d.classList.remove("mzu");
      } else {
        d.open = true;
        const ende = d.offsetHeight;
        const a = d.animate([{ height: start + "px" }, { height: ende + "px" }], {
          duration: 420,
          easing: "cubic-bezier(.34,1.2,.64,1)",
        });
        d._manim = a;
        a.onfinish = () => {
          d._manim = null;
        };
      }
    },
    true,
  );

  /* ---------- Themenwechsel ---------- */
  let letzterTipp = { x: innerWidth - 40, y: 40 };
  document.addEventListener(
    "pointerdown",
    (ev) => {
      letzterTipp = { x: ev.clientX, y: ev.clientY };
    },
    true,
  );
  if (typeof window.themaSetzen === "function") {
    const vor = window.themaSetzen;
    window.themaSetzen = function (t, sichern) {
      const hellVorher = document.body.classList.contains("hell");
      const wechsel = sichern && (t === "Hell") !== hellVorher;
      if (!wechsel || !voll() || typeof document.startViewTransition !== "function")
        return vor.apply(this, arguments);
      const args = arguments,
        self = this;
      const r = Math.hypot(
        Math.max(letzterTipp.x, innerWidth - letzterTipp.x),
        Math.max(letzterTipp.y, innerHeight - letzterTipp.y),
      );
      document.documentElement.style.setProperty("--mkx", letzterTipp.x + "px");
      document.documentElement.style.setProperty("--mky", letzterTipp.y + "px");
      document.documentElement.style.setProperty("--mkr", Math.ceil(r) + "px");
      document.documentElement.classList.add("mthemawechsel");
      let ergebnis;
      try {
        const vt = document.startViewTransition(() => {
          ergebnis = vor.apply(self, args);
        });
        vt.finished.finally(() => document.documentElement.classList.remove("mthemawechsel"));
      } catch (e) {
        document.documentElement.classList.remove("mthemawechsel");
        ergebnis = vor.apply(self, args);
      }
      return ergebnis;
    };
  }

  /* ---------- Kundenhistorie und Warnhinweise ---------- */
  function fensterSchmuecken() {
    const sheet = document.getElementById("sheet");
    if (!sheet) return;
    sheet.querySelectorAll(".grp").forEach((g) => {
      const z = g.querySelectorAll(":scope > .hzeile");
      if (z.length < 2) return;
      g.classList.add("mzeitstrahl");
      z.forEach((x, i) => x.style.setProperty("--mi", Math.min(i, 12)));
    });
    const titel = sheet.querySelector("h2, h3, .sheettitel, .titel");
    sheet.classList.toggle("mgefahr", !!(titel && /wirklich löschen/i.test(titel.textContent || "")));
  }
  if (typeof window.paint === "function") {
    const vor = window.paint;
    window.paint = function () {
      const r = vor.apply(this, arguments);
      sicher(fensterSchmuecken);
      return r;
    };
  }
  const modal = document.getElementById("modal");
  if (modal)
    new MutationObserver(() => sicher(fensterSchmuecken)).observe(modal, { childList: true, subtree: true });

  /* ---------- Neu geöffnete Seite markieren ---------- */
  function frisch() {
    const s = seiteAktiv();
    if (!s) return;
    neuStarten(s, "mfrisch");
    clearTimeout(s._mfrisch);
    s._mfrisch = setTimeout(() => s.classList.remove("mfrisch"), 1800);
    sicher(jahrSchmuecken);
    sicher(zieleSchmuecken);
    sicher(fazitSchreiben);
    sicher(empfMarken);
  }
  if (typeof window.show === "function") {
    const vor = window.show;
    window.show = function () {
      const vorher = document.body.dataset.page;
      const r = vor.apply(this, arguments);
      if (vorher !== document.body.dataset.page) sicher(frisch);
      return r;
    };
  }
  if (document.readyState === "complete") setTimeout(() => sicher(frisch), 200);
  else addEventListener("load", () => setTimeout(() => sicher(frisch), 200));
})();
