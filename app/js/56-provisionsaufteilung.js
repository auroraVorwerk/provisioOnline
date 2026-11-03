/**
 * Provisionsaufteilung
 *
 * Die Basisprovision von 20 % besteht aus 15 % Verkaufsprovision und 5 %
 * Kontaktprovision. Teilen sich Berater einen Verkauf, hakst du im letzten
 * Schritt der Nachbereitung direkt unter dem Bruttoumsatz ab, was du bekommst.
 * Gespeichert wird am Termin: nb.provVK und nb.provKT in Prozentpunkten.
 * Umsatz, Statistik und Bonusstufe zählen weiter voll – gekürzt wird nur
 * der abgegebene Teil der 20 %.
 */
const PROV_VK = 15,
  PROV_KT = 5,
  PROV_BASIS = PROV_VK + PROV_KT;

function provAnteil(n) {
  const lies = (v, max) => {
    const z = v === undefined || v === null || v === "" ? max : +v;
    return Number.isFinite(z) ? Math.max(0, Math.min(max, z)) : max;
  };
  const vk = lies(n && n.provVK, PROV_VK),
    kt = lies(n && n.provKT, PROV_KT);
  return { vk, kt, f: (vk + kt) / PROV_BASIS, geteilt: vk + kt < PROV_BASIS };
}

/* Bruttobetrag eines Termins, auf den die Basisprovision läuft – nach denselben Regeln wie umsatz() */
function verkaufsTeile(n) {
  const t = { fg: 0, wg: 0, messe: 0 };
  if (!n || n.fremd === "Ja") return t;
  if (n.verkauft === "Ja") {
    if (n.gebiet === "Festgebiet") t.fg += num(n.umsatz);
    else if (n.gebiet === "Weißgebiet") t.wg += num(n.umsatz);
  }
  t.fg += num(n.umsatzFG);
  t.wg += num(n.umsatzWG);
  t.messe += num(n.umsatzMesse);
  return t;
}
const verkaufsSumme = (n) => {
  const t = verkaufsTeile(n);
  return t.fg + t.wg + t.messe;
};
function terminName(e) {
  const n = [e.vorname, e.nachname].filter((x) => (x || "").trim()).join(" ");
  if (n) return n;
  if (e.quelle === "Promotion") return "Promotion";
  if (e.kind === "messe" || (e.nb && num(e.nb.umsatzMesse))) return "Messe";
  return "Verkauf";
}

/* ---------- Umsatz: abgegebene Anteile mitführen ---------- */
const umsatzVorAufteilung = umsatz;
umsatz = function (fromK, toK) {
  const u = umsatzVorAufteilung(fromK, toK);
  u.abFG = 0;
  u.abWG = 0;
  u.abMesse = 0;
  u.geteilt = [];
  Object.keys(entries).forEach((k) => {
    const e = entries[k],
      n = e && e.nb;
    if (!n || n.fremd === "Ja") return;
    const a = provAnteil(n);
    if (!a.geteilt) return;
    const day = abrechnungsTag(k.split("|")[0], n);
    if (day < fromK || day > toK) return;
    const t = verkaufsTeile(n);
    const weg = 1 - a.f;
    u.abFG += t.fg * weg;
    u.abWG += t.wg * weg;
    u.abMesse += t.messe * weg;
    if (t.fg + t.wg + t.messe > 0)
      u.geteilt.push({ k, tag: day, name: terminName(e), brutto: t.fg + t.wg + t.messe, vk: a.vk, kt: a.kt });
  });
  u.geteilt.sort((a, b) => b.tag.localeCompare(a.tag));
  return u;
};

/* ---------- Provision: nur der abgegebene Teil der 20 % fällt weg ---------- */
const provisionVorAufteilung = provision;
provision = function (u, weeks) {
  const p = provisionVorAufteilung(u, weeks);
  const abFG = netto(u.abFG || 0) * 0.2,
    abWG = netto(u.abWG || 0) * 0.2,
    abMe = netto(u.abMesse || 0) * 0.2;
  p.abFG = abFG;
  p.abWG = abWG;
  p.abMesse = abMe;
  p.abgegeben = abFG + abWG + abMe;
  if (!p.abgegeben) return p;
  p.pFG -= abFG;
  p.pWG -= abWG;
  if (p.pMesse !== undefined) p.pMesse -= abMe;
  p.prov -= p.abgegeben;
  p.vers = p.prov * 0.14;
  p.saldo = p.prov + p.vers - p.warenkredit - p.minus;
  p.gesamt = Math.max(0, p.saldo);
  p.uebertrag = p.saldo < 0 ? -p.saldo : 0;
  return p;
};

/* ---------- Häkchen unter dem Bruttoumsatz ---------- */
const pzahl = (v) => (+v).toLocaleString("de-DE", { maximumFractionDigits: 1 });

function provHakenHTML(n) {
  const a = provAnteil(n);
  const haken = (feld, titel, satz, an) => `<button type="button" class="phk" data-provhaken="${feld}"
      aria-pressed="${an}"><i aria-hidden="true"></i><span>${titel}<small>${satz} %</small></span></button>`;
  return `<div class="sect provhaken"><span class="lb">Was bekommst du?</span>
      <div class="phgrid">${haken("provVK", "Verkaufsprovision", PROV_VK, a.vk > 0)}${haken(
        "provKT",
        "Kontaktprovision",
        PROV_KT,
        a.kt > 0,
      )}</div>
      <p class="hinweis" style="margin:6px 0 0">Abhaken, was du bekommst – was ein Partner bekommt, frei lassen.</p>
    </div>`;
}
/* Antippen schaltet um: in der Nachbereitung über den Entwurf, sonst nur das Häkchen selbst */
document.addEventListener("click", (ev) => {
  const b = ev.target.closest && ev.target.closest("[data-provhaken]");
  if (!b) return;
  const feld = b.dataset.provhaken;
  const an = b.getAttribute("aria-pressed") !== "true";
  const voll = feld === "provVK" ? PROV_VK : PROV_KT;
  if (b.closest("[data-provfrei]") || typeof draft === "undefined" || !draft || !draft.nb || step === "simple") {
    b.setAttribute("aria-pressed", String(an));
    return;
  }
  collect();
  draft.nb[feld] = an ? voll : 0;
  repaint();
});
const hakenWert = (wurzel, feld) => {
  const b = wurzel.querySelector(`[data-provhaken="${feld}"]`);
  return !b || b.getAttribute("aria-pressed") === "true";
};

/* Nachträglich ändern (aus dem Provisionsrechner) – dieselben zwei Häkchen */
function aufteilungFragen(eintragKey) {
  const e = entries[eintragKey];
  if (!e || !e.nb) return;
  const brutto = verkaufsSumme(e.nb);
  if (brutto <= 0) return;
  simpleDialog(
    "Provision",
    `${entschaerfeText(terminName(e))} · ${eur(brutto)} € brutto`,
    `<div class="grp" data-provfrei>${provHakenHTML(e.nb)}</div>`,
    () => {
      const box = document.getElementById("sheet");
      e.nb.provVK = hakenWert(box, "provVK") ? PROV_VK : 0;
      e.nb.provKT = hakenWert(box, "provKT") ? PROV_KT : 0;
      saveData();
      closeModal();
      try {
        renderAll();
      } catch (err) {}
    },
    "Speichern",
  );
}

/* Distanzverkauf: Häkchen direkt im Formular */
const distanzDialogOhneHaken = distanzDialog;
distanzDialog = function () {
  distanzDialogOhneHaken.apply(this, arguments);
  const um = document.getElementById("dvUmsatz");
  const feld = um && um.closest(".field");
  if (feld) feld.insertAdjacentHTML("afterend", `<div data-provfrei>${provHakenHTML({})}</div>`);
};
const distanzSpeichernOhneHaken = distanzSpeichern;
distanzSpeichern = function () {
  const box = document.getElementById("sheet");
  const vk = hakenWert(box, "provVK"),
    kt = hakenWert(box, "provKT");
  const vorher = new Set(Object.keys(entries));
  const r = distanzSpeichernOhneHaken.apply(this, arguments);
  const neu = Object.keys(entries).find((k) => !vorher.has(k) && entries[k].kind === "distanz");
  if (neu && entries[neu].nb) {
    entries[neu].nb.provVK = vk ? PROV_VK : 0;
    entries[neu].nb.provKT = kt ? PROV_KT : 0;
    saveData();
  }
  return r;
};
