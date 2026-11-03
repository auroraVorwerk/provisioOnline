/**
 * Wiedervorlage
 *
 * Erinnerungsliste nach Monat oder festem Tag.
 */
/* Alles, was noch einmal angesprochen werden soll — das Naheliegendste steht oben. */
function renderWiedervorlage() {
  const el = document.getElementById("wvliste");
  if (!el) return;
  const jetzt = monatJetzt();
  const liste = wiedervorlagen
    .slice()
    .sort((a, b) => wvSort(a).localeCompare(wvSort(b)) || (a.nachname || "").localeCompare(b.nachname || ""));
  const heuteT = dk(new Date());
  if (!liste.length) {
    el.innerHTML = leerbox(
      "uhr",
      "Noch nichts vorgemerkt",
      "Du setzt eine Wiedervorlage im Kein-Kauf-Fenster, unten in der Nachbereitung oder direkt aus der Kundenliste.",
      "Kundenliste öffnen",
      "kunden",
    );
    return;
  }
  const gruppen = [
    ["Überfällig", liste.filter((w) => (w.tag ? w.tag < heuteT : w.monat < jetzt))],
    ["Heute", liste.filter((w) => w.tag === heuteT)],
    ["Diesen Monat", liste.filter((w) => (w.tag ? w.tag > heuteT && w.monat === jetzt : w.monat === jetzt))],
    ["Später", liste.filter((w) => w.monat > jetzt)],
  ].filter((g) => g[1].length);

  const karte = (w) => {
    const adr = [w.strasse, [w.plz, w.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const pot = potenzial.find((x) => wvId(x) === w.id);
    const gr = (pot && pot.gruende) || [];
    const farbe = gr.length ? grundFarbe(gr[0]) : "";
    return `<div class="pcard${farbe ? " gstreif" : ""}${wvFaellig(w) ? " faellig" : ""}"
        ${farbe ? `style="--gf:${farbe}"` : ""}>
      <div class="nm">${w.vorname} ${w.nachname}
        <span class="wieder">${wvText(w)}</span></div>
      <div class="meta">${adr || "keine Adresse hinterlegt"}</div>
      ${w.telefon ? `<div class="meta">${w.telefon}</div>` : ""}
      ${
        gr.length
          ? `<div class="gchips">${gr
              .map((g) => `<span style="--gc:${grundFarbe(g)}">${g}</span>`)
              .join("")}</div>`
          : ""
      }
      ${w.notiz ? `<div class="why">${w.notiz}</div>` : ""}
      <div class="pact">
        ${w.telefon ? `<a class="btn" href="${telLink(w.telefon)}">Anrufen</a>` : ""}
        ${adr ? `<a class="btn" href="${mapsLink(adr)}" target="_blank" rel="noopener">Route</a>` : ""}
        <button class="btn" data-wvtermin="${w.id}">Termin anlegen</button>
        <button class="btn" data-wvedit="${w.id}">Verschieben</button>
        <button class="btn danger" data-wvweg="${w.id}">Erledigt</button>
      </div>
    </div>`;
  };

  el.innerHTML =
    `<div class="asec">
      <h3>Wiedervorlage</h3>
      <p class="sub">${liste.length} offen · das nächstliegende Datum steht oben.</p>
    </div>` +
    gruppen
      .map(
        ([titel, ws]) => `<div class="wvgruppe"><h4>${titel} · ${ws.length}</h4>
      <div class="plist">${ws.map(karte).join("")}</div></div>`,
      )
      .join("");

  el.querySelectorAll("[data-wvweg]").forEach(
    (b) =>
      (b.onclick = () => {
        wvLoeschen(b.dataset.wvweg);
        renderAll();
      }),
  );
  el.querySelectorAll("[data-wvedit]").forEach(
    (b) =>
      (b.onclick = () => {
        const w = wiedervorlagen.find((x) => x.id === b.dataset.wvedit);
        if (w) wvDialog(w, `${w.vorname} ${w.nachname}`.trim());
      }),
  );
  el.querySelectorAll("[data-wvtermin]").forEach(
    (b) =>
      (b.onclick = () => {
        const w = wiedervorlagen.find((x) => x.id === b.dataset.wvtermin);
        if (w) terminAusPotenzial(w, "Vertriebsadresse");
      }),
  );
}
/* Kleines Fenster zum Setzen oder Ändern einer Wiedervorlage */
function wvDialog(person, titel) {
  const vorhanden = wvHolen(person) || {};
  simpleDialog(
    "Wiedervorlage",
    titel || `${person.vorname || ""} ${person.nachname || ""}`.trim(),
    `<div class="grp">
       ${wvFeld("wvdMonat", wvWert(vorhanden) || monatJetzt(), "Wieder ansprechen")}
       <div class="field"><label for="wvdNotiz">Notiz</label>
         <textarea id="wvdNotiz" style="min-height:70px">${vorhanden.notiz || ""}</textarea></div>
     </div>`,
    () => {
      const m = (document.getElementById("wvdMonat") || { value: "" }).value;
      const nz = (document.getElementById("wvdNotiz") || { value: "" }).value;
      wvSetzen(person, m, nz);
      closeModal();
      renderAll();
    },
    "Speichern",
  );
}
let potTimer = null;
function potListeNeu() {
  clearTimeout(potTimer);
  potTimer = setTimeout(() => {
    const alt = document.getElementById("potSuche");
    const pos = alt ? alt.selectionStart : 0;
    renderPotenzial();
    const neu = document.getElementById("potSuche");
    if (neu) {
      neu.focus();
      try {
        neu.setSelectionRange(pos, pos);
      } catch (e) {}
    }
  }, 220);
}

/*
 * ---------- Wiedervorlage: Monat oder fester Tag ----------
 * Schreibt in ein verstecktes Eingabefeld, das alle Leser unverändert nutzen.
 * Format: Monat "2026-11", fester Tag "2026-11-03".
 */
function wvFeld(id, wert, label) {
  const tag = istTagWert(wert);
  const monat = tag ? String(wert).slice(0, 7) : wert || "";
  return `<div class="field wvfeld" data-wvfeld="${id}"><label for="${id}_sicht">${label}</label>
    <div class="seg wvmodus"><button type="button" data-wvm="monat" aria-pressed="${!tag}">Monat</button><button type="button" data-wvm="tag" aria-pressed="${tag}">Fester Tag</button></div>
    <input id="${id}_sicht" class="wvm-monat" type="month" value="${monat}" ${tag ? "hidden" : ""}>
    <input class="wvm-tag" type="date" value="${tag ? wert : ""}" ${tag ? "" : "hidden"}>
    <input type="hidden" id="${id}" value="${wert || ""}"></div>`;
}
(function () {
  const sync = (box) => {
    const tag = box.querySelector('[data-wvm="tag"]').getAttribute("aria-pressed") === "true";
    const v = tag ? box.querySelector(".wvm-tag").value : box.querySelector(".wvm-monat").value;
    box.querySelector('input[type="hidden"]').value = v || "";
  };
  document.addEventListener(
    "click",
    (ev) => {
      const b = ev.target.closest && ev.target.closest(".wvfeld [data-wvm]");
      if (!b) return;
      ev.preventDefault();
      const box = b.closest(".wvfeld");
      const tag = b.dataset.wvm === "tag";
      box.querySelectorAll("[data-wvm]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const m = box.querySelector(".wvm-monat"),
        d = box.querySelector(".wvm-tag");
      if (tag && !d.value) {
        const basis = m.value && m.value > monatJetzt() ? m.value + "-01" : dk(new Date());
        d.value = basis;
      }
      if (!tag && !m.value && d.value) m.value = d.value.slice(0, 7);
      m.hidden = tag;
      d.hidden = !tag;
      sync(box);
    },
    true,
  );
  document.addEventListener(
    "input",
    (ev) => {
      const box = ev.target.closest && ev.target.closest(".wvfeld");
      if (box) sync(box);
    },
    true,
  );
  document.addEventListener(
    "change",
    (ev) => {
      const box = ev.target.closest && ev.target.closest(".wvfeld");
      if (box) sync(box);
    },
    true,
  );
})();
