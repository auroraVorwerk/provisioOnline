/**
 * Schnell-Termin (Beta 1.1.3)
 *
 * Im Fenster „Termin anlegen“ (Plus im Planer) lässt sich ein Termin in einem
 * Satz eintragen – getippt oder über das Mikrofon der iPhone-Tastatur gesprochen:
 *   „Dienstag 10 Uhr Kundentermin Familie Becker, Hauptstraße 5, Empfehlung“
 *   „morgen 16 bis 21 Uhr Promotion bei Edeka Ziel 8“
 *   „Freitag 9 Uhr Teammeeting“
 * Erkannt werden Tag, Uhrzeit, Terminart, Quelle, Name, Adresse, Telefon und Ziel.
 * Vor dem Anlegen steht eine Vorschau; alles bleibt lokal in der App.
 */
(function () {
  "use strict";
  const TAG = 864e5;
  const WOCHENTAGE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
  const MONATE = [
    "januar",
    "februar",
    "märz",
    "april",
    "mai",
    "juni",
    "juli",
    "august",
    "september",
    "oktober",
    "november",
    "dezember",
  ];
  const QUELLEN_TEXT = [
    [/empfehlung/i, "Empfehlung"],
    [/festgebiet|fgb/i, "Festgebietsbegehung"],
    [/vertriebsadresse/i, "Vertriebsadresse"],
    [/wiederbesuch/i, "Wiederbesuch"],
    [/promotion|promo/i, "Promotion"],
  ];
  const ZAHLWORT = { ein: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12 };
  const gross = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

  /* ---------- Satz lesen ---------- */
  function lesen(satz) {
    const roh = (satz || "").replace(/\s+/g, " ").trim();
    const t = roh.toLowerCase();
    const r = {};
    const heute = new Date();
    heute.setHours(12, 0, 0, 0);

    /* Tag */
    let tag = null;
    const datum = /\b(\d{1,2})\.\s?(\d{1,2})\.(\d{2,4})?/.exec(t);
    const datumWort = new RegExp(`\\b(\\d{1,2})\\.?\\s(${MONATE.join("|")})(\\s\\d{4})?`).exec(t);
    if (datum) {
      let j = datum[3] ? +datum[3] : heute.getFullYear();
      if (j < 100) j += 2000;
      tag = new Date(j, +datum[2] - 1, +datum[1], 12);
      if (!datum[3] && tag < heute - TAG) tag.setFullYear(j + 1);
    } else if (datumWort) {
      let j = datumWort[3] ? +datumWort[3] : heute.getFullYear();
      tag = new Date(j, MONATE.indexOf(datumWort[2]), +datumWort[1], 12);
      if (!datumWort[3] && tag < heute - TAG) tag.setFullYear(j + 1);
    } else if (/(?:^|\s)übermorgen\b/.test(t)) tag = new Date(+heute + 2 * TAG);
    else if (/(?:^|\s)morgen\b/.test(t)) tag = new Date(+heute + TAG);
    else if (/\bheute\b/.test(t)) tag = new Date(heute);
    else {
      const w = WOCHENTAGE.findIndex((d) => new RegExp(`\\b${d}s?\\b`).test(t));
      if (w >= 0) {
        let plus = (w - heute.getDay() + 7) % 7;
        if (/nächste[nrs]? woche|übernächste/.test(t)) plus += plus === 0 ? 7 : 7;
        tag = new Date(+heute + plus * TAG);
      }
    }
    if (tag) r.tag = dk(tag);

    /* Uhrzeit: „16 bis 21 Uhr“, „16-21 Uhr“, „um 10:30“, „10 Uhr“ */
    const zahl = (x) => (x in ZAHLWORT ? ZAHLWORT[x] : +x);
    const zeit = (h, m) => `${pad(+h)}:${m ? pad(+m) : "00"}`;
    const spanne =
      /\b(?:von\s)?(\d{1,2})(?:[:.](\d{2}))?\s?(?:uhr\s)?(?:bis|-|–)\s?(\d{1,2})(?:[:.](\d{2}))?\s?uhr/.exec(t) ||
      /\bvon\s(\d{1,2})(?:[:.](\d{2}))?\s?(?:uhr\s)?bis\s(\d{1,2})(?:[:.](\d{2}))?\b/.exec(t);
    const einzeln = /\b(?:um\s)?(\d{1,2}|ein|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)(?:[:.](\d{2}))?\s?uhr\b/.exec(t);
    const nurZeit = /\bum\s(\d{1,2})(?:[:.](\d{2}))?\b/.exec(t);
    if (spanne) {
      r.von = zeit(spanne[1], spanne[2]);
      r.bis = zeit(spanne[3], spanne[4]);
    } else if (einzeln) r.von = zeit(zahl(einzeln[1]), einzeln[2]);
    else if (nurZeit) r.von = zeit(nurZeit[1], nurZeit[2]);
    if (r.von && !r.bis) {
      const bis = /\bbis\s(\d{1,2})(?:[:.](\d{2}))?\s?uhr/.exec(t);
      if (bis) r.bis = zeit(bis[1], bis[2]);
    }
    if (r.von) {
      let h = +r.von.slice(0, 2);
      /* „3 Uhr“ meint im Vertrieb fast immer nachmittags */
      if (h >= 1 && h <= 6) {
        h += 12;
        r.von = pad(h) + r.von.slice(2);
        if (r.bis && +r.bis.slice(0, 2) <= 12) r.bis = pad(+r.bis.slice(0, 2) + 12) + r.bis.slice(2);
      }
      r.h = h;
    }

    /* Terminart */
    if (/premium|check.?in/.test(t)) r.art = "premium";
    else if (/\bpromotion\b|\bpromo\b/.test(t)) r.art = "promo";
    else if (/festgebietsbegehung|terminieren|\bfgb\b|klingeln/.test(t)) r.art = "fgb";
    else if (/teammeeting|meeting|training|schulung|\bevent\b/.test(t)) r.art = "meeting";
    else if (/\bbüro\b|\bbuero\b/.test(t)) r.art = "buero";
    else if (/\bprivat\b|urlaub|\barzt\b|frei\b/.test(t)) r.art = "privat";
    else if (/kundentermin|\bkunde\b|vorführung|familie|frau|herr|termin bei/.test(t)) r.art = "kunde";

    if (r.art === "meeting") {
      const m = /(teammeeting|training|schulung|event)/.exec(t);
      r.meetingArt = m ? gross(m[1]) : "Teammeeting";
    }

    /* Wörter, die nie zu einem Namen oder Ort gehören */
    const STOPP = /^(Ziel|Telefon|Tel|Uhr|Empfehlung|Promotion|Termin|Kundentermin|Premium|Familie|Frau|Herr|Herrn|Am|Im|In|Bei|Und|Von|Bis|Um|Heute|Morgen)$/;
    const sauber = (s) => {
      const w = (s || "").split(/\s+/);
      while (w.length > 1 && STOPP.test(w[w.length - 1])) w.pop();
      return STOPP.test(w[0]) ? "" : w.join(" ");
    };
    /* Name: „Familie Becker“, „Frau Maria Schneider“, „bei Hans Krüger“ */
    const nm = /\b(Familie|Frau|Herr|Herrn)\s+([A-ZÄÖÜ][\wäöüß\-]+(?:\s+[A-ZÄÖÜ][\wäöüß\-]+)?)/.exec(roh);
    const bei = /\bbei\s+([A-ZÄÖÜ][\wäöüß\-]+(?:\s+[A-ZÄÖÜ][\wäöüß\-]+)?)/.exec(roh);
    if (nm) {
      r.anrede = nm[1] === "Herrn" ? "Herr" : nm[1];
      const w = sauber(nm[2]).split(/\s+/);
      r.nachname = w.pop();
      r.vorname = w.join(" ");
    } else if (bei && sauber(bei[1]) && (r.art === "kunde" || r.art === "premium" || !r.art)) {
      const w = sauber(bei[1]).split(/\s+/);
      r.nachname = w.pop();
      r.vorname = w.join(" ");
      if (!r.art) r.art = "kunde";
    }
    if (bei && (r.art === "promo" || r.art === "fgb")) r.ort = sauber(bei[1]);
    const im = /(?:^|\s)(?:im|in der|in)\s+([A-ZÄÖÜ][\wäöüß\-]+(?:\s+[A-ZÄÖÜ][\wäöüß\-]+)?)/.exec(roh);

    /* Adresse und Telefon */
    const str =
      /([A-ZÄÖÜ][\wäöüß\-]*(?:straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|ufer|pfad|berg|hof|markt|chaussee)|(?:Am|An der|Im|In der|Auf dem|Zur|Zum)\s[A-ZÄÖÜ][\wäöüß\-]+)\s*(\d+\s?[a-zA-Z]?)\b/.exec(
        roh,
      );
    if (str) r.strasse = `${str[1]} ${str[2].replace(/\s/g, "")}`;
    const plz = /\b(\d{5})\s+([A-ZÄÖÜ][\wäöüß\-]+(?:\s[A-ZÄÖÜ][\wäöüß\-]+)?)/.exec(roh);
    if (plz) {
      r.plz = plz[1];
      r.wohnort = sauber(plz[2]);
    } else if (im && sauber(im[1]) && (r.art === "kunde" || r.art === "premium")) r.wohnort = sauber(im[1]);
    if (!r.ort && im && sauber(im[1]) && (r.art === "promo" || r.art === "fgb")) r.ort = sauber(im[1]);
    const tel = /\b(0\d[\d\s/\-]{5,}\d)\b/.exec(roh);
    if (tel && !(plz && tel[1].includes(plz[1]))) r.telefon = tel[1].trim();

    /* Quelle und Ziel */
    if (r.art === "kunde") {
      const q = QUELLEN_TEXT.find(([re]) => re.test(t));
      r.quelle = q ? q[1] : "Festgebietsbegehung";
    }
    const ziel = /\bziel\s(\d+)|(\d+)\s(?:termine|kontakte)/.exec(t);
    if (ziel) r.ziel = +(ziel[1] || ziel[2]);
    return r;
  }

  const ART_NAME = {
    kunde: "Kundentermin",
    premium: "Premium CheckIn",
    promo: "Promotion",
    fgb: "Festgebietsbegehung",
    meeting: "Meeting",
    privat: "Privat",
    buero: "Büro",
  };
  function fehlt(r) {
    const f = [];
    if (!r.tag) f.push("Tag");
    if (!r.von) f.push("Uhrzeit");
    if (!r.art) f.push("Terminart");
    if (r.h !== undefined && (r.h < 7 || r.h > 22)) f.push("Startzeit zwischen 7 und 22 Uhr");
    if ((r.art === "kunde" || r.art === "premium") && !r.nachname) f.push("Name");
    return f;
  }

  /* ---------- Eintrag bauen ---------- */
  function eintrag(r) {
    const x = (s) => entschaerfeText(s || "");
    const regulaerBis = `${pad(Math.min(24, r.h + 2))}:00`;
    const ganz = `${pad(r.h)}:00`;
    const e = {};
    const zeiten = (immer) => {
      if (r.von !== ganz) e.start = r.von;
      if (immer || (r.bis && r.bis !== regulaerBis)) {
        e.von = ganz;
        e.bis = r.bis || regulaerBis;
      }
    };
    if (r.art === "kunde" || r.art === "premium") {
      e.kind = r.art;
      if (r.anrede) e.anrede = x(r.anrede);
      e.vorname = x(r.vorname);
      e.nachname = x(r.nachname);
      if (r.strasse) e.strasse = x(r.strasse);
      if (r.plz) e.plz = r.plz;
      if (r.wohnort) e.ort = x(r.wohnort);
      if (r.telefon) e.telefon = x(r.telefon);
      if (r.art === "kunde") e.quelle = r.quelle;
      if (r.von !== ganz) e.start = r.von;
    } else if (r.art === "promo" || r.art === "fgb") {
      e.kind = "terminieren";
      e.quelle = r.art === "promo" ? "Promotion" : "Festgebietsbegehung";
      e.ziel = Math.max(1, r.ziel || (r.art === "promo" ? 8 : 4));
      e.gebiet = "Festgebiet";
      if (r.ort) e.ort = x(r.ort);
      zeiten(false);
    } else if (r.art === "meeting") {
      e.kind = "meeting";
      e.art = r.meetingArt;
      zeiten(true);
    } else {
      e.kind = r.art;
      zeiten(true);
    }
    return e;
  }

  function vorschauHTML(r) {
    const f = fehlt(r);
    const d = r.tag ? fromDk(r.tag) : null;
    const name = [r.anrede, r.vorname, r.nachname].filter(Boolean).join(" ");
    const zeilen = [
      ["Wann", d ? `${DAYS_L[(d.getDay() + 6) % 7]}, ${fmt(d)}` + (r.von ? ` · ${r.von}${r.bis ? "–" + r.bis : ""} Uhr` : "") : ""],
      ["Art", r.art ? ART_NAME[r.art] + (r.meetingArt && r.meetingArt !== "Teammeeting" ? ` · ${r.meetingArt}` : "") : ""],
      ["Quelle", r.quelle || ""],
      ["Name", name],
      ["Adresse", [r.strasse, [r.plz, r.wohnort].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
      ["Ort", r.ort || ""],
      ["Telefon", r.telefon || ""],
      ["Ziel", r.ziel ? `${r.ziel}` : ""],
    ].filter(([, w]) => w);
    return `<div class="stvor">${zeilen
      .map(([k, w]) => `<div class="stz"><span>${k}</span><b>${entschaerfeText(w)}</b></div>`)
      .join("")}${f.length ? `<p class="stfehlt">Noch nicht erkannt: ${f.join(", ")}</p>` : ""}</div>`;
  }

  /* ---------- Ins Fenster „Termin anlegen“ einbauen ---------- */
  function einbauen() {
    const tagFeld = document.getElementById("gpfTag");
    if (!tagFeld || sheet.querySelector(".schnell")) return;
    const grp = tagFeld.closest(".grp");
    grp.insertAdjacentHTML(
      "beforebegin",
      `<div class="schnell">
         <div class="grp">
           <div class="field"><label for="stText">Schnell eintragen</label>
             <textarea id="stText" rows="3" autocomplete="off" autocapitalize="sentences"
               placeholder="z. B. Dienstag 10 Uhr Kundentermin Familie Becker, Hauptstraße 5, Empfehlung"></textarea></div>
           <p class="hinweis" style="margin:0">Tipp auf das Mikrofon der Tastatur und sprich den Termin einfach.</p>
           <div id="stVor"></div>
           <div class="actions"><button type="button" class="btn primary" id="stOk" disabled>Termin anlegen</button></div>
         </div>
         <div class="h4">Oder Tag und Uhrzeit selbst wählen</div>
       </div>`,
    );
    const feld = document.getElementById("stText"),
      ok = document.getElementById("stOk"),
      vor = document.getElementById("stVor");
    let r = {};
    feld.addEventListener("input", () => {
      r = lesen(feld.value);
      vor.innerHTML = feld.value.trim() ? vorschauHTML(r) : "";
      ok.disabled = !feld.value.trim() || fehlt(r).length > 0;
    });
    ok.onclick = () => {
      if (fehlt(r).length) return;
      const k = key(r.tag, r.h);
      if (entries[k]) {
        vor.insertAdjacentHTML("beforeend", `<p class="stfehlt">Um diese Zeit steht schon ein Termin.</p>`);
        return;
      }
      entries[k] = eintrag(r);
      saveData();
      closeModal();
      monday = mondayOf(fromDk(r.tag));
      if (typeof tagWahl !== "undefined") tagWahl = (fromDk(r.tag).getDay() + 6) % 7;
      renderAll();
      setTimeout(() => openSlot(r.tag, r.h), 380);
    };
  }
  document.addEventListener("click", (ev) => {
    if (ev.target.closest && ev.target.closest("#gpFab")) setTimeout(einbauen, 0);
  });
  window.schnellLesen = lesen;
})();
