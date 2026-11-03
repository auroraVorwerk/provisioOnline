/**
 * Dialogschritte
 *
 * Schrittfolge beim Anlegen eines Termins: Art, Kontaktweg, Kunde, Zeit.
 */
/* Vorherige Termine mit derselben Person */
function historie(e) {
  if (!e.nachname) return "";
  const id = [e.vorname, e.nachname, e.plz].map((v) => (v || "").trim().toLowerCase()).join("|");
  const treffer = [];
  Object.keys(entries).forEach((k) => {
    const x = entries[k];
    if (!x.nachname || k === key(draft.day, draft.hour)) return;
    if ([x.vorname, x.nachname, x.plz].map((v) => (v || "").trim().toLowerCase()).join("|") !== id) return;
    const [tag, h] = k.split("|");
    treffer.push({ tag, h: +h, x });
  });
  if (!treffer.length) return "";
  treffer.sort((a, b) => b.tag.localeCompare(a.tag));
  return `<div class="hr"></div><div class="h4">Frühere Termine</div>
    <div class="grp">${treffer
      .slice(0, 6)
      .map((t) => {
        const n = t.x.nb || {};
        const info =
          n.verkauft === "Ja"
            ? `Kauf · ${n.einheiten || 0} Einheiten · ${eur(num(n.umsatz))} €`
            : t.x.status
              ? t.x.status
              : "ohne Nachbereitung";
        return `<div class="hzeile"><span>${fmt(fromDk(t.tag))} · ${pad(t.h)} Uhr</span><span class="hinfo">${info}</span></div>`;
      })
      .join(
        "",
      )}${treffer.length > 6 ? `<p class="hinweis">und ${treffer.length - 6} weitere</p>` : ""}</div>`;
}

/* Vorhandenen Eintrag zum Ändern öffnen – vorhandene Nachbereitung bleibt erhalten */
function startEdit(e) {
  error = "";
  draft.kind = e.kind;
  draft.quelle = e.quelle;
  draft.art = e.art;
  draft.gebiet = e.gebiet;
  draft.bis = e.bis;
  draft.bisTag = e.bisTag;
  draft.start = e.start;
  draft.nb = { ...(e.nb || {}) };
  blockZustaende();
  if (e.kind === "kunde" || e.kind === "premium") {
    let str = e.str,
      hnr = e.hnr;
    if (str === undefined) {
      // ältere Einträge aufteilen
      const m = (e.strasse || "").match(
        /^(.*?)[\s,]+(\d+\s*[a-zA-Z]{0,2}(?:\s*[-\/]\s*\d+\s*[a-zA-Z]{0,2})?)$/,
      );
      str = m ? m[1] : e.strasse || "";
      hnr = m ? m[2] : "";
    }
    Object.assign(draft.nb, {
      f_vor: e.vorname || "",
      f_nach: e.nachname || "",
      f_str: str || "",
      f_hnr: hnr || "",
      f_plz: e.plz || "",
      f_ort: e.ort || "",
      f_tel: e.telefon || "",
      f_anrede: e.anrede || "",
      f_notiz: e.notiz || "",
    });
    draft.back = "kind";
    step = "kunde";
  } else if (e.kind === "eigenkauf") {
    step = "eigen";
  } else if (e.kind === "individuell") {
    draft.titel = e.titel || "";
    draft.farbe = e.farbe;
    step = "indiv";
  } else if (e.kind === "meeting" || e.kind === "privat") {
    step = "zeit";
  } else if (e.kind === "terminieren") {
    draft.nb.zielTermine = e.ziel || 0;
    draft.modus = e.modus;
    if (e.quelle === "Promotion") {
      draft.nb.f_ort = e.ort || "";
      step = "promo";
    } else step = "termQuelle";
  } else {
    return;
  }
  paint();
}
/* Termindetails auf einen Blick, ohne in die Bearbeitung zu wechseln */
function infoKarte(e) {
  if (!e) return "";
  const qc = quelleFarbe(e);
  const zeile = (t, w) => (w ? `<span><b>${t}</b> ${w}</span>` : "");
  const kunde = e.kind === "kunde" || e.kind === "premium" || e.kind === "abholen";
  const name = [e.anrede, e.vorname, e.nachname].filter(Boolean).join(" ").trim();
  const titel = kunde ? name || "Ohne Namen" : e.kind === "terminieren" ? "Terminieren" : label(e).t1;
  const quelle =
    e.kind === "premium"
      ? "Premium CheckIn"
      : e.kind === "abholen"
        ? e.quelle || "Gerät abholen"
        : e.quelle || "";
  const zeiten = e.bis
    ? `${e.start || e.von || pad(draft.hour) + ":00"}–${e.bis} Uhr`
    : e.start
      ? `${e.start} Uhr`
      : `${pad(draft.hour)}:00–${pad((draft.hour + 2) % 24)}:00 Uhr`;
  let mitte = "";
  if (kunde) {
    const adr = [e.strasse, [e.plz, e.ort].filter(Boolean).join(" ")].filter(Boolean).join("<br>");
    mitte = `${adr ? `<div class="tadresse">${adr}</div>` : `<div class="tadresse" style="color:var(--faint)">Keine Adresse hinterlegt</div>`}
      <div class="tzeile">${zeile("Zeit", zeiten)}${zeile("Telefon", e.telefon || "")}${e.status ? zeile("Status", e.status) : ""}</div>`;
  } else if (e.kind === "terminieren") {
    mitte = `<div class="tzeile">
        ${zeile("Zeit", zeiten)}
        ${zeile("Art", e.quelle === "Promotion" ? "Promotion" : e.quelle === "Messe" ? "Messe" : e.modus || "Festgebietsbegehung")}
        ${zeile("Ort", e.ort || "")}${zeile("Gebiet", e.gebiet || "")}</div>`;
  } else if (e.kind === "eigenkauf") {
    const n = e.nb || {};
    mitte = `<div class="tzeile">${zeile("Zeit", zeiten)}${zeile("Einheiten", n.einheiten || "")}
      ${zeile("Umsatz", n.umsatz ? eur(num(n.umsatz)) + " €" : "")}</div>`;
  } else {
    mitte = `<div class="tzeile">${zeile("Zeit", zeiten)}${zeile("Art", e.art || "")}
      ${zeile("Bis einschließlich", e.bisTag ? fmt(fromDk(e.bisTag)) : "")}</div>`;
  }
  const ziel =
    e.kind === "terminieren" && e.quelle === "Messe" && e.zielEinheiten
      ? `<div class="tziel">Ziel: <b>${e.zielEinheiten} Einheit${e.zielEinheiten === 1 ? "" : "en"}</b>${
          e.nb && e.nb.einheiten ? ` · erreicht: <b>${e.nb.einheiten}</b>` : ""
        }</div>`
      : e.kind === "terminieren" && e.ziel
        ? e.quelle === "Promotion"
          ? `<div class="tziel">Ziel: <b>${e.ziel} Termine und Kontakte</b>${
              e.nb && (e.nb.termine || e.nb.kontakte)
                ? ` · erreicht: <b>${(+e.nb.termine || 0) + (+e.nb.kontakte || 0)}</b>`
                : ""
            }</div>`
          : `<div class="tziel">Ziel: <b>${e.ziel} Termin${e.ziel === 1 ? "" : "e"}</b>${
              e.nb && e.nb.termine ? ` · erreicht: <b>${e.nb.termine}</b>` : ""
            }</div>`
        : "";
  const knoepfe = kunde
    ? `<div class="actions">
      ${e.telefon ? `<a class="btn" href="${telLink(e.telefon)}">Anrufen</a>` : ""}
      ${adresseVon(e) ? `<a class="btn" href="${mapsLink(adresseVon(e))}" target="_blank" rel="noopener">Route</a>` : ""}
    </div>`
    : "";
  return `<div class="tdetail"${qc ? ` style="--qc:${qc}"` : ""}>
      <div class="tdname">${titel}</div>
      ${quelle ? `<div class="tq"><i></i>${quelle}</div>` : ""}
      ${mitte}
      ${e.notiz ? `<div class="tdnotiz">${e.notiz}</div>` : ""}
      ${ziel}
    </div>${knoepfe}`;
}
function paint() {
  paintRoh();
  sheetNormalisieren();
}
function paintRoh() {
  const e = draft ? entries[key(draft.day, draft.hour)] : null;

  if (step === "view" && e) {
    let body = infoKarte(e);
    if (e.kind === "abholen")
      body += `<p class="hinweis">Gerät ausgeliehen beim Termin am
      ${e.vonTag ? fmt(fromDk(e.vonTag)) : "–"}. Deine Entscheidung hier wird diesem Termin zugeschrieben —
      in der Statistik bleibt es ein einziger Kundentermin.</p>`;

    let extra = "",
      saveBtn = "",
      zweiteReihe = "",
      ohneLoeschen = false;
    if (e.kind === "terminieren") {
      extra = `<div class="hr"></div>` + nbTermForm(e) + (error ? `<div class="err">${error}</div>` : "");
      saveBtn = `<button class="btn primary" id="saveNbT">Abschließen</button>`;
      zweiteReihe = `<button class="btn wide" id="nbZwischen">Zwischenspeichern</button>`;
    }
    if (e.kind === "abholen") {
      extra = `<div class="hr"></div>` + abholForm(e) + (error ? `<div class="err">${error}</div>` : "");
      saveBtn = `<button class="btn primary" id="saveAb">Abschließen</button>`;
    }
    if (e.kind === "kunde" || e.kind === "premium") {
      const st = draft.nb.status || e.status || "";
      const n0 = draft.nb;
      extra =
        `<div class="hr"></div>` +
        `<div class="h4">Status</div>` +
        (st && !draft.stEdit
          ? `<div class="statuszeile"><b>${st}</b><button type="button" class="mini" id="stChange">ändern</button></div>`
          : seg(
              "status",
              ["Stattgefunden", "Verschoben", "Abgesagt", "Nicht da"],
              st,
              st === "Abgesagt" || st === "Nicht da" ? "danger" : "",
            ));
      if (st === "Stattgefunden") {
        extra +=
          (e.kind === "premium" ? nbPremiumForm() : nbForm()) +
          (error ? `<div class="err">${error}</div>` : "");
        saveBtn = `<button class="btn primary" id="saveNb">Abschließen</button>`;
        zweiteReihe = `<button class="btn wide" id="nbZwischen">Zwischenspeichern</button>`;
      }
      if (st === "Verschoben")
        extra += `<div class="sect boxed" style="margin-top:14px">
          ${fld("vsDatum", "Neues Datum", draft.nb.vsDatum || draft.day, "date")}
          <div class="field"><label for="vsZeit">Neue Startzeit</label>${hourSelect("vsZeit", draft.nb.vsZeit ?? draft.hour)}</div>
        </div>${error ? `<div class="err">${error}</div>` : ""}
        <div class="actions"><button class="btn primary" id="doMove">Termin verschieben</button></div>`;
      if (st === "Abgesagt" || st === "Nicht da") {
        extra += `<div class="hint" style="margin-top:14px">${
          st === "Nicht da"
            ? "Der Termin bleibt im Kalender als „nicht angetroffen“ stehen. Der Kunde wandert mit seinen Daten in die Potenzialliste."
            : "Der Zeitblock wird wieder frei. Der Kunde wandert mit seinen Daten in die Potenzialliste."
        }</div>`;
        saveBtn = `<button class="btn danger" id="doCancel">${st === "Nicht da" ? "Als nicht angetroffen buchen" : "Termin absagen"}</button>`;
        ohneLoeschen = true;
      }
    }
    const bearbeitbar = [
      "kunde",
      "premium",
      "eigenkauf",
      "meeting",
      "privat",
      "terminieren",
      "individuell",
    ].includes(e.kind);
    /*
     * Abschließen steht links, Löschen rechts - so liegt die Aktion,
     *  die man fast immer will, unter dem Daumen und nicht neben dem Löschen.
     */
    const foot = `<div class="actions">
        ${saveBtn}
        ${ohneLoeschen ? "" : `<button class="btn danger" id="del">Löschen</button>`}
      </div>
      ${zweiteReihe ? `<div class="actions">${zweiteReihe}</div>` : ""}
      ${
        bearbeitbar
          ? `<div class="actions"><button class="btn wide" id="editBtn">${
              e.kind === "kunde" || e.kind === "premium" ? "Kundendaten bearbeiten" : "Daten bearbeiten"
            }</button></div>`
          : ""
      }`;

    sheet.innerHTML =
      head(
        e.kind === "premium" ? "Premium CheckIn" : e.kind === "abholen" ? "Abholtermin" : "Eintrag",
        e.kind === "kunde" && draft.nb && draft.nb.status === "Stattgefunden" ? nbFortschritt() : "",
      ) +
      `<div class="sheetkoerper">` +
      body +
      historie(e) +
      extra +
      `</div>` +
      `<div class="sheetfuss">` +
      foot +
      `</div>`;
    wireSegs();
    const d1 = document.getElementById("del");
    if (d1)
      d1.onclick = () => {
        inPapierkorb(draft.day, draft.hour);
        closeModal();
        renderAll();
      };
    const snT = document.getElementById("saveNbT");
    if (snT) snT.onclick = () => saveNbTerm(e);
    const eb = document.getElementById("editBtn");
    if (eb) eb.onclick = () => startEdit(e);
    const sn = document.getElementById("saveNb");
    if (sn) sn.onclick = () => (e.kind === "premium" ? saveNbPremium(e) : saveNb(e));
    const sab = document.getElementById("saveAb");
    if (sab) sab.onclick = () => saveAbhol(e);
    const nz = document.getElementById("nbZwischen");
    if (nz)
      nz.onclick = () => {
        nbZwischen(e);
        quittung(nz, "gespeichert");
      };
    const bl = document.getElementById("nbListeAuf");
    if (bl)
      bl.onclick = () => {
        collect();
        draft.nb._blockliste = !draft.nb._blockliste;
        repaint();
      };
    sheet.querySelectorAll("[data-nbspring]").forEach(
      (b) =>
        (b.onclick = () => {
          collect();
          draft.fokus = `[data-seg="${b.dataset.nbspring}"], #${b.dataset.nbspring}, [name="${b.dataset.nbspring}"]`;
          repaint();
        }),
    );
    const stc = document.getElementById("stChange");
    if (stc)
      stc.onclick = () => {
        draft.stEdit = true;
        repaint();
      };
    const dc = document.getElementById("doCancel");
    if (dc)
      dc.onclick = () => {
        const art = draft.nb.status === "Nicht da" ? "nichtda" : "abgesagt";
        verlauf.push({ datum: draft.day, art });
        if (art === "nichtda") {
          /* Nicht angetroffen bleibt im Planer stehen */
          e.status = "nichtda";
          e.nb = { ...draft.nb, status: "Nicht da" };
          if ((e.nachname || "").trim())
            addPotenzial(e, [], "Kunde war beim Termin nicht da", draft.day);
          closeModal();
          renderAll();
          return;
        }
        insArchiv(draft.day, draft.hour, e, art);
        if ((e.kind === "kunde" || e.kind === "premium") && (e.nachname || "").trim())
          addPotenzial(
            e,
            [],
            art === "nichtda" ? "Kunde war beim Termin nicht da" : "Termin wurde abgesagt",
            draft.day,
          );
        inPapierkorb(draft.day, draft.hour);
        closeModal();
        renderAll();
      };
    const dm = document.getElementById("doMove");
    if (dm)
      dm.onclick = () => {
        collect();
        const nd = draft.nb.vsDatum,
          nh = +draft.nb.vsZeit;
        if (!nd) {
          error = "Bitte ein Datum wählen.";
          repaint();
          return;
        }
        if (nd === draft.day && nh === draft.hour) {
          error = "Das ist der bisherige Termin.";
          repaint();
          return;
        }
        if (entries[key(nd, nh)]) {
          error = "Auf diesem Platz steht schon ein Eintrag.";
          repaint();
          return;
        }
        const kopie = { ...e };
        delete kopie.status;
        delete kopie.nb;
        entries[key(nd, nh)] = kopie;
        delete entries[key(draft.day, draft.hour)];
        verlauf.push({ datum: draft.day, art: "verschoben" });
        closeModal();
        renderAll();
      };
    return;
  }

  if (step === "kind") {
    sheet.innerHTML =
      head("Was ist das für ein Termin?") +
      `<button class="opt" data-kind="kunde">Kundentermin</button>
       <button class="opt" data-kind="terminieren">Terminieren</button>
       <button class="opt" data-kind="premium">Premium CheckIn</button>
       <button class="opt" data-kind="meeting">Meeting</button>
       <button class="opt" data-kind="privat">Privat</button>
       <button class="opt" data-kind="individuell">Individuell<small>eigene Bezeichnung und Farbe</small></button>`;
    sheet.querySelectorAll("[data-kind]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.kind = b.dataset.kind;
          if (draft.kind === "kunde") {
            step = "quelle";
          } else if (draft.kind === "eigenkauf") {
            step = "eigen";
          } else if (draft.kind === "premium") {
            draft.back = "kind";
            step = "kunde";
          } else if (draft.kind === "meeting") {
            step = "art";
          } else if (draft.kind === "terminieren") {
            step = "termQuelle";
          } else if (draft.kind === "individuell") {
            step = "indiv";
          } else {
            step = "zeit";
          }
          paint();
        }),
    );
    return;
  }

  if (step === "quelle") {
    sheet.innerHTML = head("Quelle des Termins") + opts(QUELLEN, "quelle") + backBtn("kind");
    wireBack();
    sheet.querySelectorAll("[data-quelle]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.quelle = b.dataset.quelle;
          draft.back = "quelle";
          step = "kunde";
          paint();
        }),
    );
    return;
  }

  if (step === "kunde") {
    const n = draft.nb;
    sheet.innerHTML =
      head(draft.kind === "premium" ? "Premium CheckIn" : "Kundendaten") +
      `<div id="kdTreffer"></div>
       <div class="row2">${fld("f_vor", "Vorname", n.f_vor)}${fld("f_nach", "Nachname", n.f_nach)}</div>
       <div class="field"><label for="f_anrede">Anrede</label>
         <select id="f_anrede">${["", "Herr", "Frau", "Divers"]
           .map(
             (a) =>
               `<option value="${a}" ${(n.f_anrede || "") === a ? "selected" : ""}>${a || "kein Eintrag"}</option>`,
           )
           .join("")}</select></div>
       <div class="row2 strassenr">
         <div class="field vorschlagfeld" style="flex:1 1 65%"><label for="f_str">Straße</label>
           <input id="f_str" data-adr="f" value="${n.f_str || ""}" autocomplete="off" spellcheck="false">
           <div class="vorschlaege" id="f_vorschlaege" hidden></div></div>
         <div class="field" style="flex:0 0 30%"><label for="f_hnr">Hausnummer</label>
           <input id="f_hnr" value="${n.f_hnr || ""}" autocomplete="off" spellcheck="false" inputmode="text" autocapitalize="off" placeholder="5b"></div>
       </div>
       <div class="row2 plzort"><div class="field" style="flex:0 0 42%"><label for="f_plz">PLZ</label>
         <input id="f_plz" value="${n.f_plz || ""}" inputmode="numeric" maxlength="5" pattern="\\d{5}"></div>
         ${fld("f_ort", "Ort", n.f_ort)}</div>
       ${draft.kind === "premium" ? `<div class="field"><label for="f_start">Uhrzeit</label>${startSelect("f_start", draft.hour, draft.start)}</div>` : ""}
       ${fld("f_tel", "Telefon", n.f_tel, "tel", 'inputmode="tel"')}
       <div class="field"><label for="f_notiz">Notiz zum Termin</label>
         <textarea id="f_notiz" style="min-height:70px">${n.f_notiz || ""}</textarea></div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="${draft.back || "quelle"}">Zurück</button><button class="btn primary" id="save">Termin speichern</button></div>
       <div class="actions"><button class="btn" id="spaeter">Später nachtragen</button></div>
`;
    wireBack();
    kundenTreffer();
    ["f_nach", "f_plz", "f_str"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", () => kundenTreffer());
    });
    const speichere = (streng) => {
      collect();
      const g = (id) => (draft.nb[id] || "").trim();
      if (!g("f_nach")) {
        error = "Der Nachname fehlt.";
        repaint();
        return;
      }
      if (streng && !/^\d{5}$/.test(g("f_plz"))) {
        error = "Die PLZ muss genau 5 Ziffern haben.";
        repaint();
        return;
      }
      if (!streng && g("f_plz") && !/^\d{5}$/.test(g("f_plz"))) {
        error = "Die PLZ muss genau 5 Ziffern haben oder leer bleiben.";
        repaint();
        return;
      }
      const alt = entries[key(draft.day, draft.hour)] || {};
      const eintrag = {
        ...alt,
        kind: draft.kind,
        vorname: g("f_vor"),
        nachname: g("f_nach"),
        str: g("f_str"),
        hnr: g("f_hnr"),
        strasse: [g("f_str"), g("f_hnr")].filter(Boolean).join(" "),
        plz: g("f_plz"),
        ort: g("f_ort"),
        telefon: g("f_tel"),
      };
      if (draft.nb.f_lat && draft.nb.f_lon) {
        eintrag.lat = +draft.nb.f_lat;
        eintrag.lon = +draft.nb.f_lon;
      }
      if (draft.nb.f_anrede) eintrag.anrede = draft.nb.f_anrede;
      else delete eintrag.anrede;
      if (g("f_notiz")) eintrag.notiz = g("f_notiz");
      else delete eintrag.notiz;
      if (draft.quelle) eintrag.quelle = draft.quelle;
      if (draft.kind === "premium") {
        const st = (document.getElementById("f_start") || {}).value || "";
        if (st && st !== pad(draft.hour) + ":00") eintrag.start = st;
        else delete eintrag.start;
      }
      entries[key(draft.day, draft.hour)] = eintrag;
      closeModal();
      renderAll();
    };
    document.getElementById("save").onclick = () => speichere(true);
    document.getElementById("spaeter").onclick = () => speichere(false);
    return;
  }

  if (step === "indiv") {
    const von = `${pad(draft.hour)}:00`;
    const bis = draft.bis || (draft.hour + 2 >= 24 ? "00:00" : `${pad(draft.hour + 2)}:00`);
    const farbe = draft.farbe || FARBEN[9];
    sheet.innerHTML =
      head("Individueller Termin") +
      `<div class="grp">
         ${fld("ivTitel", "Bezeichnung", draft.titel || "", "text", 'placeholder="z. B. Messe, Fortbildung"')}
         <div class="row2">
           <div class="field"><label for="f_start">Von</label>${startSelect("f_start", draft.hour, draft.start)}</div>
           <div class="field"><label for="f_bis">Bis</label><input type="time" id="f_bis" value="${bis}" step="900"></div>
         </div>
         ${fld("ivBisTag", "Bis einschließlich Tag (optional)", draft.bisTag || "", "date")}
         <div class="sect"><span class="lb">Farbe im Planer</span>
           <div class="farben">${FARBEN.map((c) => `<button type="button" class="farbe" data-farbe="${c}" style="--c:${c}" aria-pressed="${farbe === c}" aria-label="Farbe"></button>`).join("")}</div>
         </div>
       </div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="kind">Zurück</button><button class="btn primary" id="save">Speichern</button></div>
`;
    wireBack();
    sheet.querySelectorAll("[data-farbe]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.titel = document.getElementById("ivTitel").value;
          draft.bis = document.getElementById("f_bis").value;
          draft.bisTag = document.getElementById("ivBisTag").value;
          draft.start = document.getElementById("f_start").value;
          draft.farbe = b.dataset.farbe;
          repaint();
        }),
    );
    document.getElementById("save").onclick = () => {
      const titel = document.getElementById("ivTitel").value.trim();
      const b = document.getElementById("f_bis").value;
      const bisTag = document.getElementById("ivBisTag").value;
      const bDec = toDec(b) || 24;
      const st = document.getElementById("f_start").value || von;
      draft.bis = b;
      draft.titel = titel;
      draft.bisTag = bisTag;
      draft.farbe = farbe;
      draft.start = st;
      if (!b || bDec <= toDec(st)) {
        error = `Die Endzeit muss nach ${st} liegen.`;
        paint();
        return;
      }
      if (bisTag && bisTag < draft.day) {
        error = "Das Enddatum liegt vor dem Termin.";
        paint();
        return;
      }
      const alt = entries[key(draft.day, draft.hour)] || {};
      const eintrag = { ...alt, kind: "individuell", von, bis: b, farbe };
      if (st !== von) eintrag.start = st;
      else delete eintrag.start;
      if (titel) eintrag.titel = titel;
      else delete eintrag.titel;
      if (bisTag && bisTag > draft.day) eintrag.bisTag = bisTag;
      else delete eintrag.bisTag;
      entries[key(draft.day, draft.hour)] = eintrag;
      closeModal();
      renderAll();
    };
    return;
  }

  if (step === "potenzial") {
    const n = draft.nb;
    const has = n.besitz || [];
    const gr = n.nkgruende || [];
    sheet.innerHTML =
      head("Kein Kauf") +
      `<div class="h4">Kein Kauf – hat der Kunde das hier bereits?</div>
       <div class="grp">
         ${checks("besitz", BESITZ, has, "geraete4")}
         <div class="actions" style="margin-top:10px"><button type="button" class="btn" id="hatAlles">
           ${has.length >= BESITZ.length ? "Auswahl leeren" : "Hat alles"}</button></div>
       </div>
       ${
         has.length < BESITZ.length
           ? `
       <div class="h4">Top „Nicht kauf“ Gründe</div>
       <div class="grp">
         ${checks("nkgruende", NK_GRUENDE, gr, "gruende2")}
         <div class="field" style="margin-top:14px"><label for="grund">Zusatz&nbsp;Info oder individueller Grund</label>
           <textarea id="grund">${n.grund || ""}</textarea></div>
         ${wvFeld("wvMonat", n.wvMonat || "", "Rückmeldung (freiwillig)")}
         <p class="hinweis">Offen bleibt: ${BESITZ.filter((b) => !has.includes(b)).join(" · ") || "–"}</p>
       </div>`
           : `
       <div class="grp"><p class="hinweis">Der Kunde hat bereits alles — es entsteht kein Eintrag in der Potenzialliste.</p></div>`
       }
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn primary" id="potFertig">Übernehmen</button></div>`;
    wireSegs();
    const alles = document.getElementById("hatAlles");
    if (alles)
      alles.onclick = () => {
        collect();
        draft.nb.besitz = (draft.nb.besitz || []).length >= BESITZ.length ? [] : [...BESITZ];
        repaint();
      };
    document.getElementById("potFertig").onclick = () => {
      collect();
      const b = draft.nb.besitz || [];
      const g = draft.nb.nkgruende || [];
      if (b.length < BESITZ.length && !g.length && !(draft.nb.grund || "").trim()) {
        error = "Bitte einen Grund wählen oder kurz eintragen, warum nicht gekauft wurde.";
        draft.fokus = '[data-chk="nkgruende"]';
        repaint();
        return;
      }
      error = "";
      step = "view";
      paint();
    };
    return;
  }

  if (step === "empf") {
    const n = draft.nb;
    sheet.innerHTML =
      head("Empfehlungen") +
      (n.empfListe || [{}])
        .map(
          (e, i) => `
        <div class="empkarte">
          <div class="ekopf"><span>Empfehlung ${i + 1}</span>
            ${(n.empfListe || []).length > 1 ? `<button type="button" class="mini" data-empdel="${i}">entfernen</button>` : ""}</div>
          <div class="row2">
            <div class="field"><label>Vorname</label><input data-emp="${i}|vor" value="${e.vor || ""}" autocomplete="off"></div>
            <div class="field"><label>Nachname</label><input data-emp="${i}|nach" value="${e.nach || ""}" autocomplete="off"></div>
          </div>
          <div class="row2">
            <div class="field vorschlagfeld" style="flex:1 1 65%"><label>Straße</label>
              <input id="emp${i}_str" data-emp="${i}|str" data-adr="emp${i}" value="${e.str || ""}" autocomplete="off">
              <div class="vorschlaege" id="emp${i}_vorschlaege" hidden></div></div>
            <div class="field" style="flex:0 0 30%"><label>Nr.</label>
              <input id="emp${i}_hnr" data-emp="${i}|hnr" value="${e.hnr || ""}" autocomplete="off" inputmode="text" autocapitalize="off" spellcheck="false" placeholder="5b"></div>
          </div>
          <div class="row2">
            <div class="field" style="flex:0 0 42%"><label>PLZ</label>
              <input id="emp${i}_plz" data-emp="${i}|plz" value="${e.plz || ""}" inputmode="numeric" maxlength="5"></div>
            <div class="field"><label>Ort</label>
              <input id="emp${i}_ort" data-emp="${i}|ort" value="${e.ort || ""}" autocomplete="off"></div>
          </div>
          <div class="field"><label>Telefon (freiwillig)</label><input data-emp="${i}|tel" type="tel" inputmode="tel" value="${e.tel || ""}" autocomplete="off"></div>
          <div class="field"><label>Notiz</label><textarea data-emp="${i}|notiz" style="min-height:60px">${e.notiz || ""}</textarea></div>
        </div>`,
        )
        .join("") +
      `<div class="actions"><button type="button" class="btn" id="empPlus">+ weitere Empfehlung</button></div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn primary" id="empFertig">Übernehmen</button></div>
`;
    wireSegs();
    document.getElementById("empFertig").onclick = () => {
      collect();
      const gueltig = (draft.nb.empfListe || []).filter((x) => x && (x.nach || "").trim());
      if (!gueltig.length) {
        error =
          "Bitte mindestens eine Empfehlung mit Namen eintragen — oder bei „Und welche bekommen?“ auf „Nein“ stellen.";
        repaint();
        return;
      }
      error = "";
      step = "view";
      paint();
    };
    return;
  }

  if (step === "eigen") {
    const n = draft.nb;
    sheet.innerHTML =
      head("Eigenkauf") +
      `<div class="grp">
         <div class="field"><label for="f_start">Uhrzeit</label>${startSelect("f_start", draft.hour, draft.start)}</div>
         ${zaehlZeile("einheiten", "Einheiten", n.einheiten)}
         ${fld("umsatz", "Bruttoumsatz €", n.umsatz, "text", 'inputmode="decimal"')}
       </div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="kind">Zurück</button><button class="btn primary" id="save">Speichern</button></div>
`;
    wireBack();
    wireSegs();
    document.getElementById("save").onclick = () => {
      collect();
      if (num(draft.nb.umsatz) <= 0 && !(+draft.nb.einheiten > 0)) {
        error = "Bitte Einheiten oder Bruttoumsatz eintragen.";
        repaint();
        return;
      }
      const alt = entries[key(draft.day, draft.hour)] || {};
      const st = (document.getElementById("f_start") || {}).value || "";
      const neu = {
        ...alt,
        kind: "eigenkauf",
        status: "stattgefunden",
        nb: {
          verkauft: "Ja",
          gebiet: "Festgebiet",
          kundenstatus: "Bestandskunde",
          einheiten: draft.nb.einheiten || "",
          umsatz: draft.nb.umsatz || "",
        },
      };
      if (st && st !== pad(draft.hour) + ":00") neu.start = st;
      else delete neu.start;
      entries[key(draft.day, draft.hour)] = neu;
      closeModal();
      renderAll();
    };
    return;
  }

  if (step === "termQuelle") {
    sheet.innerHTML =
      head("Woraus terminierst du?") +
      `<button class="opt" data-tq="Festgebietsbegehung" data-fg="Bestandskunde">FGB – Bestandskunden</button>
       <button class="opt" data-tq="Festgebietsbegehung" data-fg="Door to Door">FGB – Door to Door</button>
       <button class="opt" data-tq="Promotion">Promotion</button>` +
      backBtn("kind");
    wireBack();
    sheet.querySelectorAll("[data-tq]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.quelle = b.dataset.tq;
          draft.modus = b.dataset.fg || "";
          step = draft.quelle === "Promotion" ? "promo" : "termZiel";
          paint();
        }),
    );
    return;
  }

  /* Jeder Terminierungsblock bekommt ein Ziel - direkt beim Setzen */
  if (step === "termZiel") {
    const n = draft.nb;
    const alt0 = entries[key(draft.day, draft.hour)] || {};
    const vonT = `${pad(draft.hour)}:00`;
    const bisT = draft.bis || alt0.bis || (draft.hour + 2 >= 24 ? "00:00" : `${pad(draft.hour + 2)}:00`);
    sheet.innerHTML =
      head("Festgebietsbegehung") +
      `<div class="row2">
         <div class="field"><label>Von</label><div class="fixed">${vonT}</div></div>
         <div class="field"><label for="f_bis">Bis wann</label><input type="time" id="f_bis" value="${bisT}" step="900"></div>
       </div>
       <div class="h4">Ziel</div>
       <div class="grp">
         ${zaehlZeile("zielTermine", "Termine", n.zielTermine)}
       </div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="termQuelle">Zurück</button>
         <button class="btn primary" id="save">Speichern</button></div>
`;
    wireBack();
    wireSegs();
    document.getElementById("save").onclick = () => {
      collect();
      const ziel = +draft.nb.zielTermine || 0;
      const b = (document.getElementById("f_bis") || {}).value || "";
      draft.bis = b;
      if (!ziel) {
        error = "Bitte ein Ziel setzen — mindestens ein Termin.";
        repaint();
        return;
      }
      const bDec = b ? toDec(b) || 24 : draft.hour + 2;
      if (bDec <= draft.hour) {
        error = `Die Endzeit muss nach ${vonT} liegen.`;
        repaint();
        return;
      }
      if (coveredHours(draft.hour + 2, bDec).some((hr) => entries[key(draft.day, hr)])) {
        error = "In der verlängerten Zeit steht schon ein Eintrag.";
        repaint();
        return;
      }
      const alt = entries[key(draft.day, draft.hour)] || {};
      const neu = {
        ...alt,
        kind: "terminieren",
        quelle: "Festgebietsbegehung",
        modus: draft.modus || alt.modus,
        ziel,
      };
      if (b && Math.abs(bDec - (draft.hour + 2)) > 0.01) {
        neu.von = vonT;
        neu.bis = b;
      } else {
        delete neu.von;
        delete neu.bis;
      }
      entries[key(draft.day, draft.hour)] = neu;
      closeModal();
      renderAll();
    };
    return;
  }

  if (step === "promo") {
    const geb = draft.gebiet || "Festgebiet";
    const von = `${pad(draft.hour)}:00`;
    const bis = draft.bis || (draft.hour + 2 >= 24 ? "00:00" : `${pad(draft.hour + 2)}:00`);
    sheet.innerHTML =
      head("Promotion") +
      `${fld("f_ort", "Ort", draft.nb.f_ort)}
       <div class="row2">
         <div class="field"><label>Von</label><div class="fixed">${von}</div></div>
         <div class="field"><label for="f_bis">Bis</label><input type="time" id="f_bis" value="${bis}" step="900"></div>
       </div>
       <div class="sect"><span class="lb">Gebiet</span>${seg("gebiet2", ["Festgebiet", "Weißgebiet"], geb)}</div>
       <div class="h4">Ziel für diesen Einsatz</div>
       <div class="grp">${zaehlZeile("zielTermine", "Termine und Kontakte", draft.nb.zielTermine)}</div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="termQuelle">Zurück</button><button class="btn primary" id="save">Speichern</button></div>
`;
    wireBack();
    wireSegs();
    sheet.querySelectorAll("[data-seg]").forEach(
      (b) =>
        (b.onclick = () => {
          collect();
          draft.bis = document.getElementById("f_bis").value;
          draft.gebiet = b.dataset.val;
          repaint();
        }),
    );
    document.getElementById("save").onclick = () => {
      collect();
      const b = document.getElementById("f_bis").value;
      const bDec = toDec(b) || 24;
      draft.bis = b;
      const ziel = +draft.nb.zielTermine || 0;
      if (!ziel) {
        error = "Bitte ein Ziel setzen — mindestens ein Termin.";
        draft.gebiet = geb;
        paint();
        return;
      }
      if (!b || bDec <= draft.hour) {
        error = `Die Endzeit muss nach ${von} liegen.`;
        draft.gebiet = geb;
        paint();
        return;
      }
      if (coveredHours(draft.hour, bDec).some((hr) => hr !== draft.hour && entries[key(draft.day, hr)])) {
        error = "In diesem Zeitraum steht schon ein Eintrag.";
        draft.gebiet = geb;
        paint();
        return;
      }
      const alt = entries[key(draft.day, draft.hour)] || {};
      entries[key(draft.day, draft.hour)] = {
        ...alt,
        kind: "terminieren",
        quelle: "Promotion",
        ort: (draft.nb.f_ort || "").trim(),
        gebiet: geb,
        von,
        bis: b,
        ziel,
      };
      closeModal();
      renderAll();
    };
    return;
  }

  if (step === "art") {
    sheet.innerHTML = head("Art des Meetings") + opts(istTeamleiter() ? [...MEETINGS, "ViKo", "TL Runde"] : MEETINGS, "art") + backBtn("kind");
    wireBack();
    sheet.querySelectorAll("[data-art]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.art = b.dataset.art;
          step = "zeit";
          paint();
        }),
    );
    return;
  }

  if (step === "zeit") {
    const von = `${pad(draft.hour)}:00`;
    const bis = draft.bis || (draft.hour + 2 >= 24 ? "00:00" : `${pad(draft.hour + 2)}:00`);
    const privat = draft.kind === "privat";
    sheet.innerHTML =
      head(privat ? "Privat" : draft.art) +
      `<div class="row2">
         <div class="field"><label for="f_start">Von</label>${startSelect("f_start", draft.hour, draft.start)}</div>
         <div class="field"><label for="f_bis">Bis</label><input type="time" id="f_bis" value="${bis}" step="900"></div>
       </div>
       ${privat ? `${fld("prBisTag", "Bis einschließlich Tag (für Urlaub, sonst leer lassen)", draft.bisTag || "", "date")}` : ""}
       ${
         draft.kind === "meeting"
           ? `<div class="field"><label for="f_mnotiz">Notiz</label><input id="f_mnotiz" maxlength="80" placeholder="z. B. Thema der Schulung" value="${entschaerfeText(
               draft.notiz ?? (entries[key(draft.day, draft.hour)] || {}).notiz ?? "",
             )}"></div>`
           : ""
       }
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="${privat ? "kind" : "art"}">Zurück</button><button class="btn primary" id="save">Speichern</button></div>
`;
    wireBack();
    document.getElementById("save").onclick = () => {
      const b = document.getElementById("f_bis").value;
      draft.bis = b;
      const mn = document.getElementById("f_mnotiz");
      if (mn) draft.notiz = mn.value.trim();
      const st = document.getElementById("f_start").value || von;
      draft.start = st;
      const bDec = toDec(b) || 24;
      if (!b || bDec <= toDec(st)) {
        error = `Die Endzeit muss nach ${st} liegen.`;
        paint();
        return;
      }
      const bisTagEl = document.getElementById("prBisTag");
      const bisTag = bisTagEl ? bisTagEl.value : "";
      if (bisTag && bisTag < draft.day) {
        error = "Das Enddatum liegt vor dem Termin.";
        draft.bisTag = bisTag;
        paint();
        return;
      }
      const hit = coveredHours(draft.hour, bDec);
      if (hit.some((hr) => hr !== draft.hour && entries[key(draft.day, hr)] && !privat)) {
        error = "In diesem Zeitraum steht schon ein Eintrag.";
        paint();
        return;
      }
      const alt = entries[key(draft.day, draft.hour)] || {};
      const eintrag = { ...alt, kind: draft.kind, von, bis: b };
      if (st !== von) eintrag.start = st;
      else delete eintrag.start;
      if (draft.art) eintrag.art = draft.art;
      else delete eintrag.art;
      if (draft.kind === "meeting" && draft.notiz) eintrag.notiz = draft.notiz;
      else if (draft.kind === "meeting") delete eintrag.notiz;
      if (bisTag && bisTag > draft.day) eintrag.bisTag = bisTag;
      else delete eintrag.bisTag;
      entries[key(draft.day, draft.hour)] = eintrag;
      closeModal();
      renderAll();
    };
    return;
  }
}
const backBtn = (to) => `<div class="actions"><button class="btn" data-back="${to}">Zurück</button></div>`;
function wireBack() {
  sheet.querySelectorAll("[data-back]").forEach(
    (b) =>
      (b.onclick = () => {
        error = "";
        step = b.dataset.back;
        paint();
      }),
  );
}
function wireSegs() {
  sheet.querySelectorAll("[data-zplus],[data-zminus]").forEach(
    (b) =>
      (b.onclick = () => {
        stups(8, b.parentElement && b.parentElement.querySelector(".zahl"));
        collect();
        const id = b.dataset.zplus || b.dataset.zminus;
        const neu = Math.max(0, (+draft.nb[id] || 0) + (b.dataset.zplus ? 1 : -1));
        draft.nb[id] = neu;
        const a = sheet.querySelector(`[data-zwert="${id}"]`);
        if (a) {
          a.textContent = neu;
          a.parentElement.classList.toggle("hat", neu > 0);
          a.closest(".zzeile").classList.toggle("hat", neu > 0);
        }
      }),
  );
  sheet.querySelectorAll("[data-zwert][data-zedit]").forEach(
    (el) =>
      (el.onclick = () => {
        collect();
        const id = el.dataset.zwert;
        zahlEingabe(el.dataset.zedit, draft.nb[id], (v) => {
          draft.nb[id] = v;
          el.textContent = v;
          el.parentElement.classList.toggle("hat", v > 0);
          el.closest(".zzeile").classList.toggle("hat", v > 0);
        });
      }),
  );
  sheet.querySelectorAll("[data-zeit]").forEach(
    (b) =>
      (b.onclick = () => {
        collect();
        draft.nb[b.dataset.zeit === "start" ? "realStart" : "realEnde"] = uhrJetzt();
        stilleSicherung(); // Zeiten sind sofort weg-gespeichert
        repaint();
      }),
  );
  const zs = sheet.querySelector("#zaehlStart");
  if (zs)
    zs.onclick = () => {
      const e = entries[key(draft.day, draft.hour)];
      if (e) zaehlModus(e);
    };
  sheet.querySelectorAll("[data-nbzu]").forEach(
    (b) =>
      (b.onclick = () => {
        collect();
        const id = "_zu_" + b.dataset.nbzu;
        draft.nb[id] = !draft.nb[id];
        repaint();
      }),
  );
  const potBtn = sheet.querySelector("#potOeffnen");
  if (potBtn)
    potBtn.onclick = () => {
      collect();
      step = "potenzial";
      error = "";
      paint();
    };
  const oeffnen = sheet.querySelector("#empOeffnen");
  if (oeffnen)
    oeffnen.onclick = () => {
      collect();
      draft.nb.empfListe = draft.nb.empfListe && draft.nb.empfListe.length ? draft.nb.empfListe : [{}];
      step = "empf";
      error = "";
      paint();
    };
  const plus = sheet.querySelector("#empPlus");
  if (plus)
    plus.onclick = () => {
      collect();
      draft.nb.empfListe = [...(draft.nb.empfListe || [{}]), {}];
      repaint();
    };
  sheet.querySelectorAll("[data-empdel]").forEach(
    (b) =>
      (b.onclick = () => {
        collect();
        const l = [...(draft.nb.empfListe || [])];
        l.splice(+b.dataset.empdel, 1);
        draft.nb.empfListe = l.length ? l : [{}];
        repaint();
      }),
  );
  sheet.querySelectorAll("[data-seg]").forEach(
    (b) =>
      (b.onclick = () => {
        collect();
        error = "";
        draft.nb[b.dataset.seg] = draft.nb[b.dataset.seg] === b.dataset.val ? "" : b.dataset.val;
        if (b.dataset.seg === "status") draft.stEdit = false;
        /* Wird das Gerät doch ausgeliehen, ist das Potenzial hier noch nicht dran */
        if (b.dataset.seg === "ausgeliehen" && draft.nb.ausgeliehen === "Ja") {
          draft.nb.besitz = [];
          draft.nb.grund = "";
        }
        repaint();
      }),
  );
  sheet.querySelectorAll("[data-chk]").forEach(
    (b) =>
      (b.onclick = () => {
        collect();
        const nme = b.dataset.chk,
          v = b.dataset.val,
          arr = draft.nb[nme] ? [...draft.nb[nme]] : [];
        const i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(v);
        draft.nb[nme] = arr;
        repaint();
      }),
  );
}
