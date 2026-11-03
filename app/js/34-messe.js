/**
 * Messe
 *
 * Messe als Verkaufseinsatz: Ziel in Einheiten, keine Terminzähler.
 * Messeumsatz wird fest mit 20 % vergütet, zählt nicht in die Bonusstufe
 * und erscheint in der Wochenmeldung getrennt (Festgebiet / Messe).
 */

/*
 * Formularwerte werden nur aus FIELD_IDS (05-dialog.js) gelesen;
 * der Messeumsatz muss dort registriert sein.
 */
if (!FIELD_IDS.includes("umsatzMesse")) FIELD_IDS.push("umsatzMesse");

/* ---------- Farbe und Beschriftung ---------- */
const colorOfAlt = colorOf;
colorOf = function (e) {
  if (e && e.kind === "terminieren" && e.quelle === "Messe") return COLORS.promotion;
  return colorOfAlt(e);
};
KONTAKT_FARBE["Messe"] = KONTAKT_FARBE["Promotion"];

const labelAlt = label;
label = function (e) {
  if (e && e.kind === "terminieren" && e.quelle === "Messe") {
    const eh = e.nb ? +e.nb.einheiten || 0 : null;
    const vorne = e.zielEinheiten
      ? eh === null
        ? `Ziel ${e.zielEinheiten} Einh.`
        : `${eh}/${e.zielEinheiten} Einh.`
      : "Messe";
    return { t1: vorne, t2: [e.ort, "Messe"].filter(Boolean).join(" · ") };
  }
  return labelAlt(e);
};

/* ---------- Dialog: Art wählen und Ziel setzen ---------- */
const paintRohAlt = paintRoh;
paintRoh = function () {
  /* Auswahl der Terminierungsart um die Messe erweitern */
  if (step === "termQuelle") {
    sheet.innerHTML =
      head("Woraus terminierst du?") +
      `<button class="opt" data-tq="Festgebietsbegehung" data-fg="Bestandskunde">FGB – Bestandskunden</button>
       <button class="opt" data-tq="Festgebietsbegehung" data-fg="Door to Door">FGB – Door to Door</button>
       <button class="opt" data-tq="Promotion">Promotion</button>
       <button class="opt" data-tq="Messe">Messe<small>nur Verkäufe, kein Zähler</small></button>` +
      backBtn("kind");
    wireBack();
    sheet.querySelectorAll("[data-tq]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.quelle = b.dataset.tq;
          draft.modus = b.dataset.fg || "";
          step = draft.quelle === "Promotion" ? "promo" : draft.quelle === "Messe" ? "messe" : "termZiel";
          paint();
        }),
    );
    return;
  }

  /* Messe anlegen: Ort, Zeit und Ziel in Einheiten */
  if (step === "messe") {
    const alt = entries[key(draft.day, draft.hour)] || {};
    const von = `${pad(draft.hour)}:00`;
    const bis = draft.bis || alt.bis || (draft.hour + 2 >= 24 ? "00:00" : `${pad(draft.hour + 2)}:00`);
    const ziel = draft.nb.zielEinheiten !== undefined ? draft.nb.zielEinheiten : alt.zielEinheiten || 0;
    sheet.innerHTML =
      head("Messe") +
      `${fld("f_ort", "Ort", draft.nb.f_ort !== undefined ? draft.nb.f_ort : alt.ort || "")}
       <div class="row2">
         <div class="field"><label>Von</label><div class="fixed">${von}</div></div>
         <div class="field"><label for="f_bis">Bis</label><input type="time" id="f_bis" value="${bis}" step="900"></div>
       </div>
       <div class="h4">Ziel für diesen Einsatz</div>
       <div class="grp">${zaehlZeile("zielEinheiten", "Einheiten", ziel)}</div>
       <p class="hinweis" style="margin:8px 0 0">Auf der Messe wird verkauft, nicht terminiert.
         Die Nachbereitung fragt nur Einheiten und Umsatz ab. Der Messeumsatz wird mit 20 %
         vergütet und zählt nicht in die Bonusstufe.</p>
       ${error ? `<div class="err">${error}</div>` : ""}
       <div class="actions"><button class="btn" data-back="termQuelle">Zurück</button>
         <button class="btn primary" id="save">Speichern</button></div>`;
    wireBack();
    wireSegs();
    document.getElementById("save").onclick = () => {
      collect();
      const b = document.getElementById("f_bis").value;
      const bDec = toDec(b) || 24;
      draft.bis = b;
      const z = +draft.nb.zielEinheiten || 0;
      if (!z) {
        error = "Bitte ein Ziel setzen — mindestens eine Einheit.";
        paint();
        return;
      }
      if (!b || bDec <= draft.hour) {
        error = `Die Endzeit muss nach ${von} liegen.`;
        paint();
        return;
      }
      if (coveredHours(draft.hour, bDec).some((hr) => hr !== draft.hour && entries[key(draft.day, hr)])) {
        error = "In diesem Zeitraum steht schon ein Eintrag.";
        paint();
        return;
      }
      const a = entries[key(draft.day, draft.hour)] || {};
      entries[key(draft.day, draft.hour)] = {
        ...a,
        kind: "terminieren",
        quelle: "Messe",
        ort: (draft.nb.f_ort || "").trim(),
        von,
        bis: b,
        zielEinheiten: z,
      };
      closeModal();
      renderAll();
    };
    return;
  }
  paintRohAlt();
};

/* ---------- Nachbereitung: nur Einheiten und Umsatz ---------- */
const nbTermFormAlt = nbTermForm;
nbTermForm = function (e) {
  if (!e || e.quelle !== "Messe") return nbTermFormAlt(e);
  const n = draft.nb;
  const eh = +n.einheiten || 0;
  const zielTxt = e.zielEinheiten
    ? `<p class="hinweis" style="margin:0 0 10px">Ziel: <b>${e.zielEinheiten} Einheit${e.zielEinheiten === 1 ? "" : "en"}</b> ·
        aktuell <b>${eh}</b>${eh >= e.zielEinheiten ? " — geschafft" : ` · noch ${e.zielEinheiten - eh}`}</p>`
    : "";
  return `<div class="h4">Nachbereitung · Messe${e.ort ? " · " + e.ort : ""}</div>
    ${zielTxt}
    <div class="h4">Echte Zeiten</div>
    <div class="grp">
      <div class="row2">
        ${fld("realStart", "Gestartet", n.realStart || "", "time", 'step="300"')}
        ${fld("realEnde", "Geendet", n.realEnde || "", "time", 'step="300"')}
      </div>
    </div>
    <div class="h4">Verkauf</div>
    <div class="grp">
      ${zaehlZeile("einheiten", "Einheiten", n.einheiten)}
      ${fld("umsatzMesse", "Bruttoumsatz €", n.umsatzMesse, "text", 'inputmode="decimal"')}
      ${num(n.umsatzMesse) > 0 ? provHakenHTML(n) : ""}
      <p class="hinweis" style="margin:8px 0 0">20 % Provision, ohne Bonusstufe.
        Kein Gebiet – Messeumsatz zählt weder auf Festgebiet noch auf Weißgebiet.</p>
    </div>`;
};

/* ---------- Umsatz und Provision ---------- */
const umsatzAlt = umsatz;
umsatz = function (fromK, toK) {
  const u = umsatzAlt(fromK, toK);
  u.messe = 0;
  Object.keys(entries).forEach((k) => {
    const n = entries[k].nb;
    if (!n || n.fremd === "Ja") return;
    const day = abrechnungsTag(k.split("|")[0], n);
    if (day < fromK || day > toK) return;
    u.messe += num(n.umsatzMesse);
  });
  return u;
};

const provisionAlt = provision;
provision = function (u, weeks) {
  const p = provisionAlt(u, weeks);
  /* Messe läuft außerhalb der Bonusstufe: fester Satz, eigene Zeile */
  const messeN = netto(u.messe || 0);
  const pMesse = messeN * 0.2;
  const versMesse = pMesse * 0.14;
  p.messeN = messeN;
  p.pMesse = pMesse;
  p.prov += pMesse;
  p.vers += versMesse;
  p.saldo += pMesse + versMesse;
  p.gesamt = Math.max(0, p.saldo);
  p.uebertrag = p.saldo < 0 ? -p.saldo : 0;
  return p;
};

/* Der Messeumsatz gehört auch in die Tagessummen, damit die Statistik stimmt */
const dayTotalsAlt = dayTotals;
dayTotals = function (day) {
  const t = dayTotalsAlt(day);
  t.messe = 0;
  Object.keys(entries).forEach((k) => {
    const e = entries[k];
    if (!e.nb || e.nb.fremd === "Ja") return;
    if (abrechnungsTag(k.split("|")[0], e.nb) !== day) return;
    t.messe += num(e.nb.umsatzMesse);
  });
  return t;
};
