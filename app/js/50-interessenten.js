/**
 * Interessenten
 *
 * Beim Terminieren gemerkte Kontakte mit eigener Seite: anrufen, Termin anlegen,
 * bearbeiten, löschen. Wird ein Termin daraus, verschwindet der Eintrag.
 */
PAGES.interessenten = "Interessenten";
IC.interessenten =
  '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c0-3.8 3-6.2 6.5-6.2 1.2 0 2.3.3 3.3.8"/><path d="M17.5 13.5v7M14 17h7"/>';
(function () {
  const i = MENUE.findIndex((m) => m[0] === "empfehlung");
  if (!MENUE.some((m) => m[0] === "interessenten"))
    MENUE.splice(i >= 0 ? i + 1 : MENUE.length, 0, ["interessenten", "Interessenten"]);
})();

function interessentNeu() {
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
    datum: dk(new Date()),
  };
  kontaktBearbeiten(leer, interessenten, false, true);
}

function renderInteressenten() {
  const el = document.getElementById("intliste");
  if (!el) return;
  const knopf = `<div class="asec"><div class="actions"><button class="btn primary" id="intNeu">Interessent hinzufügen</button></div></div>`;
  if (!interessenten.length) {
    el.innerHTML =
      knopf +
      leerbox(
        "liste",
        "Noch niemand gemerkt",
        "Beim Terminieren tippst du auf „Kontakt merken“ – die Person steht dann hier.",
      );
    document.getElementById("intNeu").onclick = interessentNeu;
    return;
  }
  const liste = interessenten.slice().sort((a, b) => {
    const wa = wvHolen(a),
      wb = wvHolen(b);
    const ra = wa ? (wvFaellig(wa) ? 0 : 1) : 2,
      rb = wb ? (wvFaellig(wb) ? 0 : 1) : 2;
    return ra - rb || (b.datum || "").localeCompare(a.datum || "");
  });
  el.innerHTML =
    knopf +
    `<div class="plist">` +
    liste
      .map((p) => {
        const wv = wvHolen(p);
        const adr = [p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
        const herkunft = [p.quelle, p.datum ? fmt(fromDk(p.datum)) : ""].filter(Boolean).join(" · ");
        return `<div class="pcard${wvFaellig(wv) ? " faellig" : ""}">
      <div class="nm">${p.vorname || ""} ${p.nachname || ""}${wv ? `<span class="wieder">${wvFaellig(wv) ? "fällig" : wvKurz(wv)}</span>` : ""}</div>
      ${adr ? `<div class="meta">${adr}</div>` : ""}
      <div class="meta">${[p.telefon, herkunft].filter(Boolean).join(" · ")}</div>
      ${p.notiz ? `<div class="why">${p.notiz}</div>` : ""}
      <div class="pact">
        ${p.telefon ? `<a class="btn" href="${telLink(p.telefon)}">Anrufen</a>` : ""}
        <button class="btn" data-itermin="${p.id}">Termin anlegen</button>
        <button class="btn" data-iedit="${p.id}">Bearbeiten</button>
        <button class="btn danger" data-idel="${p.id}">Löschen</button>
      </div>
    </div>`;
      })
      .join("") +
    `</div>`;
  document.getElementById("intNeu").onclick = interessentNeu;
  el.querySelectorAll("[data-idel]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = interessenten.findIndex((x) => x.id === b.dataset.idel);
        if (i >= 0) {
          wvLoeschen(wvId(interessenten[i]));
          interessenten.splice(i, 1);
        }
        renderAll();
      }),
  );
  el.querySelectorAll("[data-itermin]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = interessenten.find((x) => x.id === b.dataset.itermin);
        if (p) terminAusPotenzial(p, QUELLEN.includes(p.quelle) ? p.quelle : "Festgebietsbegehung");
      }),
  );
  el.querySelectorAll("[data-iedit]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = interessenten.find((x) => x.id === b.dataset.iedit);
        if (p) kontaktBearbeiten(p, interessenten, false);
      }),
  );
}

(function () {
  const showVor = show;
  show = function (k) {
    showVor(k);
    if (document.body.dataset.page === "interessenten")
      try {
        renderInteressenten();
      } catch (e) {
        console.error(e);
      }
  };
  const renderAllVor = renderAll;
  renderAll = function () {
    const r = renderAllVor.apply(this, arguments);
    try {
      renderInteressenten();
    } catch (e) {
      console.error("Interessenten:", e);
    }
    return r;
  };
})();
