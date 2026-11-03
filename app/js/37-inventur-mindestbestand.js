/**
 * Inventur – Mindestbestand
 *
 * Ergänzt renderInventur() aus 22-inventur.js um den Filter "Nur Vorhandene".
 * Mindestbestände und Nachbestellliste gibt es seit Beta 1.1 nicht mehr.
 * Speicherung in settings.invMin und settings.invNurDa.
 */

let invMinBearbeiten = false;

function invMin() {
  return settings.invMin || (settings.invMin = {});
}

function invNachbestellen() {
  const liste = [];
  const min = invMin();
  (katalog.liste || []).forEach((k) =>
    (k.artikel || []).forEach((a) => {
      const id = artKey(k.kat + "|" + a.n);
      const soll = +min[id] || 0;
      if (!soll) return;
      const ist = +inventur[id] || 0;
      if (ist < soll) liste.push({ kat: k.kat, n: a.n, p: +a.p || 0, ist, soll, fehlt: soll - ist });
    }),
  );
  return liste;
}

const renderInventurAlt = renderInventur;
renderInventur = function () {
  renderInventurAlt();
  const box = document.getElementById("inventur");
  if (!box || !me) return;
  const min = invMin();
  const nurDa = !!settings.invNurDa;
  const fehlt = invNachbestellen();

  /* Bedienleiste unter der Suche */
  const kopf = box.querySelector(".asec");
  if (kopf && !kopf.querySelector(".invextra")) {
    const leiste = document.createElement("div");
    leiste.className = "invextra";
    leiste.innerHTML = `
      <div class="invschalter" role="group" aria-label="Ansicht">
        <button type="button" data-invda="0" aria-pressed="${!nurDa}">Alles zeigen</button>
        <button type="button" data-invda="1" aria-pressed="${nurDa}">Nur Vorhandene</button>
      </div>
`;
    const nach = kopf.querySelector("#invTreffer") || kopf.lastElementChild;
    nach.insertAdjacentElement("afterend", leiste);
  }

  /* Jede Zeile: Mindestbestand anzeigen oder setzen */
  box.querySelectorAll(".invzeile").forEach((z) => {
    const m = z.querySelector("[data-menge]");
    if (!m) return;
    const id = m.dataset.menge;
    const soll = +min[id] || 0;
    const ist = +inventur[id] || 0;
    z.dataset.ist = ist;
  });

  /* Bedienung */
  box.querySelectorAll("[data-invda]").forEach(
    (b) =>
      (b.onclick = () => {
        settings.invNurDa = b.dataset.invda === "1";
        saveData();
        invNeuZeichnen();
      }),
  );
  invFiltern();
};

/* Die Suche blendet Zeilen ein und aus – „Nur Vorhandene" muss danach greifen */
const invFilternAlt = invFiltern;
invFiltern = function () {
  invFilternAlt();
  if (!settings.invNurDa) return;
  const box = document.getElementById("invliste");
  if (!box) return;
  box.querySelectorAll(".invzeile").forEach((z) => {
    const m = z.querySelector("[data-menge]");
    const ist = m ? +inventur[m.dataset.menge] || 0 : 0;
    if (!ist) z.hidden = true;
  });
  /* Kategorien ohne sichtbare Artikel ganz ausblenden */
  box.querySelectorAll(".invgruppe").forEach((gr) => {
    const sichtbar = [...gr.querySelectorAll(".invzeile")].some((z) => !z.hidden);
    gr.hidden = !sichtbar;
    const kopf = box.querySelector(`[data-katzu="${gr.dataset.gruppe}"]`);
    if (kopf) kopf.hidden = !sichtbar;
  });
};
