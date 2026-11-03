/**
 * Nachbereitungs-Assistent und Menü
 *
 * Nachbereitung als Schrittfolge (Zeiten, Kunde, Gespräch, Vorführung,
 * Abschluss, Wiedervorlage) mit Prüfung je Schritt; umschaltbar auf die
 * Gesamtansicht. Menü in Gruppen mit Suche.
 */
(function () {
  "use strict";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      console.warn("Schritte/Menü:", e);
    }
  };

  /* ---------- Nachbereitung ---------- */
  const SCHRITTE = [
    { id: "zeit", t: "Zeiten" },
    { id: "kunde", t: "Kunde" },
    { id: "gespraech", t: "Gespräch" },
    { id: "vorfuehrung", t: "Vorführung" },
    { id: "abschluss", t: "Abschluss" },
    { id: "wv", t: "Wiedervorlage" },
  ];
  function aktiv() {
    if (!draft || step !== "view" || settings.nbSchritte === false) return null;
    const e = entries[key(draft.day, draft.hour)];
    if (!e || e.kind !== "kunde" || e.status) return null;
    if ((draft.nb && draft.nb.status) !== "Stattgefunden") return null;
    return e;
  }
  function pruefen(id) {
    const n = draft.nb;
    if (id === "zeit" && !(n.realStart && n.realEnde))
      return ["Bitte Start und Ende des Termins eintragen.", "#realStart"];
    if (id === "kunde") {
      if (!n.kundenstatus) return ["Bitte die Kundenart wählen.", '[data-seg="kundenstatus"]'];
      if (!n.gebiet) return ["Bitte das Gebiet wählen.", '[data-seg="gebiet"]'];
      if (!(n.geraet || "").trim()) return ["Bitte das aktuelle Gerät oder die Marke eintragen.", "#geraet"];
    }
    if (id === "gespraech") {
      if (!n.empf) return ["Hast du nach Empfehlungen gefragt?", '[data-seg="empf"]'];
      if (n.empf === "Ja" && !n.empfErhalten)
        return ["Hast du Empfehlungen bekommen?", '[data-seg="empfErhalten"]'];
      if (n.empfErhalten === "Ja" && typeof empfZahl === "function" && !empfZahl(n))
        return ["Bitte die Empfehlungen mit Namen eintragen.", "#empOeffnen"];
      if (!n.job) return ["Hast du nach einem Jobticket gefragt?", '[data-seg="job"]'];
    }
    if (id === "vorfuehrung" && n.kundenstatus !== "Neukunde" && !n.wartung)
      return ["Wurde der Wartungsservice gemacht?", '[data-seg="wartung"]'];
    return null;
  }
  function vorbereiten() {
    const e = aktiv();
    if (!e) return;
    ["kunde", "zeit", "gespraech", "vorfuehrung"].forEach((id) => {
      draft.nb["_zu_" + id] = false;
    });
  }
  function einteilen() {
    const e = aktiv();
    const koerper = sheet.querySelector(":scope > .sheetkoerper");
    const fuss = sheet.querySelector(":scope > .sheetfuss");
    if (!koerper || !fuss) return;
    sheet.classList.toggle("uwiz", !!e);
    if (!e) {
      /* Zurückschalter, wenn die Schritte ausgeschaltet sind */
      if (
        settings.nbSchritte === false &&
        draft &&
        step === "view" &&
        draft.nb &&
        draft.nb.status === "Stattgefunden" &&
        !sheet.querySelector(".uwizan")
      ) {
        const ent = entries[key(draft.day, draft.hour)];
        if (ent && ent.kind === "kunde" && !ent.status) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "uwizlink uwizan";
          b.textContent = "Schritt für Schritt nachbereiten";
          b.onclick = () => {
            collect();
            settings.nbSchritte = true;
            saveData();
            draft.nbSchritt = 0;
            repaint();
          };
          fuss.appendChild(b);
        }
      }
      return;
    }
    sheet.classList.add("uwiz");
    let phase = "vor",
      gruppe = null,
      nachStatus = false;
    [...koerper.children].forEach((el) => {
      if (el.classList.contains("nbblock")) {
        const k = el.querySelector("[data-nbzu]");
        el.dataset.uschritt = k ? k.dataset.nbzu : "abschluss";
        phase = "nb";
        return;
      }
      if (el.classList.contains("err")) {
        el.dataset.uschritt = "*";
        return;
      }
      if (el.classList.contains("h4")) {
        const t = el.textContent.trim();
        if (phase === "vor" && /^Status/.test(t)) {
          el.dataset.uschritt = "start";
          nachStatus = true;
          return;
        }
        gruppe = /Wiedervorlage/.test(t) ? "wv" : "abschluss";
        el.dataset.uschritt = gruppe;
        phase = "nach";
        return;
      }
      if (phase === "nach") {
        el.dataset.uschritt = gruppe;
        return;
      }
      if (phase === "vor") {
        if (nachStatus) {
          el.dataset.uschritt = "start"; // Status nur am Anfang zeigen
          nachStatus = false;
          return;
        }
        el.dataset.uschritt = el.classList.contains("laufzeile") ? "zeit" : "start";
        return;
      }
      el.dataset.uschritt = "abschluss";
    });
    const da = SCHRITTE.filter((s) => koerper.querySelector(`[data-uschritt="${s.id}"]`));
    if (!da.length) return;
    let i = Math.max(0, Math.min(da.length - 1, +draft.nbSchritt || 0));
    /* Hat das Abschließen etwas vermisst? Dann genau dorthin */
    if (draft.fokus) {
      const ziel = koerper.querySelector(draft.fokus);
      const kind = ziel && [...koerper.children].find((c) => c.contains(ziel));
      const j = kind ? da.findIndex((s) => s.id === kind.dataset.uschritt) : -1;
      if (j >= 0) i = j;
    }
    draft.nbSchritt = i;
    const jetzt = da[i];
    [...koerper.children].forEach((el) => {
      const s = el.dataset.uschritt;
      const zeigen = s === "*" || s === jetzt.id || (s === "start" && i === 0);
      el.classList.toggle("uaus", !zeigen);
      if (zeigen && s !== "*" && draft._uLetzter !== i) el.classList.add("uwizrein");
    });
    const kopf = document.createElement("div");
    kopf.className = "uwizkopf";
    kopf.innerHTML = `<div class="uwizzeile"><span>Schritt ${i + 1} von ${da.length}</span><b>${jetzt.t}</b></div>
      <div class="uwizbalken"><i style="width:${(((i + 1) / da.length) * 100).toFixed(0)}%"></i></div>`;
    koerper.prepend(kopf);
    if (draft._uLetzter !== undefined && draft._uLetzter !== i && !draft.fokus) {
      /* nach repaint() setzt der Dialog die alte Scrollposition – danach nach oben */
      requestAnimationFrame(() => {
        const k = sheet.querySelector(":scope > .sheetkoerper");
        if (k) k.scrollTop = 0;
      });
    }
    draft._uLetzter = i;

    /* Fuß: Zurück und Weiter, Abschließen erst am Ende */
    const save = fuss.querySelector("#saveNb"),
      del = fuss.querySelector("#del"),
      edit = fuss.querySelector("#editBtn");
    const letzter = i === da.length - 1;
    if (save) save.closest(".actions").classList.add("uwizalt");
    if (save) save.hidden = !letzter;
    if (del) del.hidden = true;
    if (edit) edit.closest(".actions").hidden = i !== 0;
    const reihe = document.createElement("div");
    reihe.className = "actions uwizreihe";
    reihe.innerHTML = `${i > 0 ? `<button type="button" class="btn" id="uwZurueck">Zurück</button>` : ""}
      ${letzter ? "" : `<button type="button" class="btn primary" id="uwWeiter">Weiter</button>`}`;
    fuss.prepend(reihe);
    if (letzter && save) {
      reihe.appendChild(save);
      save.hidden = false;
    }

    const z = reihe.querySelector("#uwZurueck");
    if (z)
      z.onclick = () => {
        collect();
        error = "";
        draft.nbSchritt = i - 1;
        repaint();
      };
    const w = reihe.querySelector("#uwWeiter");
    if (w)
      w.onclick = () => {
        collect();
        const fehlt = pruefen(jetzt.id);
        if (fehlt) {
          error = fehlt[0];
          draft.fokus = fehlt[1];
          repaint();
          return;
        }
        error = "";
        draft.nbSchritt = i + 1;
        if (navigator.vibrate) navigator.vibrate(8);
        repaint();
      };
  }
  if (typeof window.paint === "function") {
    const vor = window.paint;
    window.paint = function () {
      sicher(vorbereiten);
      const r = vor.apply(this, arguments);
      sicher(einteilen);
      return r;
    };
  }

  /* ---------- Menü ---------- */
  const GRUPPEN = [
    ["Mein Tag", ["heute", "planer", "verkaeufe", "wiedervorlage"]],
    ["Kunden", ["kunden", "potenzial", "empfehlung", "interessenten"]],
    ["Zahlen", ["statistik", "auswertungen", "jahr"]],
    ["Geld und Ziele", ["provision", "wunsch", "ziele", "jobtickets"]],
    ["Unterwegs", ["inventur", "fahrten"]],
  ];
  function menueGruppieren() {
    const haupt = document.getElementById("navHaupt");
    if (!haupt) return;
    const links = [...haupt.querySelectorAll("a.navlink")];
    if (!links.length) return;
    const nach = {};
    links.forEach((a) => (nach[a.dataset.page] = a));
    const frag = document.createDocumentFragment();
    const suche = document.createElement("div");
    suche.className = "umsuche";
    suche.innerHTML = `<input type="search" id="umSuche" placeholder="Seite suchen" aria-label="Seite suchen" autocomplete="off">`;
    frag.appendChild(suche);
    const benutzt = new Set();
    const gruppe = (titel, keys) => {
      const da = keys.map((k) => nach[k]).filter(Boolean);
      if (!da.length) return;
      const h = document.createElement("div");
      h.className = "umgruppe";
      h.textContent = titel;
      frag.appendChild(h);
      da.forEach((a) => {
        frag.appendChild(a);
        benutzt.add(a.dataset.page);
      });
    };
    GRUPPEN.forEach(([t, k]) => gruppe(t, k));
    const rest = links.map((a) => a.dataset.page).filter((k) => !benutzt.has(k));
    gruppe("Mehr", rest);
    haupt.innerHTML = "";
    haupt.appendChild(frag);
    const tl = document.getElementById("navTL");
    if (tl && tl.querySelector("a.navlink") && !tl.querySelector(".umgruppe")) {
      const h = document.createElement("div");
      h.className = "umgruppe";
      h.textContent = "Team und Verwaltung";
      tl.prepend(h);
    }
    const feld = document.getElementById("umSuche");
    feld.oninput = () => {
      const q = feld.value.trim().toLowerCase();
      document.querySelectorAll("#navHaupt, #navTL").forEach((box) => {
        let titel = null,
          sichtbar = 0;
        const fertig = () => {
          if (titel) titel.hidden = !sichtbar;
        };
        [...box.children].forEach((el) => {
          if (el.classList.contains("umgruppe")) {
            fertig();
            titel = el;
            sichtbar = 0;
            return;
          }
          if (!el.classList.contains("navlink")) return;
          const treffer = !q || el.textContent.toLowerCase().includes(q);
          el.hidden = !treffer;
          if (treffer) sichtbar++;
        });
        fertig();
      });
    };
    feld.onkeydown = (ev) => {
      if (ev.key !== "Enter") return;
      const erster = [...document.querySelectorAll("#navHaupt a.navlink, #navTL a.navlink")].find(
        (a) => !a.hidden,
      );
      if (erster) {
        location.hash = erster.getAttribute("href");
        feld.value = "";
        feld.oninput();
      }
    };
  }
  if (typeof window.renderMenu === "function") {
    const vor = window.renderMenu;
    window.renderMenu = function () {
      const r = vor.apply(this, arguments);
      sicher(menueGruppieren);
      return r;
    };
    sicher(() => {
      if (me) renderMenu();
    });
  }
})();

/*
 * ---------- Verkauf ohne Einheiten ----------
 * Wurden nur Zubehör oder Ersatzteile verkauft, ist der Nicht-Kauf-Grund
 * für Neugeräte Pflicht; der Kunde wird in die Potenzialliste übernommen.
 */
(function () {
  "use strict";
  const nurTeile = (n) => n && n.verkauft === "Ja" && !((+n.einheiten || 0) > 0);
  const potFertig = (n) => !!((n.nkgruende || []).length || (n.grund || "").trim());

  if (typeof window.nbForm === "function" && typeof window.nkGrundHTML === "function") {
    const vor = window.nbForm;
    window.nbForm = function () {
      let h = vor.apply(this, arguments);
      const n = (typeof draft !== "undefined" && draft && draft.nb) || {};
      if (nurTeile(n) && !/class="grp nkgrund"/.test(h)) {
        h +=
          `<div class="h4">Potenzial für neue Geräte</div>
          <p class="hinweis" style="margin-top:0">Keine Einheiten verkauft – nur Ersatzteile oder Zubehör.
            Der Kunde kommt mit vollem Potenzial in die Potenzialliste.</p>` +
          nkGrundHTML(n).replace(
            "Warum nicht gekauft? (mehrfach möglich)",
            "Warum noch kein neues Gerät? (mehrfach möglich)",
          );
      }
      return h;
    };
  }

  /* Einheiten geändert: neu zeichnen, damit der Potenzial-Block erscheint oder verschwindet */
  if (typeof window.paint === "function") {
    const vor = window.paint;
    window.paint = function () {
      const r = vor.apply(this, arguments);
      try {
        sheet.querySelectorAll('[data-zplus="einheiten"],[data-zminus="einheiten"]').forEach((b) => {
          b.addEventListener("click", () => {
            const n = draft && draft.nb;
            const hat = !!sheet.querySelector(".nkgrund");
            if (n && n.verkauft === "Ja" && hat !== nurTeile(n)) setTimeout(() => repaint(), 0);
          });
        });
      } catch (e) {}
      return r;
    };
  }

  if (typeof window.saveNb === "function") {
    const vor = window.saveNb;
    window.saveNb = function (e) {
      collect();
      const n = draft.nb;
      if (nurTeile(n) && !potFertig(n)) {
        error = "Nur Ersatzteile verkauft: bitte erfassen, warum noch kein neues Gerät gekauft wurde.";
        draft.fokus = ".nkgrund";
        repaint();
        return;
      }
      const tag = draft.day,
        kopie = Object.assign({}, n);
      const vorher = e.status;
      const r = vor.apply(this, arguments);
      try {
        if (!vorher && e.status && nurTeile(kopie) && typeof addPotenzial === "function") {
          addPotenzial(
            e,
            BESITZ.filter((b) => !(kopie.besitz || []).includes(b)),
            kopie.grund,
            tag,
            kopie.nkgruende,
            kopie.wvMonat || "",
          );
          renderAll();
        }
      } catch (err) {
        console.warn("Potenzial:", err);
      }
      return r;
    };
  }
})();
