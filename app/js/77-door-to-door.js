/**
 * Door to Door Selling (Beta 1.8)
 *
 * Eigene Terminart, in den Einstellungen unter „Weitere Funktionen“ einschaltbar.
 * Mischung aus Kundentermin und Festgebietsbegehung: eine Strichliste auf
 * einer Seite (Türen, erreicht, reingelassen, vorgeführt, Verkäufe, Termine
 * Folgewoche) – gezählt wird selbst. Unten vier Knöpfe:
 *  · Kontakt merken  → Interessent (kommt später nochmal dran)
 *  · Kurz raus       → zurück in den Planer, mit Knopf zurück zum Einsatz
 *  · Verkauf erfassen → Kundendaten, dann die ganze Nachbereitung
 *  · Kein Kauf       → Potenzial mit Geräten und Gründen
 */
(function () {
  "use strict";
  const ZAEHL = [
    ["tueren", "Türen"],
    ["erreicht", "Erreicht"],
    ["reingelassen", "Reingelassen"],
    ["vorgefuehrt", "Vorgeführt"],
    ["verkaeufe", "Verkäufe"],
    ["termineFW", "Termine Folgewoche"],
  ];
  const an = () => !!settings.d2d;
  if (typeof COLORS === "object") COLORS.d2d = "#4FC8B0";

  /* Planer-Beschriftung */
  if (typeof label === "function") {
    const labelOhne = label;
    label = function (e) {
      if (e && e.kind === "d2d") {
        const n = e.nb || {};
        return { t1: n.verkaeufe ? `D2D · ${n.verkaeufe} Verkauf${n.verkaeufe === 1 ? "" : "e"}` : "Door to Door", t2: `${e.von}–${e.bis}` };
      }
      return labelOhne.apply(this, arguments);
    };
  }

  /* Einsatz, aus dem gerade ein Verkauf/Kontakt erfasst wird – danach geht es dorthin zurück */
  let zurueckZu = null;
  let kurzRaus = null;

  function neuForm() {
    const von = `${pad(draft.hour)}:00`;
    /* Bis: drei Stunden – oder bis zum nächsten Eintrag, wenn der früher kommt */
    let ende = Math.min(draft.hour + 3, 23);
    for (let h = draft.hour + 1; h < ende; h++) {
      const x = entries[key(draft.day, h)];
      if (x && !["privat", "individuell"].includes(x.kind)) {
        ende = h;
        break;
      }
    }
    const bis = draft.bis || `${pad(ende)}:00`;
    sheet.innerHTML =
      head("Door to Door Selling") +
      `<div class="row2">
         <div class="field"><label for="f_start">Von</label>${startSelect("f_start", draft.hour, draft.start)}</div>
         <div class="field"><label for="f_bis">Bis</label><input type="time" id="f_bis" value="${bis}" step="900"></div>
       </div>
       ${fld("f_ort", "Straße oder Gebiet (freiwillig)", draft.nb.f_ort || "")}
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="kind">Zurück</button><button class="btn primary" id="save">Speichern</button></div>`;
    wireBack();
    document.getElementById("save").onclick = () => {
      const st = document.getElementById("f_start").value || von;
      const b = document.getElementById("f_bis").value;
      if (!b || (toDec(b) || 24) <= toDec(st)) {
        error = `Die Endzeit muss nach ${st} liegen.`;
        draft.bis = b;
        paint();
        return;
      }
      const hit = coveredHours(draft.hour, toDec(b) || 24);
      if (hit.some((h) => h !== draft.hour && entries[key(draft.day, h)] && !["privat", "individuell"].includes(entries[key(draft.day, h)].kind))) {
        error = "In diesem Zeitraum steht schon ein Eintrag.";
        paint();
        return;
      }
      const ort = document.getElementById("f_ort").value.trim();
      entries[key(draft.day, draft.hour)] = { kind: "d2d", von: st, bis: b, ...(ort ? { ort } : {}), nb: {} };
      error = "";
      closeModal();
      renderAll();
    };
  }

  function ansicht(k) {
    const [tag, h] = k.split("|");
    const e = entries[k];
    const n = (e.nb = e.nb || {});
    const d = fromDk(tag);
    sheet.innerHTML = `<header><div><h3>Door to Door</h3><div class="when">${DAYS_L[(d.getDay() + 6) % 7]}, ${fmtShort(d)} · ${e.von}–${e.bis}${e.ort ? " · " + entschaerfeText(e.ort) : ""}</div></div>
        <button class="x" data-close aria-label="Schließen">✕</button></header>
      <div class="d2dliste">${ZAEHL.map(
        ([f, t]) => `<div class="d2dfeld" data-d2dplus="${f}" role="button" tabindex="0">
          <span class="d2dt">${t}</span><b data-keinzaehlen>${+n[f] || 0}</b>
          <button type="button" class="d2dminus" data-d2dminus="${f}" aria-label="${t} weniger">−</button></div>`,
      ).join("")}</div>
      <div class="d2dknoepfe">
        <button type="button" class="btn" data-d2d="merken">Kontakt merken</button>
        <button type="button" class="btn" data-d2d="raus">Kurz raus</button>
        <button type="button" class="btn primary" data-d2d="verkauf">Verkauf erfassen</button>
        <button type="button" class="btn" data-d2d="kein">Kein Kauf</button>
      </div>`;
    sheet.classList.add("d2dsheet");
    const zaehle = (f, dd) => {
      n[f] = Math.max(0, (+n[f] || 0) + dd);
      const b = sheet.querySelector(`[data-d2dplus="${f}"] b`);
      if (b) b.textContent = n[f];
      const feld = sheet.querySelector(`[data-d2dplus="${f}"]`);
      if (feld) {
        feld.classList.remove("tick");
        void feld.offsetWidth;
        feld.classList.add("tick");
      }
      try {
        stups(8);
      } catch (x) {}
      saveData();
    };
    sheet.querySelectorAll("[data-d2dplus]").forEach((el) =>
      el.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-d2dminus]")) return;
        zaehle(el.dataset.d2dplus, 1);
      }),
    );
    sheet.querySelectorAll("[data-d2dminus]").forEach(
      (b) =>
        (b.onclick = (ev) => {
          ev.stopPropagation();
          zaehle(b.dataset.d2dminus, -1);
        }),
    );
    sheet.querySelectorAll("[data-d2d]").forEach((b) => (b.onclick = () => aktion(b.dataset.d2d, k)));
  }

  function aktion(was, k) {
    const [tag] = k.split("|");
    if (was === "raus") {
      kurzRaus = k;
      closeModal();
      renderAll();
      leisteZeigen();
      return;
    }
    zurueckZu = k;
    if (was === "merken") {
      closeModal();
      setTimeout(() => {
        kontaktBearbeiten({ id: "", vorname: "", nachname: "", str: "", hnr: "", plz: "", ort: "", telefon: "", notiz: "Door to Door", datum: tag }, interessenten, false, true);
      }, 280);
      return;
    }
    if (was === "kein") {
      closeModal();
      setTimeout(() => {
        kontaktBearbeiten({ potenzial: [...BESITZ], datum: tag, notiz: "Door to Door" }, potenzial, true, true);
      }, 280);
      return;
    }
    if (was === "verkauf") {
      const ziel = ablageSchluessel(tag);
      const h = +ziel.split("|")[1];
      closeModal();
      setTimeout(() => {
        draft = { day: tag, hour: h, nb: {}, kind: "kunde", quelle: "Door to Door", back: "d2dzurueck", d2dVerkauf: true };
        step = "kunde";
        error = "";
        modal.classList.add("open");
        paint();
      }, 280);
    }
  }

  /* Nach dem Speichern der Kundendaten direkt in die Nachbereitung */
  let wartetAufNb = null;
  if (typeof window.paint === "function") {
    const paintOhne = window.paint;
    window.paint = function () {
      sheet.classList.remove("d2dsheet");
      if (step === "kind" && draft && an()) {
        paintOhne.apply(this, arguments);
        const terminieren = sheet.querySelector('[data-kind="terminieren"]');
        if (terminieren && !sheet.querySelector("[data-kindd2d]")) {
          const b = document.createElement("button");
          b.className = "opt";
          b.dataset.kindd2d = "1";
          b.innerHTML = "Door to Door Selling<small>Strichliste, Verkauf und Potenzial an der Tür</small>";
          b.onclick = () => {
            draft.kind = "d2d";
            step = "d2dneu";
            paint();
          };
          terminieren.after(b);
        }
        return;
      }
      if (step === "d2dneu" && draft) {
        neuForm();
        sheetNormalisieren();
        return;
      }
      if (step === "d2dzurueck") {
        wartetAufNb = null;
        closeModal();
        return;
      }
      const e = draft && entries[key(draft.day, draft.hour)];
      if (step === "view" && e && e.kind === "d2d") {
        ansicht(key(draft.day, draft.hour));
        sheetNormalisieren();
        return;
      }
      if (step === "kunde" && draft && draft.d2dVerkauf) wartetAufNb = key(draft.day, draft.hour);
      return paintOhne.apply(this, arguments);
    };
  }

  /* Wenn ein Fenster aus dem Einsatz heraus geschlossen wurde: weiter mit Nachbereitung bzw. zurück zum Einsatz */
  new MutationObserver(() => {
    if (modal.classList.contains("open")) return;
    sheet.classList.remove("d2dsheet");
    setTimeout(() => {
      if (modal.classList.contains("open")) return;
      if (wartetAufNb && entries[wartetAufNb] && !entries[wartetAufNb].status) {
        const k = wartetAufNb;
        wartetAufNb = null;
        const [t, h] = k.split("|");
        openSlot(t, +h);
        draft.nb.status = "Stattgefunden";
        draft.nbSchritt = 0;
        repaint();
        return;
      }
      wartetAufNb = null;
      if (zurueckZu && entries[zurueckZu]) {
        const [t, h] = zurueckZu.split("|");
        zurueckZu = null;
        openSlot(t, +h);
      } else zurueckZu = null;
    }, 320);
  }).observe(modal, { attributes: true, attributeFilter: ["class"] });

  /* „Kurz raus“: schwebender Knopf zurück zum Einsatz */
  function leisteZeigen() {
    let b = document.getElementById("d2dZurueck");
    if (!kurzRaus || !entries[kurzRaus]) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      b = document.createElement("button");
      b.id = "d2dZurueck";
      b.type = "button";
      b.innerHTML = "↩ Zurück zu Door to Door";
      b.onclick = () => {
        const [t, h] = kurzRaus.split("|");
        kurzRaus = null;
        b.remove();
        location.hash = "#planer";
        openSlot(t, +h);
      };
      document.body.appendChild(b);
    }
  }
  window.d2dKurzRaus = () => kurzRaus;

  /* Einstellungen → Weitere Funktionen */
  function weitereUnterseite() {
    unterseiteOeffnen(
      "Weitere Funktionen",
      "Einstellungen",
      `<div class="esgrp"><label class="esz"><span class="eszt">Door to Door Selling<small>Eigene Terminart mit Strichliste an der Tür</small></span>
        <input type="checkbox" role="switch" class="ioswitch" id="esD2d"${an() ? " checked" : ""}></label></div>`,
      (ebene) => {
        const s = ebene.querySelector("#esD2d");
        s.onchange = () => {
          settings.d2d = s.checked;
          saveData();
          const em = document.querySelector("#esWeitere em");
          if (em) em.textContent = s.checked ? "1 an" : "";
        };
      },
    );
  }
  if (typeof renderProfil === "function") {
    const ohne = renderProfil;
    renderProfil = async function () {
      const r = await ohne.apply(this, arguments);
      const v = document.getElementById("esVersionen");
      if (v && !document.getElementById("esWeitere")) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = v.className;
        b.id = "esWeitere";
        b.innerHTML = `<span class="eszt">Weitere Funktionen</span><em>${an() ? "1 an" : ""}</em>${typeof CHEV === "string" ? CHEV : ""}`;
        b.onclick = weitereUnterseite;
        v.after(b);
      }
      return r;
    };
  }
})();
