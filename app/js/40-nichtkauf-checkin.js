/**
 * Nichtkauf-Gründe und Premium CheckIn
 *
 * Die zehn Nichtkauf-Gründe sowie Gäste und Empfehlungen beim Premium CheckIn.
 */

/* ---------- 1 · Gründe ---------- */
const NK_LISTE = [
  ["keine Zinsen", "#F2B33D"],
  ["passt finanziell aktuell nicht", "#E0402F"],
  ["2. Akku gratis", "#77CDF5"],
  ["will „alt gegen neu“", "#E8C4F2"],
  ["muss mit Partner sprechen", "#9A6CE8"],
  ["muss nochmal überlegen", "#8FBF9F"],
  ["sieht keinen Bedarf", "#9FB4E8"],
  ["wenn vorhandenes Gerät kaputt geht", "#6FC3A0"],
  ["wartet auf den Nachfolger", "#D8C48A"],
];
/* Frühere Bezeichnungen – werden beim Laden umbenannt (siehe 62-beta11.js) */
const NK_UMBENANNT = { "will 0 %": "keine Zinsen", "will 2. Akku": "2. Akku gratis" };
NK_FARBE["wartet auf Urlaubsgeld"] = "#A9D18E";
NK_GRUENDE.splice(0, NK_GRUENDE.length, ...NK_LISTE.map((x) => x[0]));
NK_LISTE.forEach(([g, c]) => {
  NK_FARBE[g] = c;
});

/* ---------- 2 · Premium CheckIn: Gäste und Empfehlungen ---------- */
const nbPremiumFormOhneGaeste = nbPremiumForm;
nbPremiumForm = function () {
  const n = draft.nb;
  let h = nbPremiumFormOhneGaeste();
  const block = `<div class="h4">Gäste</div>
    <div class="grp">
      ${zaehlZeile("gaeste", "Wie viele Gäste waren dabei?", n.gaeste)}
      <div class="sect"><span class="lb">Empfehlungen von den Gästen bekommen?</span>${seg(
        "empfErhalten",
        ["Ja", "Nein"],
        n.empfErhalten,
      )}</div>
      ${
        n.empfErhalten === "Ja"
          ? `<div class="actions"><button type="button" class="btn" id="empOeffnen">
        ${empfZahl(n)} ${empfZahl(n) === 1 ? "Empfehlung" : "Empfehlungen"} erfasst — eintragen</button></div>`
          : `<p class="hinweis" style="margin:0">Waren Gäste dabei und hast du Empfehlungen bekommen, trag sie hier ein.</p>`
      }
    </div>`;
  /* Der Block kommt vor den Abschluss, also ans Ende der Nachbereitung */
  return h + block;
};

/* Beim Speichern die Empfehlungen übernehmen – wie beim Kundentermin */
const saveNbPremiumOhneEmpf = saveNbPremium;
saveNbPremium = function (e) {
  collect();
  const n = draft.nb;
  if ((+n.gaeste || 0) > 0 && n.empfErhalten === "Ja") {
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
    n.empf = "Ja"; // zählt in Wochenmeldung und Auswertung mit
  }
  return saveNbPremiumOhneEmpf(e);
};
