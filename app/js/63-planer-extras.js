/**
 * Planer-Extras (Beta 1.1)
 *
 * 1 · Serien: Meeting, Privat, Individuell und Büro lassen sich täglich,
 *     werktags oder wöchentlich wiederholen. Angelegt werden immer die
 *     nächsten 52 Wochen; mit jeder neuen Woche wächst die Serie nach.
 *     Beim Löschen: nur diesen Termin oder diesen und alle zukünftigen.
 * 2 · Rückgängig: die letzten Änderungen im Kalender zurücknehmen.
 * 3 · Kleinigkeiten: keine X-Markierung mehr im Raster, Nichtkauf-Gründe umbenennen.
 */
(function () {
  "use strict";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      console.warn("Planer-Extras:", e);
    }
  };
  const TAG = 864e5;
  const plusTageK = (k, n) => dk(new Date(fromDk(k).getTime() + n * TAG + 12 * 36e5));

  /* ---------- 1 · Serien ---------- */
  const SERIEN_ARTEN = ["meeting", "privat", "individuell", "buero"];
  const WDH = [
    ["nie", "Nie"],
    ["tag", "Täglich"],
    ["werktag", "Werktags"],
    ["woche", "Wöchentlich"],
  ];
  const serien = () => settings.serien || (settings.serien = {});

  function frei(tag, h, e) {
    if (entries[key(tag, h)]) return false;
    const ende = toDec(e.bis) || h + 2;
    return !coveredHours(h, ende).some((x) => x !== h && entries[key(tag, x)]);
  }
  function passtTag(art, k) {
    if (art === "werktag") {
      const wd = fromDk(k).getDay();
      return wd !== 0 && wd !== 6;
    }
    return true;
  }
  /* Termine einer Serie bis 52 Wochen nach heute anlegen */
  function serieFuellen(id) {
    const s = serien()[id];
    if (!s || s.ende) return 0;
    const grenze = dk(new Date(Date.now() + 364 * TAG));
    const schritt = s.art === "woche" ? 7 : 1;
    let k = plusTageK(s.bis || s.start, schritt),
      neu = 0;
    while (k <= grenze) {
      if (passtTag(s.art, k) && !(s.ohne || []).includes(k) && frei(k, s.h, s.vorlage)) {
        entries[key(k, s.h)] = { ...JSON.parse(JSON.stringify(s.vorlage)), serie: id };
        neu++;
      }
      s.bis = k;
      k = plusTageK(k, schritt);
    }
    return neu;
  }
  function serieAnlegen(tag, h, art) {
    const e = entries[key(tag, h)];
    if (!e || art === "nie") return;
    const id = "S" + Date.now().toString(36);
    const vorlage = JSON.parse(JSON.stringify(e));
    delete vorlage.nb;
    delete vorlage.status;
    delete vorlage.serie;
    delete vorlage.bisTag;
    e.serie = id;
    serien()[id] = { art, h, start: tag, bis: tag, vorlage };
    serieFuellen(id);
    saveData();
    renderAll();
  }
  /* Beim Start und jede Woche: Serien wachsen nach */
  function serienNachziehen() {
    if (!me || !dataReady) return;
    let neu = 0;
    Object.keys(serien()).forEach((id) => (neu += serieFuellen(id) || 0));
    if (neu) {
      saveData();
      renderAll();
    }
  }

  /* Wiederholung im Formular anbieten (nur beim Neuanlegen) */
  let wdhWahl = "nie",
    wdhFuer = "";
  function wdhEinbauen() {
    if (typeof step === "undefined" || !draft) return;
    const formular = ["zeit", "indiv", "buero"].includes(step) && SERIEN_ARTEN.includes(draft.kind);
    if (!formular) return;
    const vorhanden = entries[key(draft.day, draft.hour)];
    if (vorhanden && vorhanden.serie) return;
    const sig = draft.day + "|" + draft.hour + "|" + draft.kind;
    if (wdhFuer !== sig) {
      wdhFuer = sig;
      wdhWahl = "nie";
    }
    const save = sheet.querySelector("#save");
    if (!save || sheet.querySelector(".wdhwahl")) return;
    const reihe = save.closest(".actions");
    const i = WDH.findIndex(([w]) => w === wdhWahl);
    reihe.insertAdjacentHTML(
      "beforebegin",
      `<div class="h4">Wiederholen</div>
       <div class="ioseg wdhwahl klein4" role="group" aria-label="Wiederholen" style="--n:${WDH.length};--i:${i}">
         <span class="iosegdaumen" aria-hidden="true"></span>${WDH.map(
           ([w, t]) => `<button type="button" data-wdh="${w}" aria-pressed="${w === wdhWahl}">${t}</button>`,
         ).join("")}</div>
       <p class="hinweis wdhhin">${wdhWahl === "nie" ? "Einmaliger Termin." : "Wird für die nächsten 52 Wochen eingetragen und wächst jede Woche nach."}</p>`,
    );
    sheet.querySelectorAll("[data-wdh]").forEach(
      (b) =>
        (b.onclick = () => {
          wdhWahl = b.dataset.wdh;
          const seg = b.closest(".ioseg");
          seg.style.setProperty("--i", WDH.findIndex(([w]) => w === wdhWahl));
          seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          const h = sheet.querySelector(".wdhhin");
          if (h)
            h.textContent =
              wdhWahl === "nie"
                ? "Einmaliger Termin."
                : "Wird für die nächsten 52 Wochen eingetragen und wächst jede Woche nach.";
        }),
    );
  }
  /* Nach dem Speichern die Serie anlegen */
  document.addEventListener(
    "click",
    (ev) => {
      const b = ev.target.closest && ev.target.closest("#sheet #save");
      if (!b || !sheet.querySelector(".wdhwahl") || wdhWahl === "nie") return;
      const tag = draft.day,
        h = draft.hour,
        art = wdhWahl;
      setTimeout(() => {
        if (!modal.classList.contains("open") && entries[key(tag, h)]) {
          serieAnlegen(tag, h, art);
          wdhWahl = "nie";
        }
      }, 0);
    },
    true,
  );

  /* Löschen in einer Serie: nur diesen oder alle zukünftigen */
  document.addEventListener(
    "click",
    (ev) => {
      const b = ev.target.closest && ev.target.closest("#sheet #del");
      if (!b || !draft) return;
      const tag = draft.day,
        h = draft.hour;
      const e = entries[key(tag, h)];
      if (!e || !e.serie) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      const id = e.serie;
      simpleDialog(
        "Serientermin löschen",
        "Dieser Termin wiederholt sich",
        `<div class="sheetkoerper"><button class="opt" data-serweg="einer">Nur diesen Termin</button>
         <button class="opt" data-serweg="alle">Diesen und alle zukünftigen</button></div>`,
        () => closeModal(),
        "Abbrechen",
      );
      const okb = document.getElementById("okBtn");
      if (okb) okb.closest(".actions").remove();
      sheet.querySelectorAll("[data-serweg]").forEach(
        (x) =>
          (x.onclick = () => {
            const s = serien()[id];
            if (x.dataset.serweg === "einer") {
              if (s) (s.ohne = s.ohne || []).push(tag);
              inPapierkorb(tag, h);
            } else {
              Object.keys(entries).forEach((k) => {
                const [t] = k.split("|");
                if (entries[k].serie === id && t >= tag) delete entries[k];
              });
              if (s) s.ende = tag;
            }
            saveData();
            closeModal();
            renderAll();
          }),
      );
    },
    true,
  );

  /* ---------- 2 · Rückgängig ---------- */
  const STAPEL_MAX = 25;
  const stapel = [];
  let letzterStand = null,
    stellt = false;
  const stand = () => JSON.stringify(entries);
  function merken() {
    if (stellt || !me || !dataReady) return;
    const jetzt = stand();
    if (letzterStand === null) {
      letzterStand = jetzt;
      return;
    }
    if (jetzt === letzterStand) return;
    stapel.push(letzterStand);
    if (stapel.length > STAPEL_MAX) stapel.shift();
    letzterStand = jetzt;
    knopfZeigen();
  }
  function rueckgaengig() {
    if (!stapel.length) return;
    stellt = true;
    const alt = JSON.parse(stapel.pop());
    Object.keys(entries).forEach((k) => delete entries[k]);
    Object.assign(entries, alt);
    letzterStand = stand();
    saveData();
    renderAll();
    stellt = false;
    knopfZeigen();
  }
  const saveDataOhneMerken = saveData;
  saveData = function () {
    sicher(merken);
    return saveDataOhneMerken.apply(this, arguments);
  };
  const starteOhneMerken = window.starteSitzung;
  if (typeof starteOhneMerken === "function")
    window.starteSitzung = async function () {
      const r = await starteOhneMerken.apply(this, arguments);
      stapel.length = 0;
      letzterStand = stand();
      sicher(alteDatenPflegen);
      sicher(serienNachziehen);
      knopfZeigen();
      return r;
    };

  /* Leiste unten im Planer: Rückgängig */
  function leisteEinbauen() {
    const seite = document.getElementById("page-planer");
    if (!seite || seite.querySelector(".planaktionen")) return;
    const d = document.createElement("div");
    d.className = "planaktionen";
    d.innerHTML = `<button type="button" class="planakt" id="planUndo" disabled>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
        Rückgängig</button>
`;
    const legende = seite.querySelector(".legend");
    (legende || seite.lastElementChild).after(d);
    d.querySelector("#planUndo").onclick = rueckgaengig;
    knopfZeigen();
  }
  function knopfZeigen() {
    const b = document.getElementById("planUndo");
    if (b) {
      b.disabled = !stapel.length;
      b.title = stapel.length ? `${stapel.length} Schritt${stapel.length === 1 ? "" : "e"} zurück möglich` : "";
    }
  }

  /* ---------- 3 · Kleinigkeiten ---------- */
  /* Keine X-Markierung mehr im Raster */
  if (typeof archivMark === "function") archivMark = () => "";
  /* Alte Daten an Beta 1.1 anpassen */
  function alteDatenPflegen() {
    let geaendert = false;
    const umbenennen = (liste) => {
      if (!Array.isArray(liste)) return liste;
      return liste.map((g) => {
        if (NK_UMBENANNT[g]) {
          geaendert = true;
          return NK_UMBENANNT[g];
        }
        return g;
      });
    };
    Object.values(entries).forEach((e) => {
      if (e && e.nb && e.nb.nkgruende) e.nb.nkgruende = umbenennen(e.nb.nkgruende);
    });
    [potenzial, wiedervorlagen].forEach((l) =>
      (l || []).forEach((x) => {
        if (x && x.nkgruende) x.nkgruende = umbenennen(x.nkgruende);
      }),
    );
    /* Abholtermine, deren Verkauf schon im ursprünglichen Termin steht, nicht doppelt zählen */
    Object.keys(entries).forEach((k) => {
      const e = entries[k];
      if (!e || e.kind !== "abholen" || !e.nb || e.vonTag === undefined) return;
      if (e.nb.verkauft !== "Ja" && e.nb.verkauft !== "Übertragen") return;
      const zahlen = ["einheiten", "umsatz", "k70betrag", "umsatzFG", "umsatzWG"].some(
        (f) => e.nb[f] !== undefined && e.nb[f] !== "",
      );
      if (e.nb.verkauft === "Übertragen" && !zahlen) return;
      const u = entries[key(e.vonTag, e.vonStunde)];
      if (u && u.nb && u.nb.verkauft === "Ja") {
        abholNeutralisieren(e.nb);
        geaendert = true;
      }
    });
    if (geaendert) saveData();
  }

  if (typeof window.paint === "function") {
    const paintOhneWdh = window.paint;
    window.paint = function () {
      const r = paintOhneWdh.apply(this, arguments);
      sicher(wdhEinbauen);
      return r;
    };
  }
  if (typeof window.render === "function") {
    const renderOhneLeiste = window.render;
    window.render = function () {
      const r = renderOhneLeiste.apply(this, arguments);
      sicher(leisteEinbauen);
      return r;
    };
  }
  /* „Woche kopieren“ gibt es nicht mehr – dafür Serien */
  const kopier = document.getElementById("kopierBtn");
  if (kopier) kopier.remove();
  setInterval(() => sicher(serienNachziehen), 6 * 36e5);
  window.serienNachziehen = serienNachziehen;
})();
