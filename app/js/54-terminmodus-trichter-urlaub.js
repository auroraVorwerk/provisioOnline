/**
 * Termin-Modus, Trichter, Urlaub
 *
 * Termin-Modus: Kunde, Uhr, Vorführ-Checkliste, Einwände und Notizen während
 * des Termins; "Termin beenden" befüllt die Nachbereitung.
 * Trichter: Konversion von Ansprache bis Verkauf (Quoten aus quoten()).
 * Urlaub: Zeiträume, die Planer, Wochenziel und Langzeitziel berücksichtigen.
 */
(function () {
  "use strict";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      console.warn("Funktionen:", e);
    }
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[<>&"']/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const ganz = (v) => Math.round(v || 0).toLocaleString("de-DE");
  const jetztHM = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  /* ---------- Urlaub ---------- */
  const GRUENDE = ["Urlaub", "Krank", "Schulung", "Frei"];
  const urlaubListe = () => (Array.isArray(settings.urlaub) ? settings.urlaub : []);
  function urlaubAm(tag) {
    return urlaubListe().find((u) => u.von <= tag && u.bis >= tag) || null;
  }
  function urlaubWerktage(von, bis) {
    let n = 0;
    const d = fromDk(von),
      ende = fromDk(bis);
    for (let i = 0; d <= ende && i < 800; i++) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6 && urlaubAm(dk(d))) n++;
      d.setDate(d.getDate() + 1);
    }
    return n;
  }
  window.urlaubAm = urlaubAm;
  window.urlaubWerktage = urlaubWerktage;

  function urlaubDialog() {
    const liste = urlaubListe()
      .slice()
      .sort((a, b) => a.von.localeCompare(b.von));
    const heute = dk(new Date());
    simpleDialog(
      "Urlaub und Abwesenheit",
      "Freie Tage werden aus deinen Zielen herausgerechnet",
      `${
        liste.length
          ? `<div class="uliste" style="margin-bottom:18px">${liste
              .map(
                (u) => `
         <div class="ureihe"><span><b style="color:var(--text)">${esc(u.grund || "Urlaub")}</b> · ${fmt(fromDk(u.von))}${u.bis !== u.von ? " – " + fmt(fromDk(u.bis)) : ""}${u.bis < heute ? " · vorbei" : ""}</span>
           <button type="button" class="mini" data-uweg="${esc(u.id)}">Entfernen</button></div>`,
              )
              .join("")}</div>`
          : ""
      }
       <div class="grp">
         <div class="row2">${fld("uVon", "Von", heute, "date")}${fld("uBis", "Bis einschließlich", heute, "date")}</div>
         <div class="sect"><span class="lb">Grund</span>${seg("uGrund", GRUENDE, "Urlaub")}</div>
       </div>
       <p class="err" id="uErr" hidden></p>`,
      () => {
        const von = document.getElementById("uVon").value,
          bis = document.getElementById("uBis").value;
        const g = sheet.querySelector('[data-seg="uGrund"][aria-pressed="true"]');
        const grund = (g && (g.dataset.val || g.textContent.trim())) || "Urlaub";
        const err = document.getElementById("uErr");
        if (!von || !bis || bis < von) {
          err.textContent = "Bitte einen gültigen Zeitraum wählen.";
          err.hidden = false;
          return;
        }
        settings.urlaub = urlaubListe().concat([{ id: "u" + Date.now().toString(36), von, bis, grund }]);
        saveData();
        closeModal();
        renderAll();
      },
      "Eintragen",
    );
    sheet.querySelectorAll('[data-seg="uGrund"]').forEach(
      (b) =>
        (b.onclick = () => {
          sheet
            .querySelectorAll('[data-seg="uGrund"]')
            .forEach((x) => x.setAttribute("aria-pressed", x === b));
        }),
    );
    sheet.querySelectorAll("[data-uweg]").forEach(
      (b) =>
        (b.onclick = () => {
          settings.urlaub = urlaubListe().filter((u) => u.id !== b.dataset.uweg);
          saveData();
          closeModal();
          renderAll();
          urlaubDialog();
        }),
    );
  }
  window.urlaubDialog = urlaubDialog;

  /* Planer: Tage schattieren, unten der Eintrag zum Verwalten */
  function urlaubImPlaner() {
    const seite = document.getElementById("page-planer");
    if (!seite) return;
    const g = document.getElementById("grid");
    if (g) {
      g.querySelectorAll(".slot[data-day]").forEach((s) =>
        s.classList.toggle("uurlaub", !!urlaubAm(s.dataset.day)),
      );
      const tage = typeof gpTageWahl === "function" ? gpTageWahl() : null;
      if (tage && typeof weekDays !== "undefined") {
        g.querySelectorAll(".gpkopf .gptag").forEach((el, i) => {
          const d = weekDays[tage[i]];
          const u = d && urlaubAm(dk(d));
          el.classList.toggle("uurlaub", !!u);
          el.title = u ? u.grund || "Urlaub" : "";
        });
      }
    }
    let zeile = document.getElementById("uUrlaubZeile");
    if (!zeile) {
      zeile = document.createElement("button");
      zeile.type = "button";
      zeile.id = "uUrlaubZeile";
      zeile.className = "uzeile uurlaubzeile";
      const ziel = document.getElementById("papierkorb");
      if (ziel) ziel.before(zeile);
      else seite.appendChild(zeile);
      zeile.onclick = urlaubDialog;
    }
    const heute = dk(new Date());
    const kommend = urlaubListe()
      .filter((u) => u.bis >= heute)
      .sort((a, b) => a.von.localeCompare(b.von));
    zeile.innerHTML = `<span class="utext"><b>Urlaub und Abwesenheit</b><span>${
      kommend.length
        ? `als Nächstes: ${esc(kommend[0].grund || "Urlaub")} ab ${fmt(fromDk(kommend[0].von))}`
        : "nichts eingetragen"
    }</span></span><span class="uwann" style="color:var(--muted)">›</span>`;
  }

  /* Wochenziel: freie Werktage der kommenden Woche herausrechnen */
  if (typeof window.vorbereitung === "function") {
    const vor = window.vorbereitung;
    window.vorbereitung = function () {
      const v = vor.apply(this, arguments);
      sicher(() => {
        if (!v || !v.zielTermine || !urlaubListe().length) return;
        const m = mondayOf(new Date());
        m.setDate(m.getDate() + 7);
        const so = new Date(m);
        so.setDate(so.getDate() + 4);
        const frei = urlaubWerktage(dk(m), dk(so));
        if (frei) {
          v.zielTerminePlan = v.zielTermine;
          v.zielTermine = Math.round((v.zielTermine * (5 - Math.min(5, frei))) / 5);
          v.urlaubFrei = frei;
        }
      });
      return v;
    };
  }

  /* ---------- Termin-Modus ---------- */
  const EINWAENDE = [
    [
      "Das ist mir zu teuer.",
      "Verständnis zeigen, dann den Preis auf die Nutzungsjahre herunterrechnen: Wie oft wird gesaugt, wie lange hält das Gerät? Den Unterschied am Demotuch zeigen – das Ergebnis verkauft, nicht der Preis. Falls angeboten: Ratenzahlung ansprechen.",
    ],
    [
      "Das muss ich mit meinem Partner besprechen.",
      "„Sehr gern – welche Fragen wird Ihr Partner haben?“ Die Punkte gemeinsam aufschreiben. Einen zweiten Termin vorschlagen, bei dem beide dabei sind, oder das Gerät zum Testen dalassen.",
    ],
    [
      "Ich habe schon einen Staubsauger.",
      "Nach dem eigenen Gerät fragen: Was gefällt, was stört? Dann direkt nach dem eigenen Sauger mit dem Demotuch nachsaugen – was noch herauskommt, spricht für sich.",
    ],
    [
      "Ich möchte erst noch vergleichen.",
      "„Was ist Ihnen beim Vergleich am wichtigsten?“ Die genannten Punkte jetzt gemeinsam durchgehen. Bleibt es dabei: Wiedervorlage mit festem Tag setzen.",
    ],
    [
      "Ich brauche das gerade nicht.",
      "Nach dem Zeitpunkt fragen, der passen würde, und eine Wiedervorlage anlegen. Trotzdem nach Empfehlungen fragen – vielleicht braucht es jemand im Umfeld jetzt.",
    ],
  ];
  let tmUhr = 0;
  function terminModus(tag, h) {
    const e = entries[key(tag, h)];
    if (!e) return;
    e.nb = e.nb || {};
    if (!e.nb.realStart) {
      e.nb.realStart = jetztHM();
      saveData();
    }
    let ov = document.getElementById("uTermin");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "uTermin";
      ov.className = "utmodus";
      document.body.appendChild(ov);
    }
    const n = e.nb,
      gew = n.vorgefuehrt || [];
    const name = [e.vorname, e.nachname].filter(Boolean).join(" ") || label(e).t1 || "Kundentermin";
    const adr = adresseVon(e);
    const maps = adr ? `https://maps.apple.com/?daddr=${encodeURIComponent(adr)}` : "";
    ov.innerHTML = `
      <div class="utmkopf">
        <button type="button" class="utmzu" aria-label="Termin-Modus schließen">✕</button>
        <span class="uue" style="margin:0">Termin-Modus</span>
        <span class="utmuhr" data-keinzaehlen>0:00</span>
      </div>
      <div class="utminhalt">
        <h2 class="utmname">${esc(name)}</h2>
        <p class="utmsub">${[adr, e.telefon].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</p>
        <div class="utmaktion">
          ${e.telefon ? `<a class="ubtn" href="${telLink(e.telefon)}">Anrufen</a>` : ""}
          ${maps ? `<a class="ubtn" href="${maps}" target="_blank" rel="noopener">Karte</a>` : ""}
        </div>
        ${e.geraet || (e.nb && e.nb.geraet) ? `<p class="utmhinweis">Hat aktuell: ${esc(e.geraet || e.nb.geraet)}</p>` : ""}

        <h3 class="uh" style="margin-top:28px">Vorführen</h3>
        <div class="uliste">${DEMO.map(
          (d) => `
          <button type="button" class="utmcheck${gew.includes(d) ? " an" : ""}" data-demo="${esc(d)}">
            <i aria-hidden="true"></i><span>${esc(d)}</span></button>`,
        ).join("")}</div>
        <div class="ureihe"><span>Demotücher gezogen</span>
          <span class="utmzahl"><button type="button" class="urund" data-dt="-1" aria-label="Weniger">−</button>
          <b data-keinzaehlen>${+n.demotuecher || 0}</b>
          <button type="button" class="urund" data-dt="1" aria-label="Mehr">+</button></span></div>

        <h3 class="uh" style="margin-top:28px">Einwände</h3>
        <div class="uliste">${EINWAENDE.map(
          ([f, a], i) => `
          <details class="utmeinwand"${i === 0 ? "" : ""}><summary>${esc(f)}</summary><p>${esc(a)}</p></details>`,
        ).join("")}</div>

        <h3 class="uh" style="margin-top:28px">Notizen</h3>
        <label for="utmNotiz" class="uue">Landet in der Nachbereitung</label>
        <textarea id="utmNotiz" rows="4" placeholder="Was ist dem Kunden wichtig?">${esc(n.terminNotiz || "")}</textarea>
      </div>
      <div class="utmfuss"><button type="button" class="ubtn primaer" id="utmEnde">Termin beenden und nachbereiten</button></div>`;
    document.body.classList.add("utm-an");
    requestAnimationFrame(() => ov.classList.add("da"));

    const startDez = toDec(n.realStart);
    const uhr = ov.querySelector(".utmuhr");
    const ticken = () => {
      const d = new Date(),
        j = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
      const min = Math.max(0, Math.round((j - startDez) * 60));
      uhr.textContent = `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h`;
    };
    ticken();
    clearInterval(tmUhr);
    tmUhr = setInterval(ticken, 15000);

    const zu = () => {
      clearInterval(tmUhr);
      ov.classList.remove("da");
      document.body.classList.remove("utm-an");
      setTimeout(() => ov.remove(), 350);
    };
    ov.querySelector(".utmzu").onclick = () => {
      notizMerken();
      saveData();
      zu();
    };
    ov.querySelectorAll("[data-demo]").forEach(
      (b) =>
        (b.onclick = () => {
          const d = b.dataset.demo,
            l = (e.nb.vorgefuehrt = (e.nb.vorgefuehrt || []).slice());
          const i = l.indexOf(d);
          if (i >= 0) l.splice(i, 1);
          else l.push(d);
          b.classList.toggle("an", i < 0);
          if (navigator.vibrate) navigator.vibrate(8);
          saveData();
        }),
    );
    ov.querySelectorAll("[data-dt]").forEach(
      (b) =>
        (b.onclick = () => {
          e.nb.demotuecher = Math.max(0, (+e.nb.demotuecher || 0) + +b.dataset.dt);
          ov.querySelector(".utmzahl b").textContent = e.nb.demotuecher;
          saveData();
        }),
    );
    const notizMerken = () => {
      const t = ov.querySelector("#utmNotiz");
      if (t) e.nb.terminNotiz = t.value.trim();
    };
    ov.querySelector("#utmEnde").onclick = () => {
      notizMerken();
      e.nb.realEnde = jetztHM();
      saveData();
      zu();
      hOeffne(tag, h);
      setTimeout(
        () =>
          sicher(() => {
            if (draft && draft.day === tag && draft.hour === h) {
              draft.nb = Object.assign({}, draft.nb, {
                realStart: e.nb.realStart,
                realEnde: e.nb.realEnde,
                vorgefuehrt: e.nb.vorgefuehrt || [],
                demotuecher: e.nb.demotuecher,
                status: "Stattgefunden",
              });
              draft.nbSchritt = 0;
              paint();
            }
          }),
        60,
      );
    };
  }
  window.terminModus = terminModus;

  /* Termin-Modus wird bei Kundenterminen nicht mehr angeboten (Beta 1.1.3) */

  /* ---------- Trichter ---------- */
  PAGES.trichter = "Trichter";
  if (typeof IC !== "undefined") IC.trichter = '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>';
  /* Trichter steht nicht mehr im Menü (Beta 1.1) */
  (function () {
    if (document.getElementById("page-trichter")) return;
    const main = document.querySelector("main") || document.body;
    const s = document.createElement("section");
    s.className = "page";
    s.id = "page-trichter";
    s.innerHTML = `<div id="trichter"></div>`;
    const nach = document.getElementById("page-auswertungen");
    if (nach && nach.parentNode) nach.after(s);
    else main.appendChild(s);
  })();

  function renderTrichter() {
    const box = document.getElementById("trichter");
    if (!box || typeof quoten !== "function") return;
    const w = +(settings.trichterW || 13);
    const q = quoten(w);
    const stufen = [
      {
        t: "Ansprachen und Türen",
        v: (q.fgb.tueren || 0) + (q.promo.ansprachen || 0),
        s: `${ganz(q.fgb.tueren)} Türen · ${ganz(q.promo.ansprachen)} Ansprachen`,
      },
      {
        t: "Gespräche",
        v: (q.fgb.erreicht || 0) + (q.promo.gespraeche || 0),
        s: "an der Tür erreicht oder auf der Promotion gesprochen",
      },
      {
        t: "Termine vereinbart",
        v: (q.fgb.termine || 0) + (q.promo.termine || 0),
        s: "aus Festgebiet und Promotion",
      },
      {
        t: "Kundentermine",
        v: q.termine.gesamt || 0,
        s: "alle, auch aus Empfehlungen · inkl. verschoben und abgesagt",
        bruch: true,
      },
      {
        t: "Gehalten",
        v: q.termine.stattgefunden || 0,
        s: `${q.termine.verschoben} verschoben · ${q.termine.abgesagt} abgesagt`,
      },
      { t: "Vorgeführt", v: q.termine.vorgefuehrt || 0, s: "mindestens ein Gerät gezeigt" },
      {
        t: "Verkauft",
        v: q.termine.verkauft || 0,
        s: `${ganz(q.termine.einheiten)} Einheiten · ${ganz(q.termine.umsatz)} € brutto`,
      },
    ];
    const max = Math.max(1, ...stufen.map((s) => s.v));
    let schwach = null;
    stufen.forEach((s, i) => {
      if (i === 0 || s.bruch) return;
      const a = stufen[i - 1].v;
      if (a > 0 && s.v <= a) {
        s.quote = s.v / a;
        if (a >= 5 && (!schwach || s.quote < schwach.quote))
          schwach = { quote: s.quote, von: stufen[i - 1].t, nach: s.t };
      }
    });
    const gesamt = stufen[4].v ? stufen[6].v / stufen[4].v : 0;
    box.innerHTML = `
      <div class="seg utseg" data-seg="trichterW">${[4, 13, 52].map((x) => `<button type="button" data-val="${x}" aria-pressed="${x === w}">${x} Wochen</button>`).join("")}</div>
      <div class="utkopf">
        <div><b data-keinzaehlen>${gesamt ? Math.round(gesamt * 100) + " %" : "–"}</b><span>Abschlussquote gehaltener Termine</span></div>
        <div><b>${ganz(stufen[6].v)}</b><span>Verkäufe</span></div>
      </div>
      <div class="utrichter">${stufen
        .map((s, i) => {
          const breite = 34 + 66 * Math.sqrt(s.v / max);
          return `${i > 0 ? `<div class="utpfeil">${s.bruch ? "plus Empfehlungen und Bestandskunden" : s.quote !== undefined ? `<b data-keinzaehlen>${Math.round(s.quote * 100)} %</b> weiter` : ""}</div>` : ""}
          <div class="utstufe" style="--b:${breite.toFixed(1)}%;--i:${i}">
            <div class="utbalken"></div>
            <div class="uttext"><b>${ganz(s.v)}</b><span>${s.t}</span></div>
          </div>
          <p class="utsub">${s.s}</p>`;
        })
        .join("")}</div>
      ${
        schwach
          ? `<div class="usek uteinsicht"><div class="uue warm">Hier geht am meisten verloren</div>
        <p>Von <b>${schwach.von}</b> zu <b>${schwach.nach}</b> kommen nur ${Math.round(schwach.quote * 100)} % weiter.</p></div>`
          : ""
      }
      <p class="hinweis">Gezählt werden nachbereitete Einträge der letzten ${w} Wochen – dieselben Zahlen wie in den Auswertungen.</p>`;
    box.querySelectorAll('[data-seg="trichterW"] button').forEach(
      (b) =>
        (b.onclick = () => {
          settings.trichterW = +b.dataset.val;
          saveData();
          renderTrichter();
        }),
    );
  }
  window.renderTrichter = renderTrichter;

  /* ---------- Einhängen ---------- */
  function haken(name, f) {
    if (typeof window[name] !== "function") return;
    const vor = window[name];
    window[name] = function () {
      const r = vor.apply(this, arguments);
      if (r && typeof r.then === "function") r.then(() => sicher(f));
      else sicher(f);
      return r;
    };
  }
  haken("render", urlaubImPlaner);
  haken("renderAll", () => {
    urlaubImPlaner();
    if (document.body.dataset.page === "trichter") renderTrichter();
  });
  haken("show", () => {
    if (document.body.dataset.page === "trichter") renderTrichter();
  });
  sicher(() => {
    if (typeof renderMenu === "function" && me) renderMenu();
  });
})();
