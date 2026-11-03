/**
 * Oberfläche
 *
 * Ergänzt 17-oberflaeche.css um strukturelle Elemente: Wochenring auf Heute,
 * Wochenzahlen und Säulen in der Statistik, Medaillen-Karussell bei den Zielen,
 * Überweisung und Bonusleiter in der Provision, Navigationsleiste und
 * mitlaufende Überschrift. Die Rechenlogik bleibt unberührt.
 */
(function () {
  "use strict";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      console.warn("Design:", e);
      return undefined;
    }
  };
  const voll = () => (document.documentElement.dataset.anim || "voll") === "voll";
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[<>&"']/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const zahl = (v) => Math.round(v).toLocaleString("de-DE");
  const euro = (v) => zahl(v) + " €";
  const kurz = (v) => (Math.round(v * 10) / 10).toLocaleString("de-DE", { maximumFractionDigits: 1 });

  /* ---------- Untere Leiste ---------- */
  function leisteBauen() {
    const bar = document.getElementById("tabbar");
    if (!bar || bar.querySelector(".tbar")) return;
    const pille = document.createElement("div");
    pille.className = "tbar";
    const linse = document.createElement("span");
    linse.className = "mlinse";
    linse.setAttribute("aria-hidden", "true");
    pille.appendChild(linse);
    [...bar.querySelectorAll("a.tab")].forEach((a) => pille.appendChild(a));
    bar.insertBefore(pille, bar.firstChild);
  }
  function linseSetzen(sofort) {
    const pille = document.querySelector("#tabbar .tbar");
    if (!pille) return;
    const linse = pille.querySelector(".mlinse");
    const akt = pille.querySelector('[aria-current="page"]');
    if (!akt) {
      linse.style.opacity = 0;
      return;
    }
    const pr = pille.getBoundingClientRect(),
      ar = akt.getBoundingClientRect();
    if (!ar.width) return;
    if (sofort) linse.style.transition = "none";
    linse.style.opacity = 1;
    linse.style.width = ar.width + "px";
    const alt = linse._x,
      neu = ar.left - pr.left - 5;
    linse.style.transform = `translateX(${neu}px)`;
    /* beim Wandern kurz in die Breite ziehen - wie ein Tropfen */
    if (!sofort && voll() && alt !== undefined && Math.abs(alt - neu) > 4 && linse.animate) {
      linse.animate(
        [
          { transform: `translateX(${alt}px) scaleX(1)` },
          { transform: `translateX(${(alt + neu) / 2}px) scaleX(1.25)` },
          { transform: `translateX(${neu}px) scaleX(1)` },
        ],
        { duration: 520, easing: "cubic-bezier(.34,1.2,.64,1)" },
      );
    }
    linse._x = neu;
    if (sofort)
      requestAnimationFrame(() => {
        linse.style.transition = "";
      });
  }

  /* ---------- Tagesauswahl im Planer ---------- */
  function tagLinse() {
    const bar = document.getElementById("tagbar");
    if (!bar || !bar.offsetParent) return;
    let l = bar.querySelector(".mtaglinse");
    if (!l) {
      l = document.createElement("span");
      l.className = "mtaglinse";
      l.setAttribute("aria-hidden", "true");
      bar.prepend(l);
    }
    const akt = bar.querySelector('[data-tag][aria-pressed="true"]');
    if (!akt) {
      l.style.opacity = 0;
      return;
    }
    /* Layout-Maße statt Bildschirm-Maße: laufende Wisch-Animationen verschieben sonst die Markierung */
    l.style.opacity = 1;
    l.style.width = akt.offsetWidth + "px";
    l.style.transform = `translateX(${akt.offsetLeft - 4}px)`;
  }

  /* ---------- Überschrift wandert in die Kopfzeile ---------- */
  let titelTakt = 0;
  function titelScroll() {
    cancelAnimationFrame(titelTakt);
    titelTakt = requestAnimationFrame(() => {
      const t = document.getElementById("pagetitle");
      if (!t) return;
      const p = Math.max(0, Math.min(1, scrollY / 70));
      t.style.transform = p ? `scale(${1 - p * 0.12})` : "";
      t.style.opacity = p ? String(1 - p * 0.9) : "";
    });
  }

  /* ---------- Zurückhaltende Erklärtexte ---------- */
  const ERKLAERT = [
    "Steht am Telefon unter Bedienungshilfen",
    "Die Zahlen gelten für",
    "Diese Ziele stecken den Soll-Wert",
    "Alle Werte rechnen sich aus",
    "Ein Distanzverkauf ist",
    "Reihenfolge über den Schieberegler",
    "Einträge verschwinden nach 30 Tagen",
    "Bewertet wird der Nettoumsatz",
    "Kundentermine und Premium CheckIns werden nie kopiert",
    "Die Summen fließen direkt",
    "Die Datei öffnet sich in Excel",
    "Deine Termine erscheinen automatisch",
    "Im Fahrtenbuch lässt sie sich",
    "Tippe bei jedem Artikel auf",
    "Die Liste erscheint bei jedem Aufruf neu",
    "Das Einstellungsdatum bestimmt",
    "Der Betrag vor 2020 stammt",
    "Artikel ohne Einheiten?",
    "Ohne Ziel ist es einfach eine Bürozeit",
    "Bleibt nach Abzug des Warenkredits",
    "Den abgerechneten Festgebietsumsatz trägst du",
    "Die Prognose rechnet mit",
    "Satz nach Betriebszugehörigkeit",
    "Jeder nachbereitete Kundentermin trägt sich",
  ];
  function leiser(root) {
    const seite = root || document;
    const titel = (document.getElementById("pagetitle") || {}).textContent || "";
    seite.querySelectorAll(".page .asec").forEach((sec) => {
      const h = sec.querySelector(":scope > h3");
      if (h && h.textContent.trim() === titel.trim()) sec.classList.add("mglas-intro");
    });
    seite.querySelectorAll(".hinweis, .statnote, .hkhinweis").forEach((p) => {
      const t = (p.textContent || "").trim();
      if (ERKLAERT.some((a) => t.startsWith(a))) p.classList.add("mglas-weg");
    });
  }

  /* ---------- Heute: Wochenring ---------- */
  function ringSvg(pct, id, r) {
    const C = 2 * Math.PI * r;
    return `<svg viewBox="0 0 ${2 * r + 24} ${2 * r + 24}" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style="stop-color:var(--g1)"></stop><stop offset=".5" style="stop-color:var(--g2)"></stop><stop offset="1" style="stop-color:var(--g3)"></stop></linearGradient></defs>
      <circle class="mspur" cx="${r + 12}" cy="${r + 12}" r="${r}"></circle>
      <circle class="mfuell" cx="${r + 12}" cy="${r + 12}" r="${r}" stroke="url(#${id})"
        style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - pct / 100)).toFixed(1)};--c:${C.toFixed(1)}"></circle>
      <circle class="mglanz" cx="${r + 12}" cy="${r + 12}" r="${r + 6}" style="stroke-dasharray:50 ${(C * 1.2).toFixed(0)};stroke-dashoffset:-${(C * 0.62).toFixed(0)}"></circle>
    </svg>`;
  }
  function heuteBuehne() {
    const box = document.getElementById("heute");
    if (!box || typeof vorbereitung !== "function") return;
    const alt = box.querySelector(".hkompass");
    if (!alt || box.querySelector(".mheld")) return;
    const v = vorbereitung();
    const pct = v.zielTermine ? Math.min(100, Math.round((v.termine / v.zielTermine) * 100)) : 0;
    const linie = (t, ist, ziel, farbe) => {
      const p = ziel ? Math.min(100, Math.round((ist / ziel) * 100)) : 0;
      return `<div class="mlinie"><span class="mlt">${t}</span><span class="mlw"><b>${ist}</b> / ${ziel || "–"}</span>
        <span class="mlb"><i style="width:${p}%;background:${farbe}"></i></span></div>`;
    };
    const held = document.createElement("div");
    held.className = "mheld mheute";
    held.innerHTML = `
      <div class="mbuehne">
        <div class="mschatten"></div>
        <div class="mring">${ringSvg(pct, "mHeuteRing", 80)}</div>
        <div class="mmitte"><b class="mzahl">${pct} %</b><span>nächste Woche</span></div>
      </div>
      <div class="munter"><b>${v.termine} von ${v.zielTermine}</b> Kundenterminen eingeplant</div>
      <div class="mlinien">
        ${linie("Festgebiet diese Woche", v.bloecke, v.zielFGB || 0, typeof COLORS !== "undefined" ? COLORS.terminieren : "#C9DD2C")}
        ${linie("Promotion diese Woche", v.promos, v.zielPromo || 0, typeof COLORS !== "undefined" ? COLORS.promotion : "#F2B33D")}
      </div>`;
    alt.replaceWith(held);
  }

  /* ---------- Statistik: Wochenzahlen und Säulen ---------- */
  const KAT = () => [
    ["kunde", "Kundentermine", (typeof COLORS !== "undefined" && COLORS.kunde) || "#A9D18E"],
    ["fgb", "Festgebiet", (typeof COLORS !== "undefined" && COLORS.terminieren) || "#C9DD2C"],
    ["promo", "Promotion", (typeof COLORS !== "undefined" && COLORS.promotion) || "#F2B33D"],
    ["buero", "Büro", (typeof COLORS !== "undefined" && COLORS.buero) || "#9FB4C8"],
  ];
  function katVon(e) {
    if (["kunde", "premium", "abholen"].includes(e.kind)) return "kunde";
    if (e.kind === "terminieren") return e.quelle === "Promotion" || e.quelle === "Messe" ? "promo" : "fgb";
    if (e.kind === "buero") return "buero";
    return null;
  }
  function dauer(e, h) {
    const n = e.nb || {};
    if (n.realStart && n.realEnde) {
      const d = toDec(n.realEnde) - toDec(n.realStart);
      if (d > 0) return { std: d, echt: true };
    }
    if (e.von && e.bis) {
      const d = (toDec(e.bis) || 24) - toDec(e.von);
      if (d > 0) return { std: d, echt: false };
    }
    return { std: e.kind === "kunde" || e.kind === "premium" ? 1.5 : 2, echt: false };
  }
  function wocheAuswerten(montag) {
    const tage = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(montag);
      d.setDate(d.getDate() + i);
      return dk(d);
    });
    const s = {
      tage: tage.map(() => ({ kunde: 0, fgb: 0, promo: 0, buero: 0, plan: 0 })),
      verk: 0,
      eh: 0,
      um: 0,
      k: {
        kunde: { std: 0, n: 0, abschl: 0 },
        fgb: { std: 0, tueren: 0, termine: 0 },
        promo: { std: 0, ansprachen: 0, termine: 0 },
        buero: { std: 0, termine: 0 },
      },
    };
    tage.forEach((t, i) => {
      HOURS_ASC.forEach((h) => {
        const e = entries[key(t, h)];
        if (!e) return;
        const n = e.nb || {};
        const kat = katVon(e);
        if (kat) {
          const d = dauer(e, h);
          s.tage[i][kat] += d.std;
          if (!d.echt) s.tage[i].plan += d.std;
          s.k[kat].std += d.std;
          if (kat === "kunde") {
            s.k.kunde.n++;
            if (n.verkauft === "Ja") s.k.kunde.abschl++;
          }
          if (kat === "fgb") {
            s.k.fgb.tueren += +n.tueren || 0;
            s.k.fgb.termine += +n.termine || 0;
          }
          if (kat === "promo") {
            s.k.promo.ansprachen += +n.ansprachen || 0;
            s.k.promo.termine += +n.termine || 0;
          }
          if (kat === "buero") {
            s.k.buero.termine += +n.termine || 0;
          }
        }
        if (n.fremd === "Ja") return;
        const um = num(n.umsatz) + num(n.umsatzFG) + num(n.umsatzWG) + num(n.umsatzMesse);
        const eh = +n.einheiten || 0;
        if (n.verkauft === "Ja" || um || eh) {
          if (!["kunde", "premium", "eigenkauf", "abholen", "distanz", "terminieren"].includes(e.kind))
            return;
          if (e.kind === "terminieren" && !um) return;
          s.verk++;
          s.eh += eh;
          s.um += um;
        }
      });
    });
    return s;
  }
  function statBuehne() {
    const seite = document.getElementById("page-statistik");
    if (!seite || typeof monday === "undefined") return;
    let held = document.getElementById("mStatHeld");
    if (!held) {
      held = document.createElement("div");
      held.id = "mStatHeld";
      held.className = "mheld mstat";
      const vor = seite.querySelector(".printhead") || seite.querySelector(".board");
      seite.insertBefore(held, vor);
    }
    const s = wocheAuswerten(monday);
    const vorher = new Date(monday);
    vorher.setDate(vorher.getDate() - 7);
    const sv = wocheAuswerten(vorher);
    const kat = KAT();
    const summen = s.tage.map((t) => t.kunde + t.fgb + t.promo + t.buero);
    const max = Math.max(4, ...summen);
    const diff = s.um - sv.um;
    const delta =
      !sv.um && !s.um
        ? ""
        : `<span class="mdelta ${diff >= 0 ? "plus" : "minus"}">${diff >= 0 ? "▲" : "▼"} ${euro(Math.abs(diff))} zur Vorwoche</span>`;
    const tagNamen = typeof DAYS_S !== "undefined" ? DAYS_S : ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const heute = dk(new Date());
    held.innerHTML = `
      <div class="mzahlen">
        <div><b class="mzahl">${s.verk}</b><span>Verkäufe</span></div>
        <div><b class="mzahl">${s.eh}</b><span>Einheiten</span></div>
        <div class="breit"><b class="mzahl">${euro(s.um)}</b><span>Umsatz brutto</span>${delta}</div>
      </div>
      <div class="mchart">
        <div class="msaeulen u3szene">${s.tage
          .map((t, i) => {
            const ges = summen[i];
            /* 3D-Säule: Front und Seite nach Tätigkeit eingefärbt, Deckel in der obersten Farbe */
            let bis = 0,
              oben = "";
            const stops = kat
              .filter(([k]) => t[k])
              .map(([k, , f]) => {
                const von = bis;
                bis += (t[k] / ges) * 100;
                oben = f;
                return `${f} ${von.toFixed(2)}% ${bis.toFixed(2)}%`;
              })
              .join(",");
            const tag = (() => {
              const d = new Date(monday);
              d.setDate(d.getDate() + i);
              return dk(d);
            })();
            return `<div class="msp u3sp${tag === heute ? " heute" : ""}" style="--mi:${i}">
            ${ges ? `<span class="mwert">${kurz(ges)}</span>` : ""}
            ${ges ? `<div class="u3box${t.plan >= ges ? " plan" : ""}" style="height:${((ges / max) * 100).toFixed(1)}%;--g:linear-gradient(to top,${stops});--oben:${oben}"><i class="u3v"></i><i class="u3s"></i><i class="u3t"></i></div>` : '<div class="u3box mleer"></div>'}</div>`;
          })
          .join("")}</div>
        <div class="machse" data-keinzaehlen>${tagNamen.map((t, i) => `<span>${t}</span>`).join("")}</div>
        <div class="mlegende">${kat.map(([, n, f]) => `<span><i style="background:${f}"></i>${n}</span>`).join("")}<span class="plan"><i></i>geplant</span></div>
      </div>
      <div class="mquellen">
        ${s.k.kunde.n ? `<div class="mq"><i style="background:${kat[0][2]}"></i><div><b>Kundentermine</b><span>${s.k.kunde.n} Termine · ${s.k.kunde.abschl} Abschlüsse</span></div><em>${kurz(s.k.kunde.std)} Std.</em></div>` : ""}
        ${s.k.fgb.std ? `<div class="mq"><i style="background:${kat[1][2]}"></i><div><b>Festgebiet</b><span>${s.k.fgb.tueren} Türen · ${s.k.fgb.termine} Termine</span></div><em>${kurz(s.k.fgb.std)} Std.</em></div>` : ""}
        ${s.k.promo.std ? `<div class="mq"><i style="background:${kat[2][2]}"></i><div><b>Promotion</b><span>${s.k.promo.ansprachen} Ansprachen · ${s.k.promo.termine} Termine</span></div><em>${kurz(s.k.promo.std)} Std.</em></div>` : ""}
        ${s.k.buero.std ? `<div class="mq"><i style="background:${kat[3][2]}"></i><div><b>Büro</b><span>${s.k.buero.termine} Termine</span></div><em>${kurz(s.k.buero.std)} Std.</em></div>` : ""}
      </div>`;
    if (voll()) {
      held.classList.remove("mlauf");
      void held.offsetWidth;
      held.classList.add("mlauf");
    }
  }

  /* ---------- Ziele: Medaille ---------- */
  const METALL = [
    ["#FFF1C2", "#E9C46A", "#B8892B"],
    ["#C9FFE0", "#3FD483", "#0E7C44"],
    ["#FFE7C4", "#E2A86B", "#9C6230"],
    ["#DDEBFF", "#7FB2FF", "#2F6FD6"],
    ["#F3DCFF", "#C79BF2", "#7A45B8"],
  ];
  let zielWahl = null;
  function zielDaten() {
    return [...document.querySelectorAll("#ziele .zziel")].map((z, i) => {
      const sec = z.closest(".zsec");
      const h = sec && sec.querySelector("h3");
      const gruppe = h ? ((h.childNodes[0] && h.childNodes[0].textContent) || h.textContent).trim() : "";
      const titel = ((z.querySelector(".zkopf span") || {}).textContent || "").trim();
      const stand = ((z.querySelector(".zkopf b") || {}).textContent || "").trim();
      const fuss = ((z.querySelector(".zfuss") || {}).textContent || "").trim();
      const i2 = z.querySelector(".zbalken i");
      const m = /--soll:\s*([\d.]+)/.exec((i2 && i2.getAttribute("style")) || "");
      return {
        el: z,
        i,
        gruppe,
        titel,
        stand,
        fuss,
        pct: m ? +m[1] : 0,
        erreicht: z.classList.contains("erreicht"),
      };
    });
  }
  /*
   * Medaillen-Karussell: je Wettbewerb das Ziel, das 100 % am nächsten ist.
   * Die Drehung läuft per Web Animations API; Farbe und Text wechseln einmal
   * je Umdrehung im schnellsten Moment.
   */
  const KR = { idx: -1, ziel: -1, timer: 0, langsam: null, liste: null };
  const HALTEN = 4600,
    WIRBEL = 1300;
  const C = 2 * Math.PI * 84;
  const gesicht = (cls) => `<div class="mgesicht ${cls}">
      <svg class="mprog" viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="84" style="stroke:rgba(0,0,0,.18)"></circle>
        <circle class="mpring" cx="90" cy="90" r="84" style="stroke:rgba(255,255,255,.85);stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${C.toFixed(1)}"></circle></svg>
      <div class="minnen"><svg class="mstern" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"></path></svg>
        <b class="mzahl" data-keinzaehlen>0 %</b></div>
    </div>`;
  function funkenHtml(start) {
    return Array.from({ length: 16 }, (_, k) => {
      const w = (k / 16) * 6.283,
        r = 120 + (k % 3) * 26;
      return `<i style="--x:${Math.round(Math.cos(w) * r)}px;--y:${Math.round(Math.sin(w) * r * 0.7)}px;animation-delay:${start + (k % 4) * 30}ms"></i>`;
    }).join("");
  }
  /*
   * Je Wettbewerb (Überschrift) das Ziel mit dem höchsten Stand; erreichte
   * Ziele nur, wenn im Wettbewerb alles erreicht ist.
   */
  function medaillenListe(alle) {
    const gruppen = new Map();
    alle.forEach((z) => {
      if (!gruppen.has(z.gruppe)) gruppen.set(z.gruppe, []);
      gruppen.get(z.gruppe).push(z);
    });
    return [...gruppen.values()].map((l) => {
      const offen = l.filter((z) => !z.erreicht);
      return (offen.length ? offen : l).slice().sort((a, b) => b.pct - a.pct)[0];
    });
  }
  function medailleSetzen(held, z, nr, mitFunken) {
    if (!z) return;
    const m = METALL[nr % METALL.length];
    held.style.setProperty("--m1", m[0]);
    held.style.setProperty("--m2", m[1]);
    held.style.setProperty("--m3", m[2]);
    const text = zahl(z.pct) + " %";
    held.querySelectorAll(".mzahl").forEach((b) => (b.textContent = text));
    held
      .querySelectorAll(".mpring")
      .forEach((c) => (c.style.strokeDashoffset = (C * (1 - Math.min(100, z.pct) / 100)).toFixed(1)));
    const t = held.querySelector(".mtitel");
    if (t) {
      t.innerHTML = `<b>${esc(z.gruppe)}</b><span>${esc(z.titel)} · ${esc(z.stand)}</span>`;
      if (mitFunken && voll()) {
        t.classList.remove("mneu");
        void t.offsetWidth;
        t.classList.add("mneu");
      }
    }
    if (mitFunken && voll()) {
      const f = held.querySelector(".mfunken");
      if (f) f.innerHTML = funkenHtml(0);
    }
    (KR.alle || []).forEach((x) => x.el.classList.toggle("mgewaehlt", x === z));
    zielWahl = z.gruppe + z.titel;
  }
  function wirbeln() {
    clearTimeout(KR.timer);
    const held = document.querySelector("#ziele .mziel");
    if (!held || !KR.liste || !KR.liste.length) return;
    const weiter = () => {
      KR.timer = setTimeout(wirbeln, HALTEN);
    };
    /* nur wenn die Seite zu sehen ist – sonst später nochmal schauen */
    if (
      document.hidden ||
      document.body.dataset.page !== "ziele" ||
      !voll() ||
      (KR.liste.length < 2 && KR.ziel < 0)
    )
      return weiter();
    const nr = KR.ziel >= 0 ? KR.ziel : (KR.idx + 1) % KR.liste.length;
    const z = KR.ziel >= 0 ? KR.zielObj : KR.liste[nr];
    KR.ziel = -1;
    KR.zielObj = null;
    /*
     * Wirbel = dieselbe Drehung, nur kurz viel schneller. So dreht immer nur
     *  ein Element – Vorder- und Rückseite bleiben sauber.
     */
    const dreh = KR.langsam;
    if (dreh && dreh.playState !== "idle") {
      const t0 = performance.now();
      const takt = (jetzt) => {
        const q = Math.min(1, (jetzt - t0) / WIRBEL);
        const r = 1 + 26 * Math.pow(Math.sin(Math.PI * q), 2);
        if (dreh.updatePlaybackRate) dreh.updatePlaybackRate(r);
        else dreh.playbackRate = r;
        if (q < 1 && held.isConnected) requestAnimationFrame(takt);
      };
      requestAnimationFrame(takt);
    }
    const glut = held.querySelector(".mglut");
    if (glut && glut.animate)
      glut.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.5 }, { opacity: 0 }], {
        duration: WIRBEL,
        easing: "ease-in-out",
      });
    setTimeout(() => {
      if (held.isConnected) {
        KR.idx = KR.liste.indexOf(z) >= 0 ? KR.liste.indexOf(z) : nr;
        medailleSetzen(held, z, KR.liste.indexOf(z) >= 0 ? KR.liste.indexOf(z) : nr, true);
      }
    }, WIRBEL / 2);
    KR.timer = setTimeout(wirbeln, WIRBEL + HALTEN);
  }
  function zielBuehne() {
    const box = document.getElementById("ziele");
    if (!box) return;
    const alle = zielDaten();
    if (!alle.length) return;
    KR.alle = alle;
    const liste = medaillenListe(alle);
    KR.liste = liste;
    let nr = liste.findIndex((z) => zielWahl && z.gruppe + z.titel === zielWahl);
    if (nr < 0) nr = liste.indexOf(liste.slice().sort((a, b) => a.erreicht - b.erreicht || b.pct - a.pct)[0]);
    let held = box.querySelector(".mziel");
    const neu = !held;
    if (neu) {
      held = document.createElement("div");
      held.className = "mheld mziel";
      box.insertBefore(held, box.firstChild);
    }
    held.innerHTML = `
      <div class="mmed-buehne">
        <div class="mboden"></div>
        <div class="mglut" aria-hidden="true"></div>
        <div class="mhalter"><div class="mmed">
          <div class="mkante"></div><div class="mkante2"></div>
          ${gesicht("mvorne")}${gesicht("mrueck")}
        </div></div>
        <div class="mfunken">${neu ? funkenHtml(1450) : ""}</div>
      </div>
      <div class="mtitel"></div>`;
    KR.idx = nr;
    medailleSetzen(held, liste[nr], nr, false);
    /* langsames Drehen: endlos, gleichmäßig, vom Grafikchip */
    const h = held.querySelector(".mhalter");
    if (h && h.animate && voll())
      KR.langsam = h.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }], {
        duration: 12000,
        iterations: Infinity,
        delay: neu ? 2000 : 0,
      });
    alle.forEach((z) => {
      if (!z.el.dataset.mklick) {
        z.el.dataset.mklick = "1";
        z.el.addEventListener("click", () => {
          const l = zielDaten(),
            x = l.find((y) => y.el === z.el);
          const hh = box.querySelector(".mziel");
          if (!x || !hh) return;
          const i = (KR.liste || []).findIndex((y) => y.gruppe === x.gruppe);
          if (voll()) {
            KR.ziel = i >= 0 ? i : 0;
            KR.zielObj = x;
            wirbeln();
          } else medailleSetzen(hh, x, i >= 0 ? i : 0, false);
          hh.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    });
    clearTimeout(KR.timer);
    KR.timer = setTimeout(wirbeln, neu ? HALTEN + 1500 : HALTEN);
  }

  /* ---------- Provision ---------- */
  function provBuehne() {
    const box = document.getElementById("prov");
    if (!box || typeof vertriebsmonat !== "function") return;
    const sec = box.querySelector(".asec");
    const kp = sec && sec.querySelector(".kpis.zwei");
    if (!sec || !kp || sec.querySelector(".mprov")) return;
    const vm = vertriebsmonat(new Date());
    const u = umsatz(vm.fromK, vm.toK);
    const p = provision(u, vm.weeks);
    const f = vm.weeks / 4;
    const stufen = TIERS.map((t) => ({ ab: t.u * f, pct: Math.round(t.b * 100) }));
    const max = stufen[stufen.length - 1].ab;
    const pos = Math.min(100, (p.basis / max) * 100);
    const held = document.createElement("div");
    held.className = "mheld mprov";
    held.innerHTML = `
      <div class="morb"></div>
      <div class="ml">Überweisung</div>
      <div class="mgross mzahl">${euro(p.gesamt)}</div>
      <div class="mformel">
        <div class="mvonL"><b>${euro(p.prov)}</b><span>Provision</span></div>
        <div class="mvonU"><b class="mpluswert">+ ${euro(p.vers)}</b><span>Bonus</span></div>
        <div class="mvonR"><b class="mminuswert">− ${euro(p.warenkredit + (p.minus || 0))}</b><span>${p.minus ? "Warenkredit + Vormonat" : "K70 Warenkredit"}</span></div>
      </div>
      <div class="mleiter">
        <div class="mlkopf"><b>${euro(p.basis)} netto im Festgebiet</b><span>${p.next ? "noch " + euro(p.next.fehlt) + " bis " + p.next.pct + " %" : "höchste Stufe"}</span></div>
        <div class="mspur2"><div class="mfuell2" style="width:${pos.toFixed(1)}%"></div>
          ${stufen.map((s) => `<i class="mstufe${p.basis >= s.ab ? " an" : ""}" style="left:${((s.ab / max) * 100).toFixed(1)}%"></i>`).join("")}</div>
        <div class="mmarken" data-keinzaehlen>${stufen.map((s) => `<span class="${p.basis >= s.ab ? "an" : ""}" style="left:${Math.min((s.ab / max) * 100, 94).toFixed(1)}%">${s.pct} %<small>${zahl(s.ab / 1000)}k</small></span>`).join("")}</div>
      </div>`;
    kp.replaceWith(held);
    const h3 = sec.querySelector(":scope > h3");
    if (h3) h3.classList.add("mglas-weg");
  }

  /* ---------- Einhängen ---------- */
  function nachZeichnen(name, f) {
    if (typeof window[name] !== "function") return;
    const vor = window[name];
    window[name] = function () {
      const r = vor.apply(this, arguments);
      if (r && typeof r.then === "function") r.then(() => sicher(f));
      else sicher(f);
      return r;
    };
  }
  nachZeichnen("renderHeute", heuteBuehne);
  nachZeichnen("renderStat", statBuehne);
  nachZeichnen("renderZiele", zielBuehne);
  nachZeichnen("renderProv", provBuehne);
  nachZeichnen("tagesleiste", () => requestAnimationFrame(tagLinse));
  /* Tag gewechselt (Handy): das Raster gleitet in die Richtung des Tages */
  let letzterTag = null;
  nachZeichnen("setzeTagWahl", () => {
    requestAnimationFrame(tagLinse);
    const jetzt = typeof tagWahl !== "undefined" ? +tagWahl : null;
    if (letzterTag !== null && jetzt !== null && jetzt !== letzterTag && voll()) {
      const g = document.querySelector("#grid");
      if (g) {
        g.classList.remove("mgleitL", "mgleitR");
        void g.offsetWidth;
        g.classList.add(jetzt < letzterTag ? "mgleitL" : "mgleitR");
        setTimeout(() => g.classList.remove("mgleitL", "mgleitR"), 600);
      }
    }
    letzterTag = jetzt;
  });
  /* Glas fängt Licht: ein weicher Glanz folgt dem Finger über der Leiste */
  /* Maße einmal beim Antippen, Bewegung höchstens einmal pro Frame, Glanz nur per transform. */
  let lichtZiel = null,
    lichtR = null,
    lichtXY = null,
    lichtTakt = 0;
  document.addEventListener(
    "pointerdown",
    (ev) => {
      const g = ev.target.closest && ev.target.closest(".tbar, .weekbar, #tagbar");
      lichtZiel = g || null;
      lichtR = g ? g.getBoundingClientRect() : null;
    },
    { passive: true },
  );
  document.addEventListener(
    "pointermove",
    (ev) => {
      const g = ev.target.closest && ev.target.closest(".tbar, .weekbar, #tagbar");
      if (!g) return;
      if (g !== lichtZiel || !lichtR) {
        lichtZiel = g;
        lichtR = g.getBoundingClientRect();
      }
      lichtXY = [ev.clientX - lichtR.left, ev.clientY - lichtR.top];
      if (lichtTakt) return;
      lichtTakt = requestAnimationFrame(() => {
        lichtTakt = 0;
        if (!lichtZiel || !lichtXY) return;
        lichtZiel.style.setProperty("--mx", lichtXY[0] + "px");
        lichtZiel.style.setProperty("--my", lichtXY[1] + "px");
        lichtZiel.classList.add("mlicht");
      });
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerup",
    () => {
      lichtZiel = null;
      lichtR = null;
      document.querySelectorAll(".mlicht").forEach((g) => g.classList.remove("mlicht"));
    },
    { passive: true },
  );
  document.addEventListener(
    "pointercancel",
    () => {
      lichtZiel = null;
      lichtR = null;
      document.querySelectorAll(".mlicht").forEach((g) => g.classList.remove("mlicht"));
    },
    { passive: true },
  );
  nachZeichnen("renderAll", () => {
    leiser();
    requestAnimationFrame(() => {
      linseSetzen();
      tagLinse();
    });
  });
  if (typeof window.show === "function") {
    const vor = window.show;
    window.show = function () {
      const r = vor.apply(this, arguments);
      sicher(() => {
        leiser();
        requestAnimationFrame(() => {
          linseSetzen();
          tagLinse();
        });
        const s = document.querySelector(".page.active");
        if (s && s.id === "page-statistik") statBuehne();
      });
      return r;
    };
  }
  sicher(leisteBauen);
  /* Seiten, die nachladen (Wochenmeldung, Profil): Erklärtexte auch danach leiser stellen */
  let leiserTakt = 0;
  const hauptbereich = document.querySelector("main");
  if (hauptbereich)
    new MutationObserver(() => {
      clearTimeout(leiserTakt);
      leiserTakt = setTimeout(() => sicher(() => leiser()), 120);
    }).observe(hauptbereich, { childList: true, subtree: true });
  addEventListener("scroll", titelScroll, { passive: true });
  addEventListener("resize", () =>
    requestAnimationFrame(() => {
      linseSetzen(true);
      tagLinse();
    }),
  );
  addEventListener("hashchange", () => requestAnimationFrame(() => linseSetzen()));
  const start = () =>
    sicher(() => {
      leisteBauen();
      leiser();
      linseSetzen(true);
      tagLinse();
      heuteBuehne();
    });
  if (document.readyState === "complete") setTimeout(start, 150);
  else addEventListener("load", () => setTimeout(start, 150));
  window.mDesign = { statBuehne, zielBuehne, provBuehne, heuteBuehne, linseSetzen };
})();
