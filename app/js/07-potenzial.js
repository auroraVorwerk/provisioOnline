/**
 * Potenzialliste
 *
 * Kunden mit Kaufpotenzial, Empfehlungen und deren Pflege.
 */
/*
 * Erkennt denselben Kunden unabhängig von Groß- und Kleinschreibung,
 * doppelten Leerzeichen und Punkten in der Straße ("Dorfstr." = "dorfstr")
 */
const norm = (x) => (x || "").toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
/* Reicht das, was zum Kein-Kauf erfasst wurde? */
const nkFertig = (n) => {
  const has = n.besitz || [];
  return has.length >= BESITZ.length || !!(n.nkgruende || []).length || !!(n.grund || "").trim();
};
/* Alle Gründe eines Eintrags in einer Zeile - für Suche und Anzeige */
const nkText = (x) => [...(x.gruende || []), x.grund || ""].join(" ");
const pid = (e) => [e.vorname, e.nachname, e.strasse, e.plz, e.ort].map(norm).join("|");

/*
 * ---------- Wiedervorlage ----------
 * Gemeinsamer Speicher für alles, was erneut angesprochen werden soll
 * (Kein-Kauf-Fenster, Nachbereitung, Kundenliste).
 */
const wvId = (p) => kundeId(p);
const wvHolen = (p) => wiedervorlagen.find((w) => w.id === wvId(p));
function wvSetzen(p, monat, notiz) {
  const id = wvId(p);
  const i = wiedervorlagen.findIndex((w) => w.id === id);
  if (!monat) {
    if (i >= 0) wiedervorlagen.splice(i, 1);
    return;
  }
  const tag = istTagWert(monat) ? monat : ""; // fester Tag möglich
  monat = String(monat).slice(0, 7);
  const rec = {
    id,
    vorname: p.vorname || "",
    nachname: p.nachname || "",
    str: p.str || "",
    hnr: p.hnr || "",
    strasse: p.strasse || [p.str, p.hnr].filter(Boolean).join(" "),
    plz: p.plz || "",
    ort: p.ort || "",
    telefon: p.telefon || "",
    monat,
    notiz: (notiz || "").trim(),
    erstellt: dk(new Date()),
  };
  if (tag) rec.tag = tag;
  if (i >= 0) {
    const neu = { ...wiedervorlagen[i], ...rec };
    if (!tag) delete neu.tag;
    wiedervorlagen[i] = neu;
  } else wiedervorlagen.push(rec);
}
function wvLoeschen(id) {
  const i = wiedervorlagen.findIndex((w) => w.id === id);
  if (i >= 0) wiedervorlagen.splice(i, 1);
}
/* Alte Einträge mit taggenauem Datum einmalig auf Monate umstellen */
function wvUmstellen() {
  potenzial.forEach((p) => {
    if (p.wieder) {
      if (!wvHolen(p)) wvSetzen(p, alsMonat(p.wieder), p.grund);
      delete p.wieder;
    }
  });
}
function addPotenzial(e, offen, grund, datum, gruende, monat) {
  const id = pid(e);
  const rec = {
    id,
    vorname: e.vorname,
    nachname: e.nachname,
    strasse: e.strasse,
    str: e.str,
    hnr: e.hnr,
    plz: e.plz,
    ort: e.ort,
    telefon: e.telefon,
    letzterBesuch: datum,
    potenzial: offen,
    grund: grund,
    gruende: (gruende || []).slice(),
  };
  const i = potenzial.findIndex((p) => p.id === id);
  if (i >= 0) potenzial[i] = { ...potenzial[i], ...rec };
  else potenzial.push(rec);
  if (monat !== undefined) wvSetzen(rec, monat, grund);
}
/* Aus einem Potenzialeintrag direkt einen Kundentermin anlegen */
function terminAusPotenzial(p, quelle) {
  simpleDialog(
    "Termin anlegen",
    `${p.vorname} ${p.nachname}`,
    `<div class="grp">
       ${fld("ptDatum", "Datum", dk(new Date()), "date")}
       <div class="field"><label for="ptZeit">Startzeit</label>${hourSelect("ptZeit", 13)}</div>
       <div class="field"><label for="ptQuelle">Quelle</label>
         <select id="ptQuelle">${QUELLEN.map((q) => `<option value="${q}" ${quelle === q ? "selected" : ""}>${q}</option>`).join("")}</select></div>
     </div>
     <p class="err" id="ptErr" hidden></p>`,
    () => {
      const err = document.getElementById("ptErr");
      const tag = document.getElementById("ptDatum").value;
      const std = +document.getElementById("ptZeit").value;
      if (!tag) {
        err.textContent = "Bitte ein Datum wählen.";
        err.hidden = false;
        return;
      }
      if (entries[key(tag, std)]) {
        err.textContent = "Auf diesem Platz steht schon ein Eintrag.";
        err.hidden = false;
        return;
      }
      entries[key(tag, std)] = {
        kind: "kunde",
        quelle: document.getElementById("ptQuelle").value,
        vorname: p.vorname,
        nachname: p.nachname,
        strasse: p.strasse || "",
        plz: p.plz || "",
        ort: p.ort || "",
        telefon: p.telefon || "",
        str: p.str || "",
        hnr: p.hnr || "",
        notiz: p.notiz || "",
      };
      const i = empfehlungen.findIndex((x) => x.id === p.id); // aus der Empfehlungsliste entfernen
      if (i >= 0) empfehlungen.splice(i, 1);
      const j = interessenten.findIndex((x) => x.id === p.id); // aus den Interessenten entfernen
      if (j >= 0) interessenten.splice(j, 1);
      wvLoeschen(wvId(p)); // Potenzialeintrag bleibt, Wiedervorlage entfällt
      closeModal();
      renderAll();
    },
    "Termin eintragen",
  );
}
/* Schlichte Tabelle im Querformat, aufsteigend nach letztem Termin */
function potDrucken(liste, wer) {
  const zeilen = liste.slice().sort((a, b) => (a.letzterBesuch || "").localeCompare(b.letzterBesuch || ""));
  document.getElementById("druckPot").innerHTML = `
    <h1>Potenzialliste${wer ? " · " + wer : ""}</h1>
    <p class="dsub">${zeilen.length} Einträge · Stand ${fmt(new Date())}</p>
    <table class="pdruck">
      <thead><tr>
        <th>Vorname</th><th>Nachname</th><th>Potenzial auf</th><th>Letzter Termin</th>
        <th>Telefon</th><th>Adresse</th><th>Warum nicht gekauft</th>
      </tr></thead>
      <tbody>${zeilen
        .map(
          (p) => `<tr>
        <td>${p.vorname || ""}</td>
        <td>${p.nachname || ""}</td>
        <td>${(p.potenzial || []).join(", ")}</td>
        <td>${p.letzterBesuch ? fmt(fromDk(p.letzterBesuch)) : ""}</td>
        <td>${p.telefon || ""}</td>
        <td>${[p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</td>
        <td>${[...(p.gruende || []), p.grund || ""].filter(Boolean).join(" · ")}</td>
      </tr>`,
        )
        .join("")}</tbody>
    </table>`;
  druckTitel = "Potenzialliste" + (wer ? " · " + wer : "");
  druckStarten("drucke-pot");
}
function empfNeu() {
  const leer = {
    id: "",
    vorname: "",
    nachname: "",
    str: "",
    hnr: "",
    plz: "",
    ort: "",
    telefon: "",
    notiz: "",
    von: "",
    datum: dk(new Date()),
  };
  kontaktBearbeiten(leer, empfehlungen, false, true);
}
function renderEmpfehlung() {
  const el = document.getElementById("elist");
  if (!el) return;
  const knopf = `<div class="asec"><div class="actions"><button class="btn primary" id="empNeu">Empfehlung hinzufügen</button></div></div>`;
  if (!empfehlungen.length) {
    el.innerHTML =
      knopf +
      `<div class="placeholder">Noch keine Empfehlungen. Sie erscheinen hier automatisch aus der Nachbereitung — oder du trägst sie oben von Hand ein.</div>`;
    document.getElementById("empNeu").onclick = empfNeu;
    return;
  }
  el.innerHTML =
    knopf +
    `<div class="plist">` +
    empfehlungen
      .slice()
      .sort((a, b) => (b.datum || "").localeCompare(a.datum || ""))
      .map(
        (p) => `
    <div class="pcard">
      <div class="nm">${p.vorname} ${p.nachname}</div>
      <div class="meta">${[p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</div>
      <div class="meta">${p.telefon ? p.telefon + " · " : ""}${p.von ? "empfohlen von " + p.von + " · " : ""}${p.datum ? fmt(fromDk(p.datum)) : ""}</div>
      ${p.notiz ? `<div class="why">${p.notiz}</div>` : ""}
      ${(() => {
        const eigene = empfehlungen.filter(
          (x) => x.von && x.von.toLowerCase() === `${p.vorname} ${p.nachname}`.trim().toLowerCase(),
        );
        return eigene.length
          ? `<div class="pot">${eigene.map((x) => `<span>empfahl ${x.vorname} ${x.nachname}</span>`).join("")}</div>`
          : "";
      })()}
      <div class="pact">
        <button class="btn" data-etermin="${p.id}">Termin anlegen</button>
        <button class="btn" data-eedit="${p.id}">Bearbeiten</button>
        <button class="btn danger" data-edel="${p.id}">Löschen</button>
      </div>
    </div>`,
      )
      .join("") +
    `</div>`;
  document.getElementById("empNeu").onclick = empfNeu;
  el.querySelectorAll("[data-edel]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = empfehlungen.findIndex((x) => x.id === b.dataset.edel);
        if (i >= 0) empfehlungen.splice(i, 1);
        renderAll();
      }),
  );
  el.querySelectorAll("[data-etermin]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = empfehlungen.find((x) => x.id === b.dataset.etermin);
        if (p) terminAusPotenzial(p, "Empfehlung");
      }),
  );
  el.querySelectorAll("[data-eedit]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = empfehlungen.find((x) => x.id === b.dataset.eedit);
        if (p) kontaktBearbeiten(p, empfehlungen, false);
      }),
  );
}
/* Kundendaten, Notiz und bei der Potenzialliste auch die Geräte ändern */
function kontaktBearbeiten(p, liste, mitGeraeten, istNeu) {
  const istInt = liste === interessenten;
  simpleDialog(
    istNeu
      ? mitGeraeten
        ? "Person hinzufügen"
        : istInt
          ? "Interessent hinzufügen"
          : "Empfehlung hinzufügen"
      : "Eintrag bearbeiten",
    istNeu ? "" : `${p.vorname} ${p.nachname}`,
    `<div class="grp">
       <div class="row2">
         <div class="field"><label>Vorname</label><input id="kbVor" value="${p.vorname || ""}"></div>
         <div class="field"><label>Nachname</label><input id="kbNach" value="${p.nachname || ""}"></div>
       </div>
       <div class="row2 strassenr">
         <div class="field vorschlagfeld" style="flex:1 1 65%"><label>Straße</label>
           <input id="kb_str" data-adr="kb" value="${p.str || p.strasse || ""}" autocomplete="off">
           <div class="vorschlaege" id="kb_vorschlaege" hidden></div></div>
         <div class="field" style="flex:0 0 32%"><label>Nr.</label><input id="kb_hnr" value="${p.hnr || ""}" inputmode="text" autocapitalize="off" spellcheck="false" placeholder="5b"></div>
       </div>
       <div class="row2">
         <div class="field" style="flex:0 0 42%"><label>PLZ</label><input id="kb_plz" value="${p.plz || ""}" inputmode="numeric" maxlength="5"></div>
         <div class="field"><label>Ort</label><input id="kb_ort" value="${p.ort || ""}"></div>
       </div>
       <div class="field"><label>Telefon</label><input id="kbTel" type="tel" inputmode="tel" value="${p.telefon || ""}"></div>
       ${mitGeraeten || istInt ? "" : `<div class="field"><label>Empfohlen von</label><input id="kbVon" value="${p.von || ""}" placeholder="Name des Kunden"></div>`}
       ${
         mitGeraeten
           ? `<div class="sect"><span class="lb">Offenes Potenzial — was fehlt dem Kunden noch?</span>
         <div class="checks stack" id="kbPot">${BESITZ.map(
           (g) =>
             `<button type="button" data-kbpot="${g}" aria-pressed="${(p.potenzial || []).includes(g)}">${g}</button>`,
         ).join("")}</div>
         </div>`
           : ""
       }
       ${
         mitGeraeten
           ? `<div class="sect"><span class="lb">Top „Nicht kauf“ Gründe</span>
         <div class="checks gruende2" id="kbGrd">${NK_GRUENDE.map(
           (g) =>
             `<button type="button" data-kbgrd="${g}" aria-pressed="${(p.gruende || []).includes(g)}">${g}</button>`,
         ).join("")}</div>
         </div>`
           : ""
       }
       ${wvFeld("kbWieder", wvWert(wvHolen(p)), "Wieder ansprechen")}
       <div class="field"><label>Notiz</label><textarea id="kbNotiz" style="min-height:70px">${p.notiz || p.grund || ""}</textarea></div>
     </div>
     <p class="err" id="kbErr" hidden></p>`,
    () => {
      const w = (id) => (document.getElementById(id) || { value: "" }).value.trim();
      p.vorname = w("kbVor");
      p.nachname = w("kbNach");
      p.str = w("kb_str");
      p.hnr = w("kb_hnr");
      p.strasse = [p.str, p.hnr].filter(Boolean).join(" ");
      p.plz = w("kb_plz");
      p.ort = w("kb_ort");
      p.telefon = w("kbTel");
      if (mitGeraeten) {
        p.potenzial = [...document.querySelectorAll('[data-kbpot][aria-pressed="true"]')].map(
          (b) => b.dataset.kbpot,
        );
        p.gruende = [...document.querySelectorAll('[data-kbgrd][aria-pressed="true"]')].map(
          (b) => b.dataset.kbgrd,
        );
        p.grund = w("kbNotiz");
      } else p.notiz = w("kbNotiz");
      delete p.wieder;
      if (!mitGeraeten && document.getElementById("kbVon")) p.von = w("kbVon");
      if (istNeu) {
        if (!p.nachname) {
          const e = document.getElementById("kbErr");
          if (e) {
            e.textContent = "Ohne Nachnamen geht es nicht.";
            e.hidden = false;
          }
          return;
        }
        p.id = [p.vorname, p.nachname, p.str, p.plz].map((v) => (v || "").trim().toLowerCase()).join("|");
        if (!p.datum) p.datum = dk(new Date());
        if (!liste.some((x) => x.id === p.id)) liste.push(p);
      }
      wvSetzen(p, w("kbWieder"), p.grund || p.notiz);
      closeModal();
      renderAll();
    },
    "Speichern",
  );
  sheet
    .querySelectorAll("[data-kbpot],[data-kbgrd]")
    .forEach(
      (b) => (b.onclick = () => b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true")),
    );
}
var potSuche = "",
  potFilter = "";
/* Karte eines Potenzialeintrags - der Farbstreifen zeigt den ersten Grund */
function potKarte(p) {
  const wv = wvHolen(p);
  const jetzt = monatJetzt();
  const gr = p.gruende || [];
  const farbe = gr.length ? grundFarbe(gr[0]) : "";
  return `<div class="pcard${farbe ? " gstreif" : ""}${wvFaellig(wv) ? " faellig" : ""}"
      ${farbe ? `style="--gf:${farbe}"` : ""}>
      <div class="nm">${p.vorname} ${p.nachname}${
        wv ? `<span class="wieder">${wvFaellig(wv) ? "fällig" : wvKurz(wv)}</span>` : ""
      }</div>
      <div class="meta">${[p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</div>
      <div class="meta">${p.telefon ? p.telefon + " · " : ""}${
        p.letzterBesuch
          ? "Letzter Besuch: " + fmt(fromDk(p.letzterBesuch))
          : "Von Hand angelegt" + (p.datum ? " am " + fmt(fromDk(p.datum)) : "")
      }</div>
      <div class="pot">${(p.potenzial || []).map((x) => `<span>${x}</span>`).join("")}</div>
      ${
        gr.length
          ? `<div class="gchips">${gr
              .map((g) => `<span style="--gc:${grundFarbe(g)}">${g}</span>`)
              .join("")}</div>`
          : ""
      }
      ${p.grund ? `<div class="why">${p.grund}</div>` : ""}
      <div class="pact">
        <button class="btn" data-ptermin="${p.id}">Termin anlegen</button>
        <button class="btn" data-pedit="${p.id}">Bearbeiten</button>
        <button class="btn danger" data-pdel="${p.id}">Löschen</button>
      </div>
    </div>`;
}
function renderPotenzial() {
  const el = document.getElementById("plist");
  const neuKnopf = `<div class="asec"><div class="actions">
    <button class="btn primary" id="potNeu">Person hinzufügen</button></div></div>`;
  const verdrahten = () => {
    const b = document.getElementById("potNeu");
    if (b)
      b.onclick = () =>
        kontaktBearbeiten({ potenzial: [...BESITZ], datum: dk(new Date()) }, potenzial, true, true);
  };
  if (!potenzial.length) {
    el.innerHTML =
      neuKnopf +
      leerbox(
        "liste",
        "Hier steht noch niemand",
        "Kunden landen automatisch hier, sobald ein Termin ohne Kauf nachbereitet wird.",
      );
    verdrahten();
    return;
  }
  const jetzt = monatJetzt();
  const q = potSuche.trim().toLowerCase();
  const gefiltert = potenzial.filter((p) => {
    if (potFilter && !(p.gruende || []).includes(potFilter)) return false;
    if (!q) return true;
    return [p.vorname, p.nachname, p.ort, p.strasse, p.telefon, nkText(p)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  const wvM = (p) => wvSort(wvHolen(p));
  const rang = (p) => {
    const w = wvHolen(p);
    return w ? (wvFaellig(w) ? 0 : 1) : 2;
  };
  /* In der Teamansicht wird die Liste nur abgebildet - dort wäre eine Suche ohne Funktion */
  const suchfeld = fremdAktiv
    ? ""
    : `
    <div class="asec">
      <div class="field"><input id="potSuche" value="${potSuche}"
        placeholder="Nach Grund, Zusatzinfo, Name oder Ort suchen" autocomplete="off" inputmode="search"></div>
      <div class="filterchips">
        <button type="button" data-pgf="" aria-pressed="${!potFilter}">Alle</button>
        ${NK_GRUENDE.map(
          (g) => `<button type="button" data-pgf="${g}" aria-pressed="${potFilter === g}"
          style="border-left:4px solid ${grundFarbe(g)}">${g}</button>`,
        ).join("")}
      </div>
      <p class="hinweis">${gefiltert.length} von ${potenzial.length} Einträgen${
        potFilter || potSuche ? " · der Druckknopf unten nimmt genau diese Auswahl" : ""
      }</p>
    </div>`;
  el.innerHTML =
    neuKnopf +
    suchfeld +
    (gefiltert.length
      ? `<div class="plist">` +
        gefiltert
          .slice()
          .sort(
            (a, b) =>
              rang(a) - rang(b) ||
              (rang(a) === 2
                ? (b.letzterBesuch || b.datum || "").localeCompare(a.letzterBesuch || a.datum || "")
                : wvM(a).localeCompare(wvM(b))),
          )
          .map(potKarte)
          .join("") +
        `</div>`
      : `<div class="asec"><p class="aempty">Kein Eintrag passt zu dieser Suche.</p></div>`);
  el.insertAdjacentHTML(
    "beforeend",
    `<div class="asec"><div class="actions"><button class="btn" id="potDruck">Potenzialliste drucken</button></div></div>`,
  );
  const feld = document.getElementById("potSuche");
  if (feld)
    feld.oninput = () => {
      potSuche = feld.value;
      potListeNeu();
    };
  el.querySelectorAll("[data-pgf]").forEach(
    (b) =>
      (b.onclick = () => {
        potFilter = b.dataset.pgf;
        renderPotenzial();
      }),
  );
  document.getElementById("potDruck").onclick = () =>
    potDrucken(gefiltert, me ? `${me.vorname} ${me.nachname}` : "");
  el.querySelectorAll("[data-pdel]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = potenzial.findIndex((x) => x.id === b.dataset.pdel);
        if (i >= 0) {
          wvLoeschen(wvId(potenzial[i]));
          potenzial.splice(i, 1);
        }
        renderAll();
      }),
  );
  el.querySelectorAll("[data-ptermin]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = potenzial.find((x) => x.id === b.dataset.ptermin);
        if (p) terminAusPotenzial(p);
      }),
  );
  el.querySelectorAll("[data-pedit]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = potenzial.find((x) => x.id === b.dataset.pedit);
        if (p) kontaktBearbeiten(p, potenzial, true);
      }),
  );
  verdrahten(); // gilt auch für die gefüllte Liste
}
