/**
 * Kundenliste
 *
 * Alle Kunden mit Historie und Suche.
 */
/*
 * Erkennt denselben Kunden auch bei abweichender Schreibweise:
 * Nachname, Postleitzahl und Straße reichen – der Vorname wird oft anders erfasst.
 */
function kundeId(e) {
  const strasse = norm(e.str || (e.strasse || "").replace(/\s*\d+\s*[a-zA-Z]?$/, ""));
  return [norm(e.nachname), norm(e.plz), strasse].join("|");
}
/* Baut aus allen Terminen eine Liste, in der jeder Kunde genau einmal steht */
function kundenListe() {
  const map = new Map();
  Object.keys(entries).forEach((k) => {
    const e = entries[k];
    if (!["kunde", "premium", "distanz"].includes(e.kind)) return; // Distanzverkauf zählt als Kunde
    if (!(e.nachname || "").trim()) return;
    const [tag, h] = k.split("|");
    const id = kundeId(e);
    let rec = map.get(id);
    if (!rec) {
      rec = {
        id,
        vorname: "",
        nachname: "",
        anrede: "",
        strasse: "",
        str: "",
        hnr: "",
        plz: "",
        ort: "",
        telefon: "",
        notiz: "",
        termine: [],
        schreibweisen: new Set(),
        einheiten: 0,
        umsatz: 0,
        k70: 0,
        besitz: [],
        letzterKauf: "",
        letzterTermin: "",
        wartung: "",
        offen: [],
      };
      map.set(id, rec);
    }
    /* Die vollständigste Schreibweise gewinnt */
    ["vorname", "nachname", "anrede", "strasse", "str", "hnr", "plz", "ort", "telefon", "notiz"].forEach(
      (f) => {
        if ((e[f] || "").trim().length > (rec[f] || "").length) rec[f] = e[f];
      },
    );
    rec.schreibweisen.add(`${(e.vorname || "").trim()} ${(e.nachname || "").trim()}`.trim());
    const n = e.nb || {};
    rec.termine.push({ tag, h: +h, e, n });
    if (tag > rec.letzterTermin) rec.letzterTermin = tag;
    if (n.verkauft === "Ja") {
      rec.einheiten += +n.einheiten || 0;
      rec.umsatz += num(n.umsatz);
      if (tag > rec.letzterKauf) rec.letzterKauf = tag;
    }
    if (n.k70 === "Ja") rec.k70 += num(n.k70betrag);
    if ((n.besitz || []).length) rec.besitz = n.besitz;
    if (n.wartung === "Ja" && tag > rec.wartung) rec.wartung = tag;
  });
  const liste = [...map.values()];
  liste.forEach((r) => {
    r.termine.sort((a, b) => b.tag.localeCompare(a.tag) || b.h - a.h);
    r.schreibweisen = [...r.schreibweisen];
    r.offen = BESITZ.filter((b) => !(r.besitz || []).includes(b));
    r.kunde = !!r.letzterKauf;
  });
  return liste.sort((a, b) => b.letzterTermin.localeCompare(a.letzterTermin));
}
var kdSuche = "",
  kdFilter = "alle";

function renderKunden() {
  const box = document.getElementById("kunden");
  if (!box || !me) return;
  const alle = kundenListe();
  const q = kdSuche.trim().toLowerCase();
  const gefiltert = alle.filter((r) => {
    if (kdFilter === "kunde" && !r.kunde) return false;
    if (kdFilter === "offen" && r.kunde) return false;
    if (!q) return true;
    return [r.vorname, r.nachname, r.strasse, r.plz, r.ort, r.telefon].join(" ").toLowerCase().includes(q);
  });
  const kaeufer = alle.filter((r) => r.kunde).length;
  const umsatzGesamt = alle.reduce((n, r) => n + r.umsatz, 0);

  box.innerHTML = `
    <div class="asec">
      <h3>Kundenliste</h3>
      <p class="sub erkl">Ergibt sich von selbst aus allen Terminen. Derselbe Kunde erscheint nur einmal,
        auch wenn der Name unterschiedlich geschrieben wurde.</p>
      <div class="kpis">
        ${kpi("Erfasste Kunden", String(alle.length), `${kaeufer} haben gekauft`, "hero")}
      </div>
      <div class="field"><input id="kdSuche" value="${kdSuche}" placeholder="Name, Ort oder Telefon suchen"
        autocomplete="off" inputmode="search"></div>
      <div class="seg">${[
        ["alle", "Alle"],
        ["kunde", "Käufer"],
        ["offen", "Ohne Kauf"],
      ]
        .map(
          ([w, t]) => `<button type="button" data-kdf="${w}" aria-pressed="${kdFilter === w}">${t}</button>`,
        )
        .join("")}</div>
    </div>
    ${dubletten(alle)
      .map(
        (g) => `<div class="asec">
      <p class="hinweis bleibt" style="margin-top:0">Möglicherweise derselbe Kunde:
        ${g.map((r) => `${r.vorname} ${r.nachname}, ${r.strasse || "ohne Straße"}`).join(" · ")}</p>
      <div class="actions"><button class="btn" data-kdmerge="${g.map((r) => r.id).join("~")}">Zusammenführen</button></div>
    </div>`,
      )
      .join("")}
    ${
      gefiltert.length
        ? `<div class="plist">${gefiltert
            .map((r) => {
              const letzter = r.termine[0];
              return `<div class="pcard kcard${r.kunde ? " istkunde" : ""}">
        <div class="nm">${r.anrede ? r.anrede + " " : ""}${r.vorname} ${r.nachname}
          ${r.kunde ? `<span class="wieder">Kunde</span>` : ""}
          ${wvHolen(r) ? `<span class="wieder">${wvKurz(wvHolen(r))}</span>` : ""}</div>
        <div class="meta">${[r.strasse, [r.plz, r.ort].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</div>
        <div class="meta">${r.telefon ? r.telefon + " · " : ""}${r.termine.length} Termin${r.termine.length > 1 ? "e" : ""}
          · zuletzt ${fmt(fromDk(r.letzterTermin))}</div>
        ${r.schreibweisen.length > 1 ? `<div class="meta hinweis">Zusammengefasst aus: ${r.schreibweisen.join(", ")}</div>` : ""}
        ${
          r.einheiten || r.umsatz || r.k70
            ? `<div class="kzahlen">
          ${r.einheiten ? `<span><i>Einheiten</i><b>${r.einheiten}</b></span>` : ""}
          ${r.umsatz ? `<span><i>Umsatz brutto</i><b>${eur(r.umsatz)} €</b></span>` : ""}
          ${r.k70 ? `<span><i>K70</i><b>${eur(r.k70)} €</b></span>` : ""}
          ${r.wartung ? `<span><i>Wartung</i><b>${fmt(fromDk(r.wartung))}</b></span>` : ""}
        </div>`
            : ""
        }
        ${r.besitz.length ? `<div class="pot">${r.besitz.map((b) => `<span>${b}</span>`).join("")}</div>` : ""}
        ${r.offen.length && r.besitz.length ? `<div class="why">Offen: ${r.offen.join(" · ")}</div>` : ""}
        ${letzter && letzter.n.grund ? `<div class="why">${letzter.n.grund}</div>` : ""}
        <div class="pact">
          ${r.telefon ? `<a class="btn" href="${telLink(r.telefon)}">Anrufen</a>` : ""}
          ${r.strasse ? `<a class="btn" href="${mapsLink([r.strasse, [r.plz, r.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "))}" target="_blank" rel="noopener">Route</a>` : ""}
          <button class="btn" data-kdtermin="${r.id}">Termin anlegen</button>
          <button class="btn" data-kdwv="${r.id}">Wiedervorlage</button>
          <button class="btn" data-kdhist="${r.id}">Verlauf</button>
        </div>
      </div>`;
            })
            .join("")}</div>`
        : `<div class="asec"><p class="aempty">${
            q || kdFilter !== "alle"
              ? "Kein Kunde passt zu dieser Suche."
              : "Sobald du Kundentermine mit Namen einträgst, erscheinen sie hier automatisch."
          }</p></div>`
    }`;

  const feld = document.getElementById("kdSuche");
  feld.oninput = () => {
    kdSuche = feld.value;
    kdListeNeu();
  };
  box.querySelectorAll("[data-kdf]").forEach(
    (b) =>
      (b.onclick = () => {
        kdFilter = b.dataset.kdf;
        renderKunden();
      }),
  );
  box.querySelectorAll("[data-kdtermin]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = alle.find((x) => x.id === b.dataset.kdtermin);
        if (r) terminAusPotenzial(r, r.kunde ? "Premium CheckIn" : "Vertriebsadresse");
      }),
  );
  box.querySelectorAll("[data-kdhist]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = alle.find((x) => x.id === b.dataset.kdhist);
        if (r) kundenVerlauf(r);
      }),
  );
  box.querySelectorAll("[data-kdwv]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = alle.find((x) => x.id === b.dataset.kdwv);
        if (r) wvDialog(r, `${r.vorname} ${r.nachname}`.trim());
      }),
  );
  box.querySelectorAll("[data-kdmerge]").forEach(
    (b) =>
      (b.onclick = () => {
        const ids = b.dataset.kdmerge.split("~");
        zusammenfuehren(alle.filter((x) => ids.includes(x.id)));
      }),
  );
}
/*
 * Zwei Schreibweisen desselben Kunden, die die App noch nicht zusammenbringt:
 * gleicher Nachname und gleiche PLZ, aber unterschiedliche Straße.
 */
function dubletten(alle) {
  const map = new Map();
  alle.forEach((r) => {
    if (!norm(r.nachname) || !norm(r.plz)) return;
    const k = norm(r.nachname) + "|" + norm(r.plz);
    map.set(k, [...(map.get(k) || []), r]);
  });
  return [...map.values()].filter((g) => g.length > 1);
}
/* Der gewählte Eintrag gewinnt - alle Termine der anderen bekommen dessen Daten */
function zusammenfuehren(gruppe) {
  if (gruppe.length < 2) return;
  simpleDialog(
    "Zusammenführen",
    "Welcher Eintrag ist der richtige?",
    `<div class="grp">
       ${gruppe
         .map(
           (r, i) => `<button type="button" class="opt" data-master="${i}">
         ${r.vorname} ${r.nachname}<small>${[r.strasse, [r.plz, r.ort].filter(Boolean).join(" ")]
           .filter(Boolean)
           .join(" · ")} · ${r.termine.length} Termin${r.termine.length > 1 ? "e" : ""}</small></button>`,
         )
         .join("")}
     </div>
     <p class="hinweis">Alle Termine der übrigen Schreibweisen werden auf diese Daten umgeschrieben.
       Umsätze und Statistik bleiben unverändert.</p>`,
    () => closeModal(),
    "Abbrechen",
  );
  sheet.querySelectorAll("[data-master]").forEach(
    (b) =>
      (b.onclick = () => {
        const m = gruppe[+b.dataset.master];
        const felder = ["vorname", "nachname", "anrede", "strasse", "str", "hnr", "plz", "ort", "telefon"];
        gruppe.forEach((r) => {
          if (r.id === m.id) return;
          r.termine.forEach((t) =>
            felder.forEach((f) => {
              if (m[f]) t.e[f] = m[f];
            }),
          );
          const i = potenzial.findIndex((x) => x.id === r.id);
          if (i >= 0) potenzial.splice(i, 1);
          wvLoeschen(r.id);
        });
        closeModal();
        renderAll();
      }),
  );
}
/* Nur die Liste neu zeichnen, damit die Tastatur beim Suchen stehen bleibt */
let kdTimer = null;
function kdListeNeu() {
  clearTimeout(kdTimer);
  kdTimer = setTimeout(() => {
    const feld = document.getElementById("kdSuche");
    const pos = feld ? feld.selectionStart : 0;
    renderKunden();
    const neu = document.getElementById("kdSuche");
    if (neu) {
      neu.focus();
      try {
        neu.setSelectionRange(pos, pos);
      } catch (e) {}
    }
  }, 220);
}
function kundenVerlauf(r) {
  simpleDialog(
    `${r.vorname} ${r.nachname}`.trim(),
    `${r.termine.length} Termin${r.termine.length > 1 ? "e" : ""}`,
    `<div class="grp">${r.termine
      .map((t) => {
        const n = t.n;
        const info =
          n.verkauft === "Ja"
            ? `Kauf · ${+n.einheiten || 0} Einheiten · ${eur(num(n.umsatz))} €`
            : n.verkauft === "Nein"
              ? "kein Kauf"
              : t.e.status || "ohne Nachbereitung";
        return `<div class="hzeile"><span>${fmt(fromDk(t.tag))} · ${pad(t.h)} Uhr<br>
        <small style="color:var(--faint)">${t.e.kind === "premium" ? "Premium CheckIn" : t.e.quelle || "Kundentermin"}</small></span>
        <span class="hinfo">${info}</span></div>`;
      })
      .join("")}</div>`,
    () => closeModal(),
    "Schließen",
  );
}
