/**
 * Büro und Verkäufe
 *
 * Terminart "Büro" mit fester Zeit und optionalem Ziel. Seite "Verkäufe" mit
 * allen Verkäufen der letzten 52 Wochen sowie Distanzverkäufen (telefonischer
 * Kauf ohne Termin). Distanzverkäufe liegen auf Stunde 23 außerhalb des Rasters
 * und fließen automatisch in Statistik, Wochenmeldung und Provision ein.
 */

COLORS.buero = "#9FB4C8";
COLORS.distanz = "#7FC8A9";
const DISTANZ_H = 23;
/* Die App hat kein kpis() – nur die Klasse. Also selbst zusammensetzen. */
const vkKpis = (liste) => `<div class="kpis">${liste.join("")}</div>`;

/* ---------- 17 · Büro ---------- */
const labelOhneBuero = label;
label = function (e) {
  if (e && e.kind === "buero") {
    const ziel = +e.zielTermine || 0;
    const ist = e.nb ? +e.nb.termine || 0 : null;
    return {
      t1: "Büro",
      t2: ziel
        ? ist === null
          ? `Ziel ${ziel} Termine`
          : `${ist}/${ziel} Termine`
        : e.von && e.bis
          ? `${e.von}–${e.bis}`
          : "",
    };
  }
  if (e && e.kind === "distanz") return { t1: kurzName(e), t2: "Distanzverkauf" };
  return labelOhneBuero(e);
};
const colorOhneBuero = colorOf;
colorOf = function (e) {
  if (e && e.kind === "buero") return COLORS.buero;
  if (e && e.kind === "distanz") return COLORS.distanz;
  return colorOhneBuero(e);
};

const paintRohOhneBuero = paintRoh;
paintRoh = function () {
  /* Büro anlegen: feste Zeit, Ziel freiwillig */
  if (step === "buero") {
    const alt = entries[key(draft.day, draft.hour)] || {};
    const von = draft.von || alt.von || `${pad(draft.hour)}:00`;
    const bis = draft.bis || alt.bis || `${pad(Math.min(23, draft.hour + 2))}:00`;
    const ziel = draft.nb.zielTermine !== undefined ? draft.nb.zielTermine : alt.zielTermine || 0;
    sheet.innerHTML =
      head("Büro") +
      `<div class="grp">
         <div class="row2">
           ${fld("f_von", "Von", von, "time", 'step="900"')}
           ${fld("f_bis", "Bis", bis, "time", 'step="900"')}
         </div>
         <div class="h4">Ziel (freiwillig)</div>
         ${zaehlZeile("zielTermine", "Termine, die du vereinbaren willst", ziel)}
         <p class="hinweis" style="margin:0">Ohne Ziel ist es einfach eine Bürozeit.
           Mit Ziel siehst du im Planer, wie weit du bist.</p>
       </div>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="kind">Zurück</button>
         <button class="btn primary" id="save">Speichern</button></div>`;
    wireBack();
    wireSegs();
    document.getElementById("save").onclick = () => {
      collect();
      const v = document.getElementById("f_von").value,
        b = document.getElementById("f_bis").value;
      const vD = toDec(v),
        bD = toDec(b) || 24;
      if (!v || !b || bD <= vD) {
        error = "Die Endzeit muss nach der Startzeit liegen.";
        paint();
        return;
      }
      const a = entries[key(draft.day, draft.hour)] || {};
      entries[key(draft.day, draft.hour)] = {
        ...a,
        kind: "buero",
        von: v,
        bis: b,
        zielTermine: +draft.nb.zielTermine || 0,
      };
      closeModal();
      renderAll();
    };
    return;
  }
  paintRohOhneBuero();

  /* Die Auswahl der Terminart um „Büro" erweitern */
  if (step === "kind") {
    const liste = sheet.querySelector('[data-kind="individuell"]');
    if (liste && !sheet.querySelector('[data-kind="buero"]')) {
      const b = document.createElement("button");
      b.className = "opt";
      b.type = "button";
      b.dataset.kind = "buero";
      b.innerHTML = "Büro<small>feste Zeit, Terminziel freiwillig</small>";
      liste.parentNode.insertBefore(b, liste);
      b.onclick = () => {
        draft.kind = "buero";
        step = "buero";
        paint();
      };
    }
  }
  /* Beim Ansehen eines Bürotermins: gemachte Termine nachtragen */
  if (step === "view") {
    const e = entries[key(draft.day, draft.hour)];
    if (e && e.kind === "buero" && !sheet.querySelector("#bueroNb")) {
      const n = e.nb || {};
      const kasten = document.createElement("div");
      kasten.id = "bueroNb";
      kasten.innerHTML = `<div class="h4">Nachbereitung</div>
        <div class="grp">
          ${fld("bueroTermine", "Wie viele Termine hast du vereinbart?", n.termine || 0, "text", 'inputmode="numeric"')}
          ${fld("bueroNotiz", "Notiz (freiwillig)", n.notiz || "")}
          <div class="actions"><button type="button" class="btn primary" id="bueroSave">Speichern</button></div>
        </div>`;
      const actions = sheet.querySelector(".actions");
      if (actions) actions.parentNode.insertBefore(kasten, actions);
      else sheet.appendChild(kasten);
      document.getElementById("bueroSave").onclick = () => {
        const t = Math.round(num((document.getElementById("bueroTermine") || {}).value));
        const no = (document.getElementById("bueroNotiz") || {}).value || "";
        e.nb = { ...(e.nb || {}), termine: t, notiz: no };
        e.status = "stattgefunden";
        closeModal();
        renderAll();
      };
    }
  }
};

/* Büro und Distanzverkauf im Planer richtig behandeln */
const gpBloeckeOhneDistanz = gpBloecke;
gpBloecke = function (day) {
  return gpBloeckeOhneDistanz(day).filter((b) => b.e.kind !== "distanz");
};

/* ---------- 18 · Verkäufe ---------- */
PAGES.verkaeufe = "Verkäufe";
/* Preisschild als Symbol im Menü */
IC.verkaeufe = `<path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 12.5 12.5 21 3 11.5z"/><circle cx="7.5" cy="7.5" r="1.3"/>`;
(function () {
  const i = MENUE.findIndex((m) => m[0] === "planer");
  if (i >= 0 && !MENUE.some((m) => m[0] === "verkaeufe")) MENUE.splice(i + 1, 0, ["verkaeufe", "Verkäufe"]);
})();

/* Alle Verkäufe der letzten 52 Wochen, neueste zuerst */
function verkaeufeListe(wochen = 52) {
  const grenze = dk(new Date(Date.now() - wochen * 7 * 86400000));
  const raus = [];
  Object.keys(entries).forEach((k) => {
    const e = entries[k],
      n = e.nb;
    if (!n || n.fremd === "Ja") return;
    const tag = abrechnungsTag(k.split("|")[0], n);
    if (tag < grenze) return;
    const eh = +n.einheiten || 0;
    const um = num(n.umsatz) + num(n.umsatzFG) + num(n.umsatzWG) + num(n.umsatzMesse);
    if (n.verkauft !== "Ja" && !um && !eh) return;
    if (!["kunde", "premium", "eigenkauf", "abholen", "distanz", "terminieren"].includes(e.kind)) return;
    if (e.kind === "terminieren" && !um) return;
    raus.push({
      key: k,
      tag,
      e,
      n,
      einheiten: eh,
      umsatz: um,
      art:
        e.kind === "distanz"
          ? "Distanz"
          : e.kind === "premium"
            ? "CheckIn"
            : e.kind === "eigenkauf"
              ? "Eigenkauf"
              : e.kind === "terminieren"
                ? e.quelle || "Einsatz"
                : "Termin",
      gebiet: n.gebiet || (num(n.umsatzWG) && !num(n.umsatzFG) ? "Weißgebiet" : "Festgebiet"),
    });
  });
  return raus.sort((a, b) => (a.tag < b.tag ? 1 : a.tag > b.tag ? -1 : 0));
}

function renderVerkaeufe() {
  const box = document.getElementById("verkliste");
  if (!box || !me) return;
  const l = verkaeufeListe(52);
  const eh = l.reduce((s, x) => s + x.einheiten, 0);
  const um = l.reduce((s, x) => s + x.umsatz, 0);
  const vm = vertriebsmonat(new Date());
  const imMonat = l.filter((x) => x.tag >= vm.fromK && x.tag <= vm.toK);
  const monate = {};
  l.forEach((x) => {
    const m = x.tag.slice(0, 7);
    (monate[m] = monate[m] || []).push(x);
  });
  const monatName = (m) => {
    const d = fromDk(m + "-01");
    return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  };
  box.innerHTML =
    `<div class="asec">
      <h3>Verkäufe</h3>
      <p class="sub">Alle Verkäufe der letzten 52 Wochen — aus Terminen, CheckIns und am Telefon.</p>
      ${vkKpis([
        kpi("Verkäufe", l.length, `${imMonat.length} im Vertriebsmonat`, "hero"),
        kpi("Einheiten", eh, `${imMonat.reduce((s, x) => s + x.einheiten, 0)} im Vertriebsmonat`),
        kpi(
          "Umsatz brutto",
          eur(um) + " €",
          `${eur(imMonat.reduce((s, x) => s + x.umsatz, 0))} € im Vertriebsmonat`,
        ),
        kpi("Ø je Verkauf", l.length ? eur(um / l.length) + " €" : "–"),
      ])}
      <div class="actions"><button class="btn primary" id="vkNeu">Distanzverkauf eintragen</button></div>
      <p class="hinweis">Ein Distanzverkauf ist ein Kauf am Telefon ohne Termin. Er zählt in
        Wochenmeldung, Statistik, Auswertung und Provision genauso mit.</p>
    </div>` +
    (l.length
      ? Object.keys(monate)
          .sort()
          .reverse()
          .map(
            (m) => `<div class="asec">
        <h3>${monatName(m)}</h3>
        <p class="sub">${monate[m].length} ${monate[m].length === 1 ? "Verkauf" : "Verkäufe"} ·
          ${monate[m].reduce((s, x) => s + x.einheiten, 0)} Einheiten ·
          ${eur(monate[m].reduce((s, x) => s + x.umsatz, 0))} €</p>
        ${monate[m]
          .map(
            (x) => `<div class="vkzeile">
            <span class="vkdatum">${x.tag.slice(8, 10)}.${x.tag.slice(5, 7)}.</span>
            <span class="vkstrich" style="background:${colorOf(x.e) || "var(--accent)"}"></span>
            <span class="vkin"><b>${kurzName(x.e) || "ohne Namen"}</b>
              <span>${x.art} · ${x.gebiet}${x.e.ort ? " · " + x.e.ort : ""}</span></span>
            <span class="vkzahl"><b>${x.einheiten || "–"}</b><i>Einh.</i></span>
            <span class="vkzahl"><b>${eur(x.umsatz)}</b><i>€</i></span>
          </div>`,
          )
          .join("")}
      </div>`,
          )
          .join("")
      : `<div class="asec"><p class="aempty">Noch kein Verkauf erfasst. Über den Knopf oben trägst du
           einen Kauf am Telefon ein.</p></div>`);
  const b = document.getElementById("vkNeu");
  if (b) b.onclick = () => distanzDialog();
}

/* Passt ein bekannter Kunde zu den eingegebenen Daten? */
function distanzTreffer(daten) {
  const id = pid(daten);
  const p = potenzial.find((x) => x.id === id);
  if (p) return { quelle: "Potenzialliste", rec: p };
  const k = (typeof kundenListe === "function" ? kundenListe() : []).find((x) => x.id === kundeId(daten));
  if (k) return { quelle: "Kundenliste", rec: k };
  return null;
}

function distanzDialog() {
  const heute = dk(new Date());
  simpleDialog(
    "Distanzverkauf",
    "Kauf am Telefon, ohne Termin",
    `<div class="grp">
       <div class="row2">${fld("dvVor", "Vorname", "")}${fld("dvNach", "Nachname", "")}</div>
       <div class="row2" style="grid-template-columns:2fr 1fr">${fld("dvStr", "Straße", "")}${fld("dvHnr", "Nr.", "")}</div>
       <div class="row2" style="grid-template-columns:1fr 2fr">${fld("dvPlz", "PLZ", "")}${fld("dvOrt", "Ort", "")}</div>
       ${fld("dvTel", "Telefon (freiwillig)", "")}
       <p class="hinweis" id="dvTreffer" style="margin:0"></p>
     </div>
     <div class="h4">Verkauf</div>
     <div class="grp">
       ${fld("dvDatum", "Datum des Kaufs", heute, "date")}
       <div class="field"><label for="dvGebiet">Gebiet</label>
         <select id="dvGebiet"><option>Festgebiet</option><option>Weißgebiet</option></select></div>
       ${fld("dvEinheiten", "Einheiten", "", "text", 'inputmode="numeric"')}
       ${fld("dvUmsatz", "Bruttoumsatz €", "", "text", 'inputmode="decimal"')}
     </div>
     <div class="h4">Premium CheckIn (freiwillig)</div>
     <div class="grp">
       <div class="row2">${fld("dvPcDatum", "Datum", "", "date")}
         <div class="field"><label for="dvPcH">Startzeit</label>${hourSelect("dvPcH", 19)}</div></div>
       <p class="hinweis" style="margin:0">Lass das Datum leer, wenn noch kein CheckIn steht.</p>
     </div>
     <p class="err" id="dvErr" hidden></p>`,
    () => distanzSpeichern(),
    "Verkauf eintragen",
  );

  /* Während des Tippens zeigen, ob der Kunde schon bekannt ist */
  const pruefe = () => {
    const t = distanzTreffer(distanzDaten());
    const p = document.getElementById("dvTreffer");
    if (!p) return;
    p.innerHTML = t
      ? `Erkannt: <b>${t.rec.vorname || ""} ${t.rec.nachname || ""}</b> aus der ${t.quelle}.
         ${t.quelle === "Potenzialliste" ? "Er wird dort entfernt und in der Kundenliste als Käufer geführt." : "Der Verkauf wird ihm zugeordnet."}`
      : "Noch kein Treffer – dann wird ein neuer Kunde angelegt.";
  };
  ["dvVor", "dvNach", "dvStr", "dvPlz", "dvOrt"].forEach((id) => {
    const f = document.getElementById(id);
    if (f) f.addEventListener("blur", pruefe);
  });
  pruefe();
}

function distanzDaten() {
  const v = (id) => (document.getElementById(id) || { value: "" }).value.trim();
  const str = v("dvStr"),
    hnr = v("dvHnr");
  return {
    vorname: v("dvVor"),
    nachname: v("dvNach"),
    str,
    hnr,
    strasse: [str, hnr].filter(Boolean).join(" "),
    plz: v("dvPlz"),
    ort: v("dvOrt"),
    telefon: v("dvTel"),
  };
}

function distanzSpeichern() {
  collect();
  const d = distanzDaten();
  const err = document.getElementById("dvErr");
  const zeig = (t) => {
    err.textContent = t;
    err.hidden = false;
  };
  const datum = (document.getElementById("dvDatum") || {}).value;
  const einheiten = Math.round(num((document.getElementById("dvEinheiten") || {}).value));
  const umsatz = (document.getElementById("dvUmsatz") || {}).value;
  const gebiet = (document.getElementById("dvGebiet") || {}).value || "Festgebiet";
  if (!d.nachname) return zeig("Bitte den Nachnamen eintragen.");
  if (!datum) return zeig("Bitte das Datum des Kaufs eintragen.");
  if (!num(umsatz) && !einheiten) return zeig("Bitte Einheiten oder Umsatz eintragen.");

  /* Freie Ablage außerhalb des Rasters, damit der Planer frei bleibt */
  let h = DISTANZ_H,
    k = key(datum, h);
  while (entries[k] && h < DISTANZ_H + 8) {
    h++;
    k = key(datum, h);
  }

  const treffer = distanzTreffer(d);
  entries[k] = {
    kind: "distanz",
    quelle: "Distanzverkauf",
    ...d,
    status: "stattgefunden",
    nb: {
      status: "Stattgefunden",
      verkauft: "Ja",
      gebiet,
      einheiten,
      umsatz: String(Math.round(num(umsatz))),
      kundenstatus: treffer ? "Bestandskunde" : "Neukunde",
      realStart: "",
      realEnde: "",
      mts: Date.now(),
    },
  };

  /* Aus der Potenzialliste nehmen – er hat ja gekauft */
  const id = pid(d);
  const iP = potenzial.findIndex((x) => x.id === id);
  if (iP >= 0) potenzial.splice(iP, 1);
  const iW = wiedervorlagen.findIndex((x) => x.id === id);
  if (iW >= 0) wiedervorlagen.splice(iW, 1);

  /* Premium CheckIn gleich mit anlegen, wenn ein Datum steht */
  const pcD = (document.getElementById("dvPcDatum") || {}).value;
  const pcH = +(document.getElementById("dvPcH") || {}).value || 19;
  if (pcD && !entries[key(pcD, pcH)]) entries[key(pcD, pcH)] = { kind: "premium", ...d };

  closeModal();
  renderAll();
  renderVerkaeufe();
  stups(10);
}

/* Distanzverkäufe in die Wochenmeldung und die Auswertung holen */
const meldungDatenOhneDistanz = meldungDaten;
meldungDaten = function (start) {
  const m = meldungDatenOhneDistanz(start);
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return dk(d);
  });
  const von = tage[0],
    bis = tage[6];
  Object.keys(entries).forEach((k) => {
    const e = entries[k],
      n = e.nb;
    if (e.kind !== "distanz" || !n || n.fremd === "Ja") return;
    const tag = abrechnungsTag(k.split("|")[0], n);
    if (tag < von || tag > bis) return;
    const eh = +n.einheiten || 0;
    m.einheiten += eh;
    m.distanz = (m.distanz || 0) + 1;
    if (n.gebiet === "Weißgebiet") m.umsatzWG += num(n.umsatz);
    else {
      m.einheitenFG += eh;
      m.umsatzFG += num(n.umsatz);
    }
  });
  m.umsatzGesamt = m.umsatzFG + m.umsatzWG + (m.umsatzMesse || 0);
  m.aktiv = m.aktiv || (m.distanz || 0) > 0;
  return m;
};

const renderAuswOhneDistanz = renderAusw;
renderAusw = function () {
  renderAuswOhneDistanz();
  const box = document.getElementById("ausw");
  if (!box || box.querySelector("#auswDistanz")) return;
  const wochen = typeof rangeWeeks === "number" ? rangeWeeks : 4;
  const l = verkaeufeListe(wochen).filter((x) => x.e.kind === "distanz");
  if (!l.length) return;
  const sec = document.createElement("div");
  sec.className = "asec";
  sec.id = "auswDistanz";
  sec.innerHTML = `<h3>Distanzverkäufe</h3>
    <p class="sub">Käufe am Telefon im gewählten Zeitraum – ohne Termin, aber mit Umsatz.</p>
    ${vkKpis([
      kpi("Verkäufe", l.length, "", "hero"),
      kpi(
        "Einheiten",
        l.reduce((s, x) => s + x.einheiten, 0),
      ),
      kpi("Umsatz brutto", eur(l.reduce((s, x) => s + x.umsatz, 0)) + " €"),
    ])}`;
  box.appendChild(sec);
};

/* Die Seite beim Aufrufen zeichnen */
const showOhneVerkaeufe = show;
show = function (k) {
  showOhneVerkaeufe(k);
  if (document.body.dataset.page === "verkaeufe")
    try {
      renderVerkaeufe();
    } catch (e) {
      console.error(e);
    }
};
const renderAllOhneVerkaeufe = renderAll;
renderAll = function () {
  renderAllOhneVerkaeufe();
  if (document.body.dataset.page === "verkaeufe")
    try {
      renderVerkaeufe();
    } catch (e) {}
};
