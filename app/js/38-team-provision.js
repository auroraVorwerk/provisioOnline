/**
 * Team – Wochenmeldung und Teamprovision
 *
 * Team-Wochenmeldung mit denselben Spalten wie die eigene, CSV-Export
 * (Semikolon, Excel/Numbers) und Teamprovision für Teamleiter:
 * Umsatz je Berater × Satz nach Betriebszugehörigkeit
 * (bis 26 Wochen 10 %, 27–52 Wochen 6 %, ab 53 Wochen 4 %).
 */

/* ---------- 1 · Spalten der Team-Wochenmeldung ---------- */
TMSP.splice(
  0,
  TMSP.length,
  ["Kundentermine", (m) => m.termine],
  ["Aktiv", (m) => (m.aktiv ? 1 : 0)],
  ["Einheiten", (m) => m.einheiten],
  ["davon Festgebiet", (m) => m.einheitenFG],
  ["davon Messe", (m) => m.einheitenMesse || 0],
  ["Umsatz netto", (m) => netto(m.umsatzFG + m.umsatzWG + (m.umsatzMesse || 0)), "eur"],
  ["K70 Einkauf", (m) => netto(m.k70ein), "eur"],
  ["Premium CheckIn", (m) => m.pci],
  ["Promotion FG", (m) => m.promoFG || 0],
  ["Kontakte / Termine FG", (m) => `${m.kontakteFG || 0} / ${m.promoTermineFG || 0}`, "text"],
  ["Promotion WG", (m) => m.promoWG || 0],
  ["Kontakte / Termine WG", (m) => `${m.kontakteWG || 0} / ${m.promoTermineWG || 0}`, "text"],
  ["Jobtickets", (m) => m.jobtickets],
);
TMSP_N.splice(
  0,
  TMSP_N.length,
  ["Kundentermine", (m) => m.nTermine],
  ["Erw. Umsatz netto", (m) => netto(m.erwarteterUmsatz), "eur"],
  ["Erw. Einheiten", (m) => m.erwarteteEinheiten, "dez"],
  ["Promotions FG", (m) => m.nPromosFG ?? m.nPromos ?? 0],
  ["Promotions WG", (m) => m.nPromosWG || 0],
  ["FGB-Blöcke", (m) => m.nTerminieren],
);

/* ---------- 2 · Excel-Export ---------- */
function tmExcel() {
  const box = document.getElementById("tmeldung");
  if (!box) return;
  const tabellen = [...box.querySelectorAll("table.tmtab")];
  if (!tabellen.length) return;
  const zelle = (t) => {
    let s = String(t).replace(/\s+/g, " ").trim();
    s = s.replace(/\s*€$/, ""); // Zahlen ohne Währungszeichen
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const zeilen = [];
  const kw = (box.querySelector(".tmwoche b") || {}).textContent || "";
  tabellen.forEach((tab, i) => {
    const titel = tab.closest(".asec") && tab.closest(".asec").querySelector(".ah4");
    zeilen.push(zelle((titel ? titel.textContent : i ? "Kommende Woche" : "Diese Woche") + " " + kw));
    tab.querySelectorAll("tr").forEach((tr) => {
      zeilen.push([...tr.children].map((c) => zelle(c.textContent)).join(";"));
    });
    zeilen.push("");
  });
  const csv = "\uFEFF" + zeilen.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Wochenmeldung_Team_${kw.replace(/\s+/g, "") || "KW"}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}
const teamMeldungAlt = teamMeldung;
teamMeldung = async function () {
  await teamMeldungAlt();
  const box = document.getElementById("tmeldung");
  if (!box || !box.querySelector("table.tmtab") || box.querySelector("#tmExcel")) return;
  const leiste = document.createElement("div");
  leiste.className = "asec";
  leiste.innerHTML = `<div class="actions"><button class="btn primary" id="tmExcel">Als Excel laden</button></div>
    <p class="hinweis">Die Datei öffnet sich in Excel und Numbers. „Aktiv“ steht dort als 1 oder 0.</p>`;
  box.appendChild(leiste);
  document.getElementById("tmExcel").onclick = tmExcel;
};

/* ---------- 3 · Teamprovision ---------- */
const TP_STUFEN = [
  [26, 0.1],
  [52, 0.06],
  [Infinity, 0.04],
];
function tpSatz(wochen) {
  return (TP_STUFEN.find(([bis]) => wochen <= bis) || [0, 0])[1];
}
let tpCache = { schluessel: "", zeit: 0, daten: null };

async function tpLaden(vm) {
  const schluessel = vm.fromK + "|" + (me.team || []).join(",");
  if (tpCache.schluessel === schluessel && Date.now() - tpCache.zeit < 120000) return tpCache.daten;
  const daten = [],
    fehler = [];
  for (const d of me.team || []) {
    const u = await userGet(d).catch(() => null);
    if (!u) continue;
    const name = `${u.vorname || ""} ${u.nachname || ""}`.trim() || d;
    const blob = await loadData(d, true).catch(() => null);
    if (!blob) {
      fehler.push(name);
      continue;
    }
    const einst = (blob.settings && blob.settings.einstellung) || (settings.tmEinst || {})[d] || "";
    /* Umsatz des Beraters mit genau denselben Regeln wie der eigene */
    let um = null;
    const sicherung = fremdStart();
    try {
      applyData(blob);
      um = umsatz(vm.fromK, vm.toK);
    } catch (e) {
      um = null;
    } finally {
      fremdEnde(sicherung);
    }
    if (!um) {
      fehler.push(name);
      continue;
    }
    const nettoUm = netto((um.fg || 0) + (um.wg || 0) + (um.messe || 0));
    const wochen = einst
      ? Math.max(0, Math.floor((Date.now() - fromDk(einst).getTime()) / (7 * 86400000)) + 1)
      : null;
    const satz = wochen === null ? null : tpSatz(wochen);
    daten.push({ dk: d, name, einst, wochen, satz, nettoUm, anteil: satz === null ? 0 : nettoUm * satz });
  }
  daten.sort((a, b) => (a.wochen ?? 9999) - (b.wochen ?? 9999));
  tpCache = { schluessel, zeit: Date.now(), daten: { daten, fehler } };
  return tpCache.daten;
}

function tpHTML(vm, res, eigen) {
  const { daten, fehler } = res;
  const summe = daten.reduce((s, x) => s + x.anteil, 0);
  const umSumme = daten.reduce((s, x) => s + x.nettoUm, 0);
  const ohne = daten.filter((x) => x.satz === null);
  const zeilen = daten
    .map(
      (x) => `<tr>
      <td>${x.name}</td>
      <td class="v">${x.wochen === null ? "–" : x.wochen}</td>
      <td class="v">${x.satz === null ? "–" : Math.round(x.satz * 100) + " %"}</td>
      <td class="v">${eur(x.nettoUm)}</td>
      <td class="v"><b>${x.satz === null ? "–" : eur(x.anteil)}</b></td></tr>`,
    )
    .join("");
  /* Wer demnächst eine Stufe tiefer rutscht */
  const wechsel = daten
    .filter(
      (x) =>
        x.wochen !== null &&
        (x.wochen === 26 ||
          x.wochen === 52 ||
          (x.wochen >= 23 && x.wochen < 26) ||
          (x.wochen >= 49 && x.wochen < 52)),
    )
    .map(
      (x) =>
        `${x.name} wechselt in ${(x.wochen < 26 ? 27 : 53) - x.wochen} Woche(n) auf ${x.wochen < 26 ? 6 : 4} %`,
    );
  return `<div class="asec tprov">
    <h3>Teamprovision</h3>
    <p class="sub">Vertriebsmonat ${vm.idx} im ${vm.quartal}. Quartal · ${fmt(fromDk(vm.fromK))} – ${fmt(fromDk(vm.toK))}</p>
    ${
      daten.length
        ? `<div class="ascroll"><table class="atable tptab"><thead><tr>
        <th>Berater</th><th>Woche</th><th>Satz</th><th>Umsatz netto</th><th>Anteil</th></tr></thead>
      <tbody>${zeilen}
        <tr class="tmsumme"><td>Gesamt</td><td></td><td></td><td class="v">${eur(umSumme)}</td><td class="v"><b>${eur(summe)}</b></td></tr>
      </tbody></table></div>`
        : `<p class="aempty">In deinem Team ist noch niemand eingetragen.</p>`
    }
    <p class="hinweis">Satz nach Betriebszugehörigkeit: bis 26 Wochen 10 %, 27 bis 52 Wochen 6 %,
      ab 53 Wochen 4 % – gerechnet vom Einstellungsdatum.</p>
    ${
      ohne.length
        ? `<p class="hinweis warn">Ohne Einstellungsdatum und deshalb nicht gerechnet:
      ${ohne.map((x) => x.name).join(", ")}. Das Datum setzt du unter Teammitglieder beim jeweiligen Berater.</p>`
        : ""
    }
    ${wechsel.length ? `<p class="hinweis">${wechsel.join(" · ")}</p>` : ""}
    ${fehler.length ? `<p class="hinweis">Nicht geladen: ${fehler.join(", ")}.</p>` : ""}
    <div class="tpgesamt">
      <div><span>Eigene</span><b>${eur(eigen)} €</b></div>
      <div><span>Teamprovision</span><b>${eur(summe)} €</b></div>
      <div class="hero"><span>Gesamt</span><b>${eur(eigen + summe)} €</b></div>
    </div>
  </div>`;
}

const renderProvAlt = renderProv;
renderProv = function () {
  renderProvAlt();
  if (!me || !istTeamleiter() || fremdAktiv) return;
  const box = document.getElementById("prov");
  if (!box) return;
  const vm = vertriebsmonat(new Date()); // wie der Rechner selbst: der laufende Monat
  let eigen = 0;
  try {
    eigen = provision(umsatz(vm.fromK, vm.toK), vm.weeks).gesamt || 0;
  } catch (e) {}
  const platz = document.createElement("div");
  platz.id = "teamProvPlatz";
  platz.innerHTML = `<div class="asec tprov"><h3>Teamprovision</h3>
    <p class="aempty">Die Zahlen deines Teams werden geholt …</p></div>`;
  box.appendChild(platz);
  tpLaden(vm)
    .then((res) => {
      const ziel = document.getElementById("teamProvPlatz");
      if (ziel) ziel.innerHTML = tpHTML(vm, res, eigen);
    })
    .catch((err) => {
      const ziel = document.getElementById("teamProvPlatz");
      if (ziel)
        ziel.innerHTML = `<div class="asec tprov"><h3>Teamprovision</h3>
      <p class="aempty">Ließ sich nicht laden: ${(err && err.message) || err}</p></div>`;
    });
};
