/**
 * Verkäufe und Provision (Beta 1.1)
 *
 * Auf der Seite „Verkäufe“ vier Wege, etwas einzutragen: Distanzverkauf,
 * Leadverkauf, Leervorführung und Eigenkauf. Leads bringen 5 %, Leervorführungen
 * 10 % Provision auf den Nettobetrag – ohne Einheiten, außerhalb von Festgebiet,
 * Weißgebiet und Prämienstufe („Sonstiges“).
 * Die Provision rechnet danach so: Weiß- und Festgebiet (15 + 5 %), Festgebiet
 * plus Prämie, K70 Einkauf plus Prämie plus 6 % Bonus, Sonstiges, für
 * Teamleiterinnen die Teamprovision – und auf alles der Versicherungszuschuss
 * (9 % RV + 5 % KV).
 */
const LEAD_SATZ = 0.05,
  LEER_SATZ = 0.1,
  ZUSCHUSS_RV = 0.09,
  ZUSCHUSS_KV = 0.05;
COLORS.lead = "#C8A2E8";
COLORS.leer = "#E8B07F";
COLORS.eigenkauf = COLORS.eigenkauf || "#8FBF9F";

/* ---------- Umsatz: Sonstiges und Zeitraum mitführen ---------- */
const umsatzVorSonstigem = umsatz;
umsatz = function (fromK, toK) {
  const u = umsatzVorSonstigem(fromK, toK);
  u.vonK = fromK;
  u.bisK = toK;
  u.lead = 0;
  u.leer = 0;
  Object.keys(entries).forEach((k) => {
    const e = entries[k];
    if (!e || (e.kind !== "lead" && e.kind !== "leer") || !e.nb) return;
    const tag = k.split("|")[0];
    if (tag < fromK || tag > toK) return;
    u[e.kind] += num(e.nb.brutto);
  });
  return u;
};

/* ---------- Provision: Sonstiges, Team und Versicherungszuschuss ---------- */
const provisionVorZuschuss = provision;
provision = function (u, weeks) {
  const p = provisionVorZuschuss(u, weeks);
  p.leadN = netto(u.lead || 0);
  p.leerN = netto(u.leer || 0);
  p.pLead = p.leadN * LEAD_SATZ;
  p.pLeer = p.leerN * LEER_SATZ;
  p.pSonst = p.pLead + p.pLeer;
  p.team = [];
  p.pTeam = 0;
  if (u.vonK && typeof istTeamleiter === "function" && me && istTeamleiter() && !fremdAktiv) {
    try {
      p.team = teamProvisionDaten({ fromK: u.vonK, toK: u.bisK });
      p.pTeam = p.team.reduce((s, x) => s + x.anteil, 0);
    } catch (e) {}
  }
  /* Grundlage des Zuschusses: alles, was vorher ausgerechnet wurde */
  p.provOhneZuschuss = p.prov + p.pSonst + p.pTeam;
  p.zuschussRV = p.provOhneZuschuss * ZUSCHUSS_RV;
  p.zuschussKV = p.provOhneZuschuss * ZUSCHUSS_KV;
  p.prov = p.provOhneZuschuss;
  p.vers = p.zuschussRV + p.zuschussKV;
  p.saldo = p.prov + p.vers - p.warenkredit - p.minus;
  p.gesamt = Math.max(0, p.saldo);
  p.uebertrag = p.saldo < 0 ? -p.saldo : 0;
  return p;
};

/* ---------- Eintragen: freie Ablage außerhalb des Rasters ---------- */
function ablageSchluessel(datum) {
  let h = DISTANZ_H,
    k = key(datum, h);
  while (entries[k] && h < DISTANZ_H + 30) {
    h++;
    k = key(datum, h);
  }
  return k;
}
const VK_ARTEN = {
  lead: { titel: "Leadverkauf", unter: "5 % Provision auf den Nettobetrag · ohne Einheiten", satz: "5 %" },
  leer: { titel: "Leervorführung", unter: "10 % Provision auf den Nettobetrag · ohne Einheiten", satz: "10 %" },
};
function sonstigesDialog(art) {
  const a = VK_ARTEN[art];
  simpleDialog(
    a.titel,
    a.unter,
    `<div class="grp">
       ${fld("svDatum", "Datum", dk(new Date()), "date")}
       ${fld("svName", "Kunde oder Partner (freiwillig)", "")}
       ${fld("svBrutto", "Bruttoumsatz €", "", "text", 'inputmode="decimal"')}
     </div>
     <p class="err" id="svErr" hidden></p>`,
    () => {
      const datum = document.getElementById("svDatum").value;
      const brutto = Math.round(num(document.getElementById("svBrutto").value));
      const err = document.getElementById("svErr");
      if (!datum || !(brutto > 0)) {
        err.textContent = "Bitte Datum und Bruttoumsatz eintragen.";
        err.hidden = false;
        return;
      }
      const name = entschaerfeText(document.getElementById("svName").value.trim());
      entries[ablageSchluessel(datum)] = {
        kind: art,
        nachname: name || VK_ARTEN[art].titel,
        status: "stattgefunden",
        nb: { status: "Stattgefunden", brutto: String(brutto) },
      };
      saveData();
      closeModal();
      renderAll();
      renderVerkaeufe();
    },
    "Eintragen",
  );
}
function eigenkaufDialog() {
  simpleDialog(
    "Eigenkauf",
    "Zählt als Verkauf im Festgebiet",
    `<div class="grp">
       ${fld("ekDatum2", "Datum", dk(new Date()), "date")}
       ${fld("ekEinheiten", "Einheiten", "", "text", 'inputmode="numeric"')}
       ${fld("ekUmsatz", "Bruttoumsatz €", "", "text", 'inputmode="decimal"')}
     </div>
     <p class="err" id="ekErr" hidden></p>`,
    () => {
      const datum = document.getElementById("ekDatum2").value;
      const eh = Math.round(num(document.getElementById("ekEinheiten").value));
      const um = Math.round(num(document.getElementById("ekUmsatz").value));
      const err = document.getElementById("ekErr");
      if (!datum || (!(eh > 0) && !(um > 0))) {
        err.textContent = "Bitte Datum und Einheiten oder Bruttoumsatz eintragen.";
        err.hidden = false;
        return;
      }
      entries[ablageSchluessel(datum)] = {
        kind: "eigenkauf",
        nachname: "Eigenkauf",
        status: "stattgefunden",
        nb: {
          verkauft: "Ja",
          gebiet: "Festgebiet",
          kundenstatus: "Bestandskunde",
          einheiten: eh || "",
          umsatz: um ? String(um) : "",
        },
      };
      saveData();
      closeModal();
      renderAll();
      renderVerkaeufe();
    },
    "Eintragen",
  );
}

/* ---------- Verkäufe-Liste und Seite ---------- */
const verkaeufeListeOhneSonstiges = verkaeufeListe;
verkaeufeListe = function (wochen = 52) {
  const liste = verkaeufeListeOhneSonstiges(wochen);
  const grenze = dk(new Date(Date.now() - wochen * 7 * 864e5));
  Object.keys(entries).forEach((k) => {
    const e = entries[k];
    if (!e || (e.kind !== "lead" && e.kind !== "leer") || !e.nb) return;
    const tag = k.split("|")[0];
    if (tag < grenze) return;
    liste.push({
      key: k,
      tag,
      e,
      n: e.nb,
      einheiten: 0,
      umsatz: num(e.nb.brutto),
      art: e.kind === "lead" ? "Lead · 5 %" : "Leervorführung · 10 %",
      gebiet: "Sonstiges",
      sonstiges: true,
    });
  });
  return liste.sort((a, b) => (a.tag < b.tag ? 1 : a.tag > b.tag ? -1 : 0));
};
const renderVerkaeufeVorKnoepfen = renderVerkaeufe;
renderVerkaeufe = function () {
  renderVerkaeufeVorKnoepfen();
  const box = document.getElementById("verkliste");
  if (!box) return;
  const alt = box.querySelector("#vkNeu");
  if (!alt) return;
  const reihe = alt.closest(".actions");
  const hinweis = reihe.nextElementSibling;
  if (hinweis && hinweis.classList.contains("hinweis")) hinweis.remove();
  reihe.outerHTML = `<div class="vkwege">
      <button type="button" class="vkweg" data-vkweg="distanz"><b>Distanzverkauf</b><span>am Telefon</span></button>
      <button type="button" class="vkweg" data-vkweg="lead"><b>Leadverkauf</b><span>5 % Provision</span></button>
      <button type="button" class="vkweg" data-vkweg="leer"><b>Leervorführung</b><span>10 % Provision</span></button>
      <button type="button" class="vkweg" data-vkweg="eigen"><b>Eigenkauf</b><span>zählt im Festgebiet</span></button>
    </div>`;
  box.querySelectorAll("[data-vkweg]").forEach(
    (b) =>
      (b.onclick = () => {
        const w = b.dataset.vkweg;
        if (w === "distanz") distanzDialog();
        else if (w === "eigen") eigenkaufDialog();
        else sonstigesDialog(w);
      }),
  );
};

/* Farbe und Name für die neuen Arten (Liste, Kundenliste) */
const colorOfOhneSonstiges = colorOf;
colorOf = function (e) {
  if (e && (e.kind === "lead" || e.kind === "leer")) return COLORS[e.kind];
  return colorOfOhneSonstiges(e);
};
