/**
 * Nachbereitung
 *
 * Erfassung von Ergebnis, Verkauf, Potenzial und Empfehlungen nach einem Termin.
 */
/* Anzahl namentlich erfasster Empfehlungen */
function empfZahl(n) {
  return ((n && n.empfListe) || []).filter((x) => x && (x.nach || "").trim()).length;
}
/* Ist ein Block vollständig ausgefüllt? Bestimmt nur den Zustand beim Öffnen. */
function blockVoll(id, n) {
  if (id === "kunde") return !!(n.kundenstatus && n.gebiet && (n.geraet || "").trim());
  if (id === "zeit") return !!(n.realStart && n.realEnde);
  if (id === "gespraech") return !!(n.empf && n.job && (n.empf !== "Ja" || empfZahl(n) > 0));
  if (id === "vorfuehrung") return !!(n.kundenstatus === "Neukunde" || n.wartung);
  return false;
}
function blockZustaende() {
  ["kunde", "zeit", "gespraech", "vorfuehrung"].forEach((id) => {
    draft.nb["_zu_" + id] = blockVoll(id, draft.nb);
  });
}
/* Ein Block der Nachbereitung – zugeklappt zeigt er nur seine Zusammenfassung */
function nbBlock(id, titel, inhalt, zusammen, offenWenn) {
  const offen = !draft.nb["_zu_" + id];
  return `<div class="nbblock${offen ? " offen" : ""}">
    <button type="button" class="nbkopf" data-nbzu="${id}">
      <span class="nbtitel">${titel}</span>
      <span class="nbkurz">${offen ? "" : zusammen || "offen"}</span>
      <span class="nbpfeil">${offen ? "–" : "+"}</span>
    </button>
    ${offen ? `<div class="nbinhalt">${inhalt}</div>` : ""}
  </div>`;
}
function nbForm() {
  const n = draft.nb;
  if (n.datiert === undefined) n.datiert = "Nein"; // der Normalfall
  const geraetLabel =
    n.kundenstatus === "Neukunde"
      ? "Welche Marke hat der Kunde aktuell?"
      : "Welches Gerät hat der Kunde aktuell?";
  let h =
    nbBlock(
      "kunde",
      "Kunde",
      `<div class="sect"><span class="lb">Kundenart</span>${seg("kundenstatus", ["Neukunde", "Bestandskunde"], n.kundenstatus)}</div>
     <div class="sect"><span class="lb">Gebiet</span>${seg("gebiet", ["Festgebiet", "Weißgebiet"], n.gebiet)}</div>
     ${fld("geraet", geraetLabel, n.geraet)}`,
      [n.kundenstatus, n.gebiet].filter(Boolean).join(" · "),
      !(n.kundenstatus && n.gebiet),
    ) +
    nbBlock(
      "zeit",
      "Echte Zeiten",
      `<div class="row2">
       ${fld("realStart", "Gestartet", n.realStart || "", "time", 'step="300"')}
       ${fld("realEnde", "Geendet", n.realEnde || "", "time", 'step="300"')}
     </div>`,
      n.realStart && n.realEnde ? `${n.realStart}–${n.realEnde}` : "",
      true,
    ) +
    nbBlock(
      "gespraech",
      "Gespräch",
      `
      <div class="sect"><span class="lb">Nach Empfehlungen gefragt?</span>${seg("empf", ["Ja", "Nein"], n.empf)}</div>
      ${
        n.empf === "Ja"
          ? `<div class="sect"><span class="lb">Und welche bekommen?</span>${seg(
              "empfErhalten",
              ["Ja", "Nein"],
              n.empfErhalten,
            )}</div>`
          : ""
      }
      ${
        n.empf === "Ja" && n.empfErhalten === "Ja"
          ? `<div class="actions"><button type="button" class="btn" id="empOeffnen">
        ${empfZahl(n)} ${empfZahl(n) === 1 ? "Empfehlung" : "Empfehlungen"} erfasst — eintragen</button></div>`
          : ""
      }
      <div class="sect"><span class="lb">Nach Jobticket gefragt?</span>${seg("job", ["Ja", "Nein"], n.job)}
        ${n.job === "Ja" ? zaehlZeile("jobAnzahl", "Wie viele bekommen?", n.jobAnzahl) : ""}</div>`,
      [
        n.empf === "Ja"
          ? n.empfErhalten === "Nein"
            ? "keine Empfehlung bekommen"
            : `${empfZahl(n)} Empfehlungen`
          : "",
        n.job === "Ja" ? `${+n.jobAnzahl || 0} Jobtickets` : "",
      ]
        .filter(Boolean)
        .join(" · ") || (n.empf && n.job ? "keine" : ""),
      !(n.empf && n.job) || (n.empf === "Ja" && !n.empfErhalten),
    ) +
    nbBlock(
      "vorfuehrung",
      "Vorführung",
      `<div class="sect"><span class="lb">Was wurde vorgeführt?</span>${checks("vorgefuehrt", DEMO, n.vorgefuehrt || [], "stack")}</div>
     ${zaehlZeile("demotuecher", "Wie viele Demotücher gezogen?", n.demotuecher)}
     ${n.kundenstatus === "Neukunde" ? "" : `<div class="sect"><span class="lb">Wartungsservice gemacht?</span>${seg("wartung", ["Ja", "Nein"], n.wartung)}</div>`}`,
      (n.vorgefuehrt || []).length ? `${(n.vorgefuehrt || []).length} Geräte` : "nichts vorgeführt",
      !(n.kundenstatus === "Neukunde" || n.wartung),
    ) +
    `<div class="h4">Abschluss</div>
    <div class="grp">
      <div class="sect"><span class="lb">K70 aus dem Kofferraum verkauft?</span>${seg("k70", ["Ja", "Nein"], n.k70)}
        ${n.k70 === "Ja" ? fld("k70betrag", "Bruttoumsatz K70 €", n.k70betrag, "text", 'inputmode="decimal"') : ""}</div>
      <div class="sect"><span class="lb">Hat der Kunde gekauft?</span>${seg("verkauft", ["Ja", "Nein"], n.verkauft)}</div>
      ${
        n.verkauft === "Ja"
          ? `${zaehlZeile("einheiten", "Einheiten", n.einheiten)}${fld("umsatz", "Bruttoumsatz €", n.umsatz, "text", 'inputmode="decimal"')}
      ${provHakenHTML(n)}
      <p class="hinweis" style="margin-top:0">Artikel ohne Einheiten? Dann Einheiten auf 0 lassen und nur den Umsatz eintragen.</p>
        <div class="sect"><span class="lb">Späteres Lieferdatum?</span>${seg("datiert", ["Ja", "Nein"], n.datiert)}
          ${
            n.datiert === "Ja"
              ? `${fld("lieferdatum", "Geliefert und abgerechnet am", n.lieferdatum || draft.day, "date")}
            <p class="hinweis">Der Umsatz zählt heute in Statistik und Wochenmeldung, fließt aber erst im
              Vertriebsmonat des Lieferdatums in die Provision.</p>`
              : ""
          }</div>`
          : ""
      }
    </div>`;

  if (n.verkauft === "Ja") {
    h += `<div class="h4">Premium CheckIn vereinbaren</div>
      <div class="grp">
        ${fld("pcDatum", "Datum", n.pcDatum || plusTage(draft.day, 14), "date")}
        <div class="field"><label for="pcZeit">Startzeit</label>${hourSelect("pcZeit", n.pcZeit ?? draft.hour)}</div>
      </div>`;
  }
  if (n.verkauft === "Nein") {
    const has = n.besitz || [];
    const fertig = nkFertig(n);
    h += `<div class="h4">Kein Kauf</div>
      <div class="grp">
        <div class="sect"><span class="lb">Gerät ausgeliehen, Kaufentscheidung später?</span>
          ${seg("ausgeliehen", ["Ja", "Nein"], n.ausgeliehen)}</div>
        ${
          n.ausgeliehen === "Ja"
            ? `
          <div class="ah4" style="margin-top:6px">Abholtermin</div>
          ${fld("abDatum", "Datum", n.abDatum || plusTage(draft.day, 3), "date")}
          <div class="field"><label for="abZeit">Startzeit</label>${hourSelect("abZeit", n.abZeit ?? draft.hour)}</div>
          <p class="hinweis">Der Abholtermin wird im Kalender angelegt, mit Adresse und Telefonnummer.
            Das offene Potenzial und der Grund werden erst dort erfasst — falls es doch ein Nein wird.</p>`
            : ""
        }
      </div>
      ${
        n.ausgeliehen === "Nein"
          ? `<div class="grp">
        <div class="actions"><button type="button" class="btn${fertig ? "" : " primary"}" id="potOeffnen">
          ${fertig ? `Potenzial erfasst · ${BESITZ.length - has.length} offen — ändern` : "Potenzial erfassen"}</button></div>
      </div>`
          : ""
      }`;
  }
  h += `<div class="h4">Wiedervorlage</div>
    <div class="grp">
      ${wvFeld("wvMonat", n.wvMonat || "", "Wieder ansprechen (freiwillig)")}
    </div>`;
  return h;
}

/* Nachbereitung für Premium CheckIn – nur der Nachkauf zählt */
function nbPremiumForm() {
  const n = draft.nb;
  return `<div class="h4">Nachbereitung · Premium CheckIn</div>
    <div class="h4">Echte Zeiten</div>
    <div class="grp">
      <div class="row2">
        ${fld("realStart", "Gestartet", n.realStart || "", "time", 'step="300"')}
        ${fld("realEnde", "Geendet", n.realEnde || "", "time", 'step="300"')}
      </div>
    </div>
    <div class="h4">Abschluss</div>
    <div class="grp">
      <div class="sect"><span class="lb">K70 abverkauft?</span>${seg("k70", ["Ja", "Nein"], n.k70)}
        ${n.k70 === "Ja" ? fld("k70betrag", "Bruttoumsatz K70 €", n.k70betrag, "text", 'inputmode="decimal"') : ""}</div>
      <div class="sect"><span class="lb">Hat der Kunde etwas nachgekauft?</span>${seg("verkauft", ["Ja", "Nein"], n.verkauft)}</div>
      ${
        n.verkauft === "Ja"
          ? `
        <div class="sect"><span class="lb">Gebiet</span>${seg("gebiet", ["Festgebiet", "Weißgebiet"], n.gebiet)}</div>
        ${zaehlZeile("einheiten", "Einheiten", n.einheiten)}${fld("umsatz", "Bruttoumsatz €", n.umsatz, "text", 'inputmode="decimal"')}
        ${provHakenHTML(n)}`
          : ""
      }
    </div>`;
}
function saveNbPremium(e) {
  collect();
  const n = draft.nb;
  if (!n.verkauft) {
    error = "Bitte angeben, ob der Kunde nachgekauft hat.";
    repaint();
    return;
  }
  if (n.verkauft === "Ja" && !n.gebiet) {
    error = "Bitte das Gebiet angeben.";
    repaint();
    return;
  }
  if (!n.k70) {
    error = "Bitte angeben, ob K70 abverkauft wurde.";
    repaint();
    return;
  }
  e.nb = { ...n, kundenstatus: "Bestandskunde" };
  e.status = "stattgefunden";
  closeModal();
  renderAll();
}

/*
 * Nach der Übernahme in den ursprünglichen Termin trägt der Abholtermin selbst
 * keine Zahlen mehr – sonst zählten Einheiten, Umsatz und K70 doppelt
 * (Statistik, Wochenmeldung, Provision, Verkäufe, Kundenliste).
 */
function abholNeutralisieren(nb) {
  const uebernommen = {};
  ["einheiten", "umsatz", "k70betrag", "umsatzFG", "umsatzWG", "provVK", "provKT"].forEach((f) => {
    if (nb[f] !== undefined && nb[f] !== "") uebernommen[f] = nb[f];
    delete nb[f];
  });
  if (nb.verkauft === "Ja" || nb.verkauft === "Übertragen") nb.verkauft = "Übertragen";
  if (nb.k70 === "Ja" || nb.k70 === "Übertragen") nb.k70 = "Übertragen";
  nb.uebertragen = Object.assign(nb.uebertragen || {}, uebernommen);
}

/* Nachbereitung des Abholtermins – das Ergebnis wandert in den ursprünglichen Kundentermin */
function abholForm(e) {
  const n = draft.nb;
  const has = n.besitz || [];
  const fertig = nkFertig(n);
  return `<div class="h4">Kaufentscheidung</div>
    <div class="grp">
      <div class="sect"><span class="lb">Hat der Kunde gekauft?</span>${seg("verkauft", ["Ja", "Nein"], n.verkauft)}</div>
      ${
        n.verkauft === "Ja"
          ? `
        <div class="sect"><span class="lb">Gebiet</span>${seg("gebiet", ["Festgebiet", "Weißgebiet"], n.gebiet)}</div>
        ${zaehlZeile("einheiten", "Einheiten", n.einheiten)}
        ${fld("umsatz", "Bruttoumsatz €", n.umsatz, "text", 'inputmode="decimal"')}
        ${provHakenHTML(n)}
        <div class="sect"><span class="lb">K70 aus dem Kofferraum verkauft?</span>${seg("k70", ["Ja", "Nein"], n.k70)}
          ${n.k70 === "Ja" ? fld("k70betrag", "Bruttoumsatz K70 €", n.k70betrag, "text", 'inputmode="decimal"') : ""}</div>
        <p class="hinweis">Umsatz und Einheiten werden dem ursprünglichen Kundentermin zugeschrieben und
          im Vertriebsmonat dieses Abholtermins abgerechnet. In der Statistik bleibt es ein Termin.</p>`
          : ""
      }
      ${
        n.verkauft === "Nein"
          ? `
        <div class="actions"><button type="button" class="btn${fertig ? "" : " primary"}" id="potOeffnen">
          ${fertig ? `Potenzial erfasst · ${BESITZ.length - has.length} offen — ändern` : "Potenzial erfassen"}</button></div>
`
          : ""
      }
    </div>`;
}
function saveAbhol(e) {
  const n = draft.nb;
  if (!n.verkauft) {
    error = "Bitte angeben, ob der Kunde gekauft hat.";
    repaint();
    return;
  }
  const urspruenglich = e.vonTag !== undefined ? entries[key(e.vonTag, e.vonStunde)] : null;
  if (n.verkauft === "Ja") {
    if (!n.gebiet) {
      error = "Bitte das Gebiet wählen.";
      draft.fokus = '[data-seg="gebiet"]';
      repaint();
      return;
    }
    if (num(n.umsatz) <= 0) {
      error = "Bitte den Bruttoumsatz eintragen.";
      draft.fokus = "#umsatz";
      repaint();
      return;
    }
    if (!n.k70) {
      error = "Bitte angeben, ob K70 verkauft wurde.";
      draft.fokus = '[data-seg="k70"]';
      repaint();
      return;
    }
    if (n.k70 === "Ja" && num(n.k70betrag) <= 0) {
      error = "Bitte den K70-Betrag eintragen.";
      draft.fokus = "#k70betrag";
      repaint();
      return;
    }
  } else {
    if ((n.besitz || []).length < BESITZ.length && !nkFertig(n)) {
      error = "Bitte kurz eintragen, warum nicht gekauft wurde.";
      draft.fokus = "#potOeffnen";
      repaint();
      return;
    }
  }
  if (urspruenglich && urspruenglich.nb) {
    const u = urspruenglich.nb;
    if (n.verkauft === "Ja") {
      u.verkauft = "Ja";
      u.gebiet = n.gebiet;
      u.einheiten = n.einheiten;
      u.umsatz = n.umsatz;
      u.k70 = n.k70;
      u.k70betrag = n.k70betrag || "";
      u.datiert = "Ja"; // abgerechnet am Tag der Abholung
      u.lieferdatum = draft.day;
      if (n.provVK !== undefined) u.provVK = n.provVK;
      else delete u.provVK;
      if (n.provKT !== undefined) u.provKT = n.provKT;
      else delete u.provKT;
      u.besitz = [];
      u.grund = "";
      const id = [urspruenglich.vorname, urspruenglich.nachname, urspruenglich.str, urspruenglich.plz]
        .map((v) => (v || "").trim().toLowerCase())
        .join("|");
      const i = potenzial.findIndex((x) => x.id === id);
      if (i >= 0) potenzial.splice(i, 1); // doch gekauft – raus aus der Potenzialliste
    } else {
      u.verkauft = "Nein";
      u.besitz = n.besitz || [];
      u.grund = n.grund || "";
      if ((u.besitz || []).length < BESITZ.length) {
        addPotenzial(
          urspruenglich,
          BESITZ.filter((b) => !(u.besitz || []).includes(b)),
          [u.grund, "Gerät war ausgeliehen"].filter(Boolean).join(" · "),
          e.vonTag,
          n.nkgruende,
          n.wvMonat || "",
        );
      }
    }
  } else if (n.verkauft === "Nein" && (n.besitz || []).length < BESITZ.length) {
    addPotenzial(
      e,
      BESITZ.filter((b) => !(n.besitz || []).includes(b)),
      n.grund,
      draft.day,
      n.nkgruende,
      n.wvMonat || "",
    );
  }
  e.status = "nachbereitet";
  e.nb = { ...n };
  /*
   * Der Verkauf steht jetzt im ursprünglichen Kundentermin. Hier nur noch als
   * Hinweis – sonst zählten Einheiten, Umsatz und K70 doppelt.
   */
  if (urspruenglich && urspruenglich.nb && n.verkauft === "Ja") abholNeutralisieren(e.nb);
  closeModal();
  renderAll();
}

/* Nachbereitung für Terminierungen */
function nbTermForm(e) {
  const n = draft.nb;
  const zahlen =
    e.quelle === "Promotion"
      ? [
          ["ansprachen", "Ansprachen"],
          ["gespraeche", "Gespräche"],
          ["termine", "Termine"],
          ["kontakte", "Kontakte"],
        ]
      : [
          ["tueren", "Türen geklingelt"],
          ["erreicht", "Erreicht"],
          ["termine", "Termine"],
          ["rueck", "Rückmeldungstermine"],
        ];
  const promo = e.quelle === "Promotion";
  const erreicht = (+n.termine || 0) + (promo ? +n.kontakte || 0 : 0);
  const zielTxt = e.ziel
    ? `<p class="hinweis" style="margin:0 0 10px">Ziel: <b>${e.ziel} ${promo ? "Termine und Kontakte" : `Termin${e.ziel === 1 ? "" : "e"}`}</b> ·
        aktuell <b>${erreicht}</b>${erreicht >= e.ziel ? " — geschafft" : ` · noch ${e.ziel - erreicht}`}</p>`
    : "";
  return `<div class="h4">Nachbereitung · ${e.quelle}</div>
    ${zielTxt}
    <div class="grp">
      ${zahlen.map(([id, t]) => zaehlZeile(id, t, n[id])).join("")}
      <div class="actions"><button type="button" class="btn primary" id="zaehlStart">${
        n.realStart && !n.realEnde ? `Einsatz fortsetzen · läuft seit ${n.realStart} Uhr` : "Einsatz starten"
      }</button></div>
    </div>
    <div class="h4">Echte Zeiten</div>
    <div class="grp">
      <div class="row2">
        ${fld("realStart", "Gestartet", n.realStart || "", "time", 'step="300"')}
        ${fld("realEnde", "Geendet", n.realEnde || "", "time", 'step="300"')}
      </div>
    </div>
    ${
      e.quelle === "Promotion"
        ? `
    <div class="h4">Verkauf vor Ort</div>
    <div class="grp">
      <div class="sect"><span class="lb">Haben Kunden gekauft?</span>${seg("verkauft", ["Ja", "Nein"], n.verkauft)}</div>
      ${
        n.verkauft === "Ja"
          ? `
        ${zaehlZeile("einheiten", "Einheiten", n.einheiten)}
        <div class="row2">
          ${fld("umsatzFG", "Bruttoumsatz Festgebiet €", n.umsatzFG, "text", 'inputmode="decimal"')}
          ${fld("umsatzWG", "Bruttoumsatz Weißgebiet €", n.umsatzWG, "text", 'inputmode="decimal"')}
        </div>
        ${provHakenHTML(n)}
`
          : ""
      }
    </div>`
        : ""
    }`;
}
function saveNbTerm(e) {
  collect();
  const n = draft.nb;
  if (!n.realStart || !n.realEnde) {
    error = "Bitte echte Start- und Endzeit eintragen.";
    repaint();
    return;
  }
  if (toDec(n.realEnde) <= toDec(n.realStart)) {
    error = "Die Endzeit muss nach der Startzeit liegen.";
    repaint();
    return;
  }
  e.nb = { ...n };
  e.status = "nachbereitet";
  closeModal();
  renderAll();
}

function nbZwischen(e) {
  collect();
  e.nb = { ...draft.nb };
  delete e.status; // bleibt in der Erinnerungsliste
  closeModal();
  renderAll();
}
function saveNb(e) {
  collect();
  const n = draft.nb;
  const fehlt = [];
  const f = (bed, text, sel, block) => {
    if (bed) fehlt.push({ text, sel, block });
  };
  f(!n.kundenstatus, "Kundenart", '[data-seg="kundenstatus"]', "kunde");
  f(!n.gebiet, "Gebiet", '[data-seg="gebiet"]', "kunde");
  f(
    !(n.geraet || "").trim(),
    n.kundenstatus === "Neukunde" ? "aktuelle Marke" : "aktuelles Gerät",
    "#geraet",
    "kunde",
  );
  f(!n.realStart || !n.realEnde, "echte Zeiten", "#realStart", "zeit");
  f(!n.empf, "Empfehlungen gefragt", '[data-seg="empf"]', "gespraech");
  f(
    n.empf === "Ja" && !n.empfErhalten,
    "ob du Empfehlungen bekommen hast",
    '[data-seg="empfErhalten"]',
    "gespraech",
  );
  f(n.empfErhalten === "Ja" && !empfZahl(n), "Namen der Empfehlungen", "#empOeffnen", "gespraech");
  f(!n.job, "Jobticket gefragt", '[data-seg="job"]', "gespraech");
  f(n.kundenstatus !== "Neukunde" && !n.wartung, "Wartungsservice", '[data-seg="wartung"]', "vorfuehrung");
  f(!n.verkauft, "gekauft ja oder nein", '[data-seg="verkauft"]', null);
  f(!n.k70, "K70 aus dem Kofferraum", '[data-seg="k70"]', null);
  f(n.k70 === "Ja" && num(n.k70betrag) <= 0, "Betrag K70", "#k70betrag", null);
  if (n.verkauft === "Ja") {
    f(num(n.umsatz) <= 0, "Bruttoumsatz", "#umsatz", null);
    f(!n.datiert, "späteres Lieferdatum", '[data-seg="datiert"]', null);
  }
  if (n.verkauft === "Nein") {
    f(!n.ausgeliehen, "ob das Gerät ausgeliehen wurde", '[data-seg="ausgeliehen"]', null);
    if (n.ausgeliehen === "Ja") {
      f(!n.abDatum || n.abZeit === undefined, "Datum und Zeit für den Abholtermin", "#abDatum", null);
    } else if (n.ausgeliehen === "Nein") {
      f(
        (n.besitz || []).length < BESITZ.length && !nkFertig(n),
        "Grund für den Nichtkauf",
        "#potOeffnen",
        null,
      );
    }
  }
  if (fehlt.length) {
    error = "Es fehlt noch: " + fehlt.map((x) => x.text).join(", ") + ".";
    ["kunde", "zeit", "gespraech", "vorfuehrung"].forEach((b) => delete draft.nb["_zu_" + b]);
    draft.fokus = fehlt[0].sel;
    repaint();
    return;
  }
  if (n.realStart && n.realEnde && toDec(n.realEnde) <= toDec(n.realStart)) {
    error = "Die Endzeit muss nach der Startzeit liegen.";
    draft.fokus = "#realEnde";
    repaint();
    return;
  }
  if (n.verkauft === "Ja") {
    if (!n.pcDatum || n.pcZeit === undefined) {
      error = "Bitte Datum und Startzeit für den Premium CheckIn wählen.";
      repaint();
      return;
    }
    const k = key(n.pcDatum, +n.pcZeit);
    const vorhanden = entries[k];
    const gleich =
      vorhanden &&
      vorhanden.kind === "premium" &&
      (vorhanden.nachname || "") === (e.nachname || "") &&
      (vorhanden.vorname || "") === (e.vorname || "");
    if (vorhanden && !gleich) {
      error = "Zu diesem Termin steht schon ein anderer Eintrag im Kalender.";
      repaint();
      return;
    }
    entries[k] = {
      ...(vorhanden || {}),
      kind: "premium",
      vorname: e.vorname,
      nachname: e.nachname,
      strasse: e.strasse,
      plz: e.plz,
      ort: e.ort,
      telefon: e.telefon,
    };
  }
  if (n.verkauft === "Nein" && n.ausgeliehen === "Ja") {
    const ka = key(n.abDatum, +n.abZeit);
    const da = entries[ka];
    const passt =
      da &&
      da.kind === "abholen" &&
      (da.nachname || "") === (e.nachname || "") &&
      (da.vorname || "") === (e.vorname || "");
    if (da && !passt) {
      error = "Zum Abholtermin steht schon ein anderer Eintrag im Kalender.";
      repaint();
      return;
    }
    entries[ka] = {
      ...(da || {}),
      kind: "abholen",
      vorname: e.vorname,
      nachname: e.nachname,
      strasse: e.strasse,
      plz: e.plz,
      ort: e.ort,
      telefon: e.telefon,
      quelle: e.quelle,
      vonTag: draft.day,
      vonStunde: draft.hour,
    };
  }
  /*
   * Bei ausgeliehenem Gerät ist noch nichts entschieden – die Potenzialliste
   * wird erst beim Abholtermin gefüllt, falls es dann ein Nein wird.
   */
  if (n.verkauft === "Nein" && n.ausgeliehen !== "Ja" && (n.besitz || []).length < BESITZ.length) {
    addPotenzial(
      e,
      BESITZ.filter((b) => !(n.besitz || []).includes(b)),
      n.grund,
      draft.day,
      n.nkgruende,
      n.wvMonat || "",
    );
  }
  if (n.empf === "Ja" && n.empfErhalten !== "Nein")
    (n.empfListe || []).forEach((x) => {
      if (!(x.nach || "").trim()) return;
      const rec = {
        id: [x.vor, x.nach, x.str, x.plz].map((v) => (v || "").trim().toLowerCase()).join("|"),
        vorname: x.vor || "",
        nachname: x.nach || "",
        strasse: [x.str, x.hnr].filter(Boolean).join(" "),
        str: x.str || "",
        hnr: x.hnr || "",
        plz: x.plz || "",
        ort: x.ort || "",
        telefon: x.tel || "",
        notiz: x.notiz || "",
        von: `${e.vorname || ""} ${e.nachname || ""}`.trim(),
        datum: draft.day,
      };
      const i = empfehlungen.findIndex((y) => y.id === rec.id);
      if (i >= 0) empfehlungen[i] = rec;
      else empfehlungen.push(rec);
    });
  wvSetzen(e, n.wvMonat || "", [...(n.nkgruende || []), n.grund || ""].filter(Boolean).join(" · "));
  e.status = "stattgefunden";
  e.nb = { ...n };
  closeModal();
  renderAll();
}
