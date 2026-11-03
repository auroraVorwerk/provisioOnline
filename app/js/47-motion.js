/**
 * Motion
 *
 * Ergänzt 44-animationen.js: Anmeldeanimation, Fenster als Blatt (Handy) bzw.
 * schwebend (iPad), Farbstreifen beim Seitenwechsel, Zählwerk der Inventur,
 * Konfetti bei neuer Bonusstufe. Stufe über html[data-anim].
 */
(function () {
  "use strict";
  const stufe = () => document.documentElement.dataset.anim || "voll";
  const voll = () => stufe() === "voll";
  const an = () => stufe() !== "aus";
  const ipad = () => false; // nur Handy-Hochformat; iPad-Variante ausgebaut
  const bild = (f) => requestAnimationFrame(() => requestAnimationFrame(f));
  const FARBEN = ["#2BBE6E", "#3B9EFF", "#F5A524", "#E5484D", "#A06BFF", "#14B8A6", "#F472B6"];
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      return undefined;
    }
  };

  /* ---------- Anmeldung ---------- */
  const login = document.getElementById("login");
  const box = document.getElementById("loginBox");
  let ersterAuftritt = true,
    letzterSchritt = null;

  function buehneBauen() {
    if (!login || login.querySelector(".lgaurora")) return;
    const a = document.createElement("div");
    a.className = "lgaurora";
    a.setAttribute("aria-hidden", "true");
    a.innerHTML = "<i></i><i></i><i></i><i></i><i></i><i></i><i></i>";
    const s = document.createElement("div");
    s.className = "lgschleier";
    s.setAttribute("aria-hidden", "true");
    login.prepend(s);
    login.prepend(a);
  }
  function dueseHtml() {
    /* Schwebebahn-Marke (passend zum App-Icon), in currentColor. */
    return `<div class="lgduese" aria-hidden="true"><svg viewBox="0 0 64 64" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <line x1="10" y1="19" x2="54" y2="19"/>
      <line x1="25" y1="20.5" x2="25" y2="27"/>
      <line x1="39" y1="20.5" x2="39" y2="27"/>
      <rect x="18" y="27" width="28" height="18" rx="7"/>
      <line x1="19.5" y1="37" x2="44.5" y2="37"/>
    </svg></div>`;
  }
  function loginSchmuecken() {
    if (!box) return;
    if (!box.querySelector(".lgduese")) box.insertAdjacentHTML("afterbegin", dueseHtml());
    [...box.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, 10)));
    const schritt = typeof lgStep !== "undefined" ? lgStep : "";
    if (!ersterAuftritt && letzterSchritt !== null && schritt !== letzterSchritt) {
      box.classList.remove("lgwechsel");
      void box.offsetWidth;
      box.classList.add("lgwechsel");
      setTimeout(() => box.classList.remove("lgwechsel"), 600);
    }
    letzterSchritt = schritt;
  }
  function erstenAuftrittStarten() {
    if (!login || login.hidden || !ersterAuftritt) return;
    login.classList.add("lgerst");
    setTimeout(() => {
      login.classList.remove("lgerst");
      ersterAuftritt = false;
    }, 2400);
  }
  sicher(buehneBauen);
  if (typeof window.renderLogin === "function") {
    const renderLoginVor = window.renderLogin;
    window.renderLogin = function () {
      const r = renderLoginVor.apply(this, arguments);
      sicher(() => {
        login && login.classList.remove("lgsaug");
        loginSchmuecken();
      });
      return r;
    };
  }
  sicher(loginSchmuecken);
  /* Das Anmeldefenster wird über "hidden" gezeigt - darauf achten */
  if (login) {
    new MutationObserver(() => {
      if (!login.hidden) sicher(erstenAuftrittStarten);
    }).observe(login, { attributes: true, attributeFilter: ["hidden"] });
    if (!login.hidden) sicher(erstenAuftrittStarten);
  }

  function gruessen(u) {
    if (!voll()) return;
    const g = document.createElement("div");
    g.className = "mgruss";
    g.setAttribute("aria-hidden", "true");
    const name = u && u.vorname ? String(u.vorname).replace(/[<>"']/g, "") : "";
    g.innerHTML = `<b>${name ? "Hallo " + name : "Willkommen zurück"}</b><span>Schön, dass du da bist.</span>`;
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 1600);
  }
  if (typeof window.starteSitzung === "function") {
    const starteVor = window.starteSitzung;
    window.starteSitzung = async function (u) {
      const sichtbar = login && !login.hidden;
      if (sichtbar && an()) {
        login.classList.add("lgsaug");
        await new Promise((res) => setTimeout(res, voll() ? 640 : 260));
      }
      try {
        return await starteVor.apply(this, arguments);
      } finally {
        sicher(() => {
          login && login.classList.remove("lgsaug");
        });
        if (sichtbar) sicher(() => gruessen(u));
      }
    };
  }

  /* ---------- Fenster und Popups ---------- */
  const modal = document.getElementById("modal");
  let letzterPrimaer = null;
  document.addEventListener(
    "click",
    (ev) => {
      const b =
        ev.target.closest && ev.target.closest("#sheet .btn.primary, #sheet .btn.gefahr, #sheet .btn.danger");
      if (b) letzterPrimaer = { zeit: Date.now(), text: (b.textContent || "").trim() };
    },
    true,
  );

  function geistZeigen() {
    const sheet = document.getElementById("sheet");
    if (!sheet || !modal || !modal.classList.contains("open")) return;
    const r = sheet.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const g = sheet.cloneNode(true);
    g.removeAttribute("id");
    g.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    g.className = "sheet mgeist " + (voll() ? (ipad() ? "ipad" : "handy") : "ruhig");
    Object.assign(g.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
      maxHeight: "none",
    });
    g.setAttribute("aria-hidden", "true");
    g.inert = true;
    const hg = document.createElement("div");
    hg.className = "mgeistback";
    hg.setAttribute("aria-hidden", "true");
    document.body.append(hg, g);
    setTimeout(() => {
      g.remove();
      hg.remove();
    }, 340);
  }
  function rueckmeldung(text) {
    const t = document.createElement("div");
    t.className = "mtoast";
    t.setAttribute("role", "status");
    t.innerHTML = `<svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="13"></circle><path d="M7.5 13.5l3.6 3.6 7.4-7.6"></path></svg><span>${text}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }
  function passendeMeldung(knopf) {
    if (!knopf) return "Gespeichert";
    if (/lösch|entfern/i.test(knopf)) return "Erledigt";
    if (/abschließ|fertig/i.test(knopf)) return "Abgeschlossen";
    if (/hinzufüg|anleg|registr/i.test(knopf)) return "Angelegt";
    return "Gespeichert";
  }
  if (typeof window.closeModal === "function") {
    const closeVor = window.closeModal;
    window.closeModal = function () {
      const offen = modal && modal.classList.contains("open");
      /* kein Geisterbild mehr: es blitzte als zweites Fenster kurz auf */
      const r = closeVor.apply(this, arguments);
      if (offen && an() && letzterPrimaer && Date.now() - letzterPrimaer.zeit < 1600) {
        const text = passendeMeldung(letzterPrimaer.text);
        letzterPrimaer = null;
        if (!/abbrech|zurück|schließ/i.test(text)) sicher(() => rueckmeldung(text));
      }
      return r;
    };
  }

  /* ---------- Seitenwechsel ---------- */
  let streif = null;
  function streifenLaufen() {
    if (!voll()) return;
    if (!streif) {
      streif = document.createElement("div");
      streif.className = "mstreif";
      streif.setAttribute("aria-hidden", "true");
      for (let n = 0; n < 7; n++) {
        const i = document.createElement("i");
        i.style.setProperty("--n", n);
        streif.appendChild(i);
      }
      document.body.appendChild(streif);
    }
    streif.classList.remove("laeuft");
    void streif.offsetWidth;
    streif.classList.add("laeuft");
  }
  if (typeof window.show === "function") {
    const showVor = window.show;
    window.show = function () {
      const vorher = document.body.dataset.page;
      const r = showVor.apply(this, arguments);
      if (vorher && vorher !== document.body.dataset.page) sicher(streifenLaufen);
      return r;
    };
  }

  /* ---------- Inventur ---------- */
  document.addEventListener(
    "click",
    (ev) => {
      if (!an()) return;
      const b = ev.target.closest && ev.target.closest(".stepper [data-plus], .stepper [data-minus]");
      if (!b) return;
      sicher(() => {
        const stepper = b.closest(".stepper");
        const anzeige = stepper && stepper.querySelector("[data-menge]");
        const vorher = anzeige ? +anzeige.textContent || 0 : 0;
        const plus = !!b.dataset.plus;
        if (!plus && vorher <= 0) {
          const zeile = b.closest(".invzeile") || stepper;
          zeile.classList.remove("mschuettel");
          void zeile.offsetWidth;
          zeile.classList.add("mschuettel");
          setTimeout(() => zeile.classList.remove("mschuettel"), 450);
          return;
        }
        if (!voll()) return;
        const f = document.createElement("span");
        f.className = "mplus" + (plus ? "" : " minus");
        f.textContent = plus ? "+1" : "−1";
        f.setAttribute("aria-hidden", "true");
        stepper.appendChild(f);
        setTimeout(() => f.remove(), 720);
        bild(() => {
          const a2 = stepper.querySelector("[data-menge]");
          if (a2) {
            a2.classList.remove("mhuepf");
            void a2.offsetWidth;
            a2.classList.add("mhuepf");
            setTimeout(() => a2.classList.remove("mhuepf"), 420);
          }
          const s = document.querySelector(".invsumme b");
          if (s) {
            s.classList.remove("mtick");
            void s.offsetWidth;
            s.classList.add("mtick");
            setTimeout(() => s.classList.remove("mtick"), 460);
          }
        });
      });
    },
    true,
  );

  /* ---------- Neue Bonusstufe ---------- */
  function konfetti(x, y) {
    const k = document.createElement("div");
    k.className = "mkonfetti";
    k.setAttribute("aria-hidden", "true");
    k.style.left = x + "px";
    k.style.top = y + "px";
    let h = "";
    for (let i = 0; i < 26; i++) {
      const w = (i / 26) * Math.PI * 2 + (i % 2 ? 0.12 : 0),
        r = 90 + (i % 4) * 34;
      h += `<i style="background:${FARBEN[i % 7]};--x:${Math.round(Math.cos(w) * r)}px;--y:${Math.round(Math.sin(w) * r - 40)}px;--r:${i * 53}deg;--d:${(i % 5) * 18}ms"></i>`;
    }
    k.innerHTML = h;
    document.body.appendChild(k);
    setTimeout(() => k.remove(), 1500);
  }
  const STUFE_KEY = "pvo:bw-mstufe";
  function bonusPruefen() {
    if (typeof me === "undefined" || !me || (typeof fremdAktiv !== "undefined" && fremdAktiv)) return;
    const kpis = document.querySelectorAll("#prov .kpi");
    let ziel = null;
    kpis.forEach((k) => {
      const l = k.querySelector(".kl");
      if (l && /Festgebietsbonus/i.test(l.textContent)) ziel = k;
    });
    if (!ziel) return;
    const v = ziel.querySelector(".kv");
    const wert = parseInt(((v && (v.dataset.mziel || v.textContent)) || "").replace(/[^\d]/g, ""), 10) || 0;
    let gemerkt = {};
    try {
      gemerkt = JSON.parse(localStorage.getItem(STUFE_KEY) || "{}") || {};
    } catch (e) {}
    const schluessel = me.dk + "|" + (typeof vmKey === "function" ? sicher(vmKey) : "");
    const alt = gemerkt[schluessel];
    gemerkt[schluessel] = wert;
    try {
      localStorage.setItem(STUFE_KEY, JSON.stringify(gemerkt));
    } catch (e) {}
    if (alt === undefined || wert <= alt || !voll()) return;
    ziel.classList.remove("mstufe");
    void ziel.offsetWidth;
    ziel.classList.add("mstufe");
    setTimeout(() => ziel.classList.remove("mstufe"), 1300);
    const r = ziel.getBoundingClientRect();
    if (r.width && r.bottom > 0 && r.top < innerHeight) konfetti(r.left + r.width / 2, r.top + r.height / 2);
  }
  if (typeof window.renderProv === "function") {
    const provVor = window.renderProv;
    window.renderProv = function () {
      const r = provVor.apply(this, arguments);
      bild(() => sicher(bonusPruefen));
      return r;
    };
  }

  window.mRueckmeldung = rueckmeldung;
  window.mKonfetti = konfetti;
})();
