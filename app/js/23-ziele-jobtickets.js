/**
 * Ziele, Jobtickets, Teamumsatz
 *
 * Incentive-Ziele (Club of Excellence, Kobold Club, Goldene Nadel) und Jobtickets.
 */
/* Das Vertriebsjahr läuft von der ersten bis zur letzten Vertriebswoche – nicht vom 1. Januar. */
function jahrSpanne(jahr) {
  const von = vertriebsmonat(mondayOfISOWeek(jahr, 1));
  const bis = vertriebsmonat(mondayOfISOWeek(jahr, weeksInISOYear(jahr)));
  return { fromK: von.fromK, toK: bis.toK };
}
/*
 * Nettoumsatz für die Ziele: Festgebiet + Weißgebiet + K70-Einkauf (Eigenkauf steckt im Festgebiet).
 * Der K70-Abverkauf zählt bewusst nicht mit.
 */
function zielNettoZeitraum(vonK, bisK) {
  const u = umsatz(vonK, bisK);
  return netto(u.fg + u.wg + u.k70ein);
}
function jahresNetto(jahr) {
  return jahresUebersicht(jahr).reduce((n, z) => n + (+z.nettoU || 0), 0);
}
/* Alles, was je erfasst wurde, plus der von Hand nachgetragene Umsatz vor 2020 */
function gesamtNetto() {
  const bis = isoWeek(new Date()).year;
  let summe = +settings.umsatzVor2020 || 0;
  for (let j = 2020; j <= bis; j++) summe += jahresNetto(j);
  return summe;
}
const istBerufseinsteiger = () => {
  if (!settings.einstellung) return false;
  return Date.now() - fromDk(settings.einstellung).getTime() < 52 * 7 * 86400000;
};
function einsteigerFenster() {
  if (!settings.einstellung) return null;
  return { von: settings.einstellung, bis: plusTage(settings.einstellung, 26 * 7 - 1) };
}
function jt(jahr) {
  const j = jobtickets[jahr] || {};
  return {
    manuell: +j.manuell || 0,
    qualifiziert: +j.qualifiziert || 0,
    qualEigene: +j.qualEigene || 0,
    foerderung: +j.foerderung || 0,
  };
}
/* Aus den Nachbereitungen geschriebene Jobtickets eines Vertriebsjahres */
function jobticketsGeschrieben(jahr) {
  const sp = jahrSpanne(jahr);
  let n = 0;
  Object.keys(entries).forEach((k) => {
    const e = entries[k],
      nb = e.nb;
    if (!nb || nb.job !== "Ja") return;
    const tag = k.split("|")[0];
    if (tag >= sp.fromK && tag <= sp.toK) n += +nb.jobAnzahl || 0;
  });
  return n;
}
function teamJahr(jahr) {
  const t = teamumsatz[jahr] || {};
  let team = 0,
    einsteiger = 0;
  Object.keys(t).forEach((k) => {
    team += +t[k].team || 0;
    einsteiger += +t[k].einsteiger || 0;
  });
  return { team, einsteiger };
}

/* Ein Fortschrittsbalken für ein Ziel */
/* Ein Ziel als senkrechte Säule – mehrere stehen nebeneinander */
function zielBalken(titel, ist, ziel, einheit, hinweis) {
  const pct = ziel > 0 ? Math.min(100, Math.round((ist / ziel) * 1000) / 10) : 0;
  const fertig = ist >= ziel && ziel > 0;
  const z = (v) =>
    einheit === "€"
      ? eur(v) + " €"
      : `${Math.round(v * 10) / 10}`.replace(".", ",") + (einheit ? " " + einheit : "");
  return `<div class="zziel zsaeulenziel${fertig ? " erreicht" : ""}">
    <div class="zsaeule" role="img" aria-label="${titel}: ${pct} Prozent"><i style="--soll:${pct}%"></i>
      <span class="zpct" data-keinzaehlen>${fertig ? "✓" : Math.floor(pct) + " %"}</span></div>
    <b class="zwert">${z(ist)}</b>
    <span class="zvon">von ${z(ziel)}</span>
    <span class="ztitel">${titel}</span>
    ${hinweis ? `<small class="zhin">${hinweis}</small>` : ""}
    ${fertig ? '<span class="zerreicht" hidden>erreicht ✓</span>' : ""}
  </div>`;
}
/* Ein Ziel als waagerechter, bunter Balken – wie das persönliche Langzeitziel */
function zielQuer(titel, ist, ziel, einheit, unter) {
  const pct = ziel > 0 ? Math.min(100, (ist / ziel) * 100) : 0;
  const z = (v) => (einheit === "€" ? eur(v) + " €" : `${Math.round(v * 10) / 10}`.replace(".", ","));
  return `<div class="zquer${pct >= 100 ? " erreicht" : ""}">
    <div class="lzh-kopf"><b>${titel}</b><span>${z(ist)} von ${z(ziel)}</span></div>
    <div class="lzh-bahn"><i style="--p:${Math.max(2, pct).toFixed(1)}%"></i></div>
    <div class="lzh-fuss"><b data-keinzaehlen>${Math.floor(pct)} % schon erreicht</b>
      <span>${pct >= 100 ? "geschafft" : "noch " + z(Math.max(0, ziel - ist))}</span></div>
    ${unter ? `<p class="hinweis bleibt" style="margin:6px 0 0">${unter}</p>` : ""}
  </div>`;
}
function zielGruppe(titel, unter, balken) {
  const erreicht = balken.some((b) => b.includes("erreicht ✓"));
  return `<div class="asec zsec${erreicht ? " gewonnen" : ""}">
    <h3>${titel}${erreicht ? ' <span class="zhaken">erreicht</span>' : ""}</h3>
    <p class="sub erkl">${unter}</p>
    <div class="zsaeulen" style="--n:${balken.length}">${balken.join("")}</div>
  </div>`;
}

function renderZiele() {
  const box = document.getElementById("ziele");
  if (!box || !me) return;
  const jahr = isoWeek(new Date()).year;
  const j = jt(jahr);
  const gesamt = gesamtNetto();

  /* Goldene Nadel – gilt für alle, über den gesamten Zeitraum */
  const brillanten = gesamt >= 100000 ? Math.floor(gesamt / 100000) : 0;
  const naechste =
    gesamt < 15000
      ? { t: "Vorwerk Signet", z: 15000 }
      : gesamt < 50000
        ? { t: "Goldene Nadel", z: 50000 }
        : { t: `${brillanten + 1}. Brillant`, z: (brillanten + 1) * 100000 };
  const tj = teamJahr(jahr);
  const stufen = [
    ["Vorwerk Signet", gesamt >= 15000, "ab 15.000 €"],
    ["Goldene Nadel", gesamt >= 50000, "ab 50.000 €"],
    [`Brillanten: ${brillanten}`, brillanten > 0, "je 100.000 €"],
    ["Smaragd", gesamt >= 500000, "ab 500.000 €"],
  ];
  if (istTeamleiter()) {
    const topas = Math.floor(tj.team / 500000);
    stufen.push([`Topas: ${topas}`, topas > 0, "je 500.000 € Teamumsatz"]);
    stufen.push([`Rubin: ${j.foerderung}`, j.foerderung > 0, "je Teamleiterförderung"]);
  }

  let h = "";
  if (istTeamleiter()) {
    h += zielGruppe(
      "Club of Excellence",
      `Teamleiterziele im Vertriebsjahr ${jahr} — einer der vier Wege genügt.`,
      [
        zielBalken("Teamumsatz", tj.team, 1100000, "€"),
        zielBalken("Umsatz der Berufseinsteiger im Team", tj.einsteiger, 500000, "€"),
        zielBalken(
          "Qualifizierte Anmeldungen",
          j.qualifiziert,
          6,
          "",
          `davon in eigener Region: ${j.qualEigene} von 2`,
        ),
        zielBalken("Teamleiterförderungen", j.foerderung, 1, ""),
      ],
    );
    h += zielGruppe("Kobold Club", `Teamleiterziele im Vertriebsjahr ${jahr} — einer der vier Wege genügt.`, [
      zielBalken("Teamumsatz", tj.team, 1450000, "€"),
      zielBalken("Umsatz der Berufseinsteiger im Team", tj.einsteiger, 700000, "€"),
      zielBalken(
        "Qualifizierte Anmeldungen",
        j.qualifiziert,
        8,
        "",
        `davon in eigener Region: ${j.qualEigene} von 2`,
      ),
      zielBalken("Teamleiterförderungen", j.foerderung, 2, ""),
    ]);
  } else {
    const ef = einsteigerFenster();
    /* Berufseinsteiger: eigener Block ganz oben, solange das Fenster läuft */
    if (!settings.einstellung) {
      h += `<div class="asec zsec offen">
        <h3>Berufseinsteiger</h3>
        <p class="sub erkl">Trag im Profil dein Einstellungsdatum ein — wer weniger als 52 Wochen dabei ist,
          hat zusätzliche Ziele, die hier erscheinen.</p></div>`;
    } else if (istBerufseinsteiger() && ef) {
      const heuteK = dk(new Date());
      const erreicht26 = zielNettoZeitraum(ef.von, ef.bis);
      const restTage = Math.max(0, Math.round((fromDk(ef.bis) - fromDk(heuteK)) / 86400000));
      const wochenDabei = Math.floor((Date.now() - fromDk(settings.einstellung).getTime()) / (7 * 86400000));
      const imFenster = heuteK <= ef.bis;
      h += `<div class="asec zsec${erreicht26 >= 100000 ? " gewonnen" : ""}">
        <h3>Als Berufseinsteiger${erreicht26 >= 100000 ? ' <span class="zhaken">erreicht</span>' : ""}</h3>
        <p class="sub">Seit ${fmt(fromDk(settings.einstellung))} dabei — Woche ${wochenDabei + 1} von 52.
          ${
            imFenster
              ? `Das Fenster für die ersten 26 Wochen läuft noch ${restTage} Tage, bis zum ${fmt(fromDk(ef.bis))}.`
              : `Das Fenster für die ersten 26 Wochen endete am ${fmt(fromDk(ef.bis))}.`
          }</p>
        ${zielBalken(
          "100.000 € netto in den ersten 26 Wochen",
          erreicht26,
          100000,
          "€",
          imFenster && erreicht26 < 100000 && restTage
            ? `noch ${eur(Math.max(0, 100000 - erreicht26) / Math.max(1, restTage / 7))} € netto pro Woche nötig`
            : "",
        )}
        <p class="hinweis">Damit qualifizierst du dich für den Club of Excellence, ohne die 250.000 € im
          Vertriebsjahr zu brauchen. Nach 52 Wochen gelten für dich die normalen Kundenberaterziele.</p>
      </div>`;
    }
    const ceWege = [];
    if (ef && istBerufseinsteiger())
      ceWege.push(
        zielBalken(
          "Als Berufseinsteiger in den ersten 26 Wochen",
          zielNettoZeitraum(ef.von, ef.bis),
          100000,
          "€",
          `Zeitraum ${fmt(fromDk(ef.von))} – ${fmt(fromDk(ef.bis))}`,
        ),
      );
    ceWege.push(zielBalken("Nettoumsatz im Vertriebsjahr", jahresNetto(jahr), 250000, "€"));
    ceWege.push(zielBalken("Qualifizierte Anmeldungen", j.qualifiziert, 3, ""));
    h += zielGruppe("Club of Excellence", `Vertriebsjahr ${jahr} — einer der Wege genügt.`, ceWege);
    h += zielGruppe("Kobold Club", `Vertriebsjahr ${jahr} — einer der beiden Wege genügt.`, [
      zielBalken("Nettoumsatz im Vertriebsjahr", jahresNetto(jahr), 350000, "€"),
      zielBalken("Qualifizierte Anmeldungen", j.qualifiziert, 4, ""),
    ]);
  }

  h += `<div class="asec zsec">
    <h3>Goldene Nadel</h3>
    <p class="sub erkl">Über den gesamten Zeitraum gerechnet, nicht je Jahr.</p>
    <div class="kpis">${kpi("Gesamter Nettoumsatz", eur(gesamt) + " €", `nächste Stufe: ${naechste.t} ab ${eur(naechste.z)} €`, "hero")}</div>
    ${zielQuer("Bis " + naechste.t, gesamt, naechste.z, "€")}
    <div class="zstufen">${stufen
      .map(([t, an, sub]) => `<div class="zstufe${an ? " an" : ""}"><b>${t}</b><span>${sub}</span></div>`)
      .join("")}</div>
    <div class="zherkunft">${(() => {
      const bis = isoWeek(new Date()).year,
        teile = [];
      if (+settings.umsatzVor2020)
        teile.push(`<span>vor 2020<b>${eur(+settings.umsatzVor2020)} €</b></span>`);
      for (let x = 2020; x <= bis; x++) {
        const w = jahresNetto(x);
        if (w) teile.push(`<span>${x}<b>${eur(w)} €</b></span>`);
      }
      return teile.length ? teile.join("") : `<span>noch nichts erfasst<b>–</b></span>`;
    })()}</div>
    ${
      settings.umsatzVor2020
        ? `<p class="hinweis">Der Betrag vor 2020 stammt aus deiner Eingabe im Jahresrückblick.</p>`
        : `<p class="hinweis">Warst du vor 2020 schon dabei? Trag deinen bisherigen Gesamtumsatz unten im Jahresrückblick ein,
        dann stimmt die Nadel.</p>`
    }
  </div>`;

  if (typeof anmDerKampagne === "function" && typeof VIAN_ZIEL !== "undefined") {
    const vian = anmDerKampagne(typeof KAMPAGNE_AKTIV !== "undefined" ? KAMPAGNE_AKTIV : "q4").length;
    h += `<div class="asec zsec">
      <h3>Vian</h3>
      <p class="sub erkl">Qualifizierte Anmeldungen der laufenden Kampagne.</p>
      ${zielQuer("Qualifizierte Anmeldungen", vian, VIAN_ZIEL, "")}
    </div>`;
  } else
    h += `<div class="asec zsec offen">
    <h3>Vian</h3>
    <p class="sub">Ziel noch offen — sobald die Kriterien feststehen, erscheinen sie hier.</p>
  </div>`;

  box.innerHTML = h;
}

function renderJobtickets() {
  const box = document.getElementById("jobt");
  if (!box || !me) return;
  const jahr = jobJahr || isoWeek(new Date()).year;
  const jetzt = isoWeek(new Date()).year;
  const jahre = [];
  for (let x = 2020; x <= jetzt; x++) jahre.push(x);
  const j = jt(jahr);
  const ausTerminen = jobticketsGeschrieben(jahr);
  const gesamtGeschrieben = ausTerminen + j.manuell;
  const quote = gesamtGeschrieben ? Math.round((j.qualifiziert / gesamtGeschrieben) * 100) : 0;

  box.innerHTML = `
    <div class="asec">
      <h3>Jobtickets</h3>
      <p class="sub erkl">Ein Jobticket wird zur qualifizierten Anmeldung, sobald die Person angestellt ist
        und die ersten 5.000 € Nettoumsatz geschrieben hat.</p>
      <div class="field jahrwahl"><label for="jobJahrSel">Vertriebsjahr</label>
        <select id="jobJahrSel">${jahre
          .slice()
          .reverse()
          .map((x) => `<option value="${x}" ${x === jahr ? "selected" : ""}>${x}</option>`)
          .join("")}</select></div>
      <div class="kpis">
        ${kpi("Jobtickets geschrieben", String(gesamtGeschrieben), `${ausTerminen} aus Terminen · ${j.manuell} von Hand`, "hero")}
        ${kpi("Qualifizierte Anmeldungen", String(j.qualifiziert), `davon ${j.qualEigene} in eigener Region`, "hero")}
        ${kpi("Quote", gesamtGeschrieben ? quote + " %" : "–", "aus Jobticket wird Anmeldung")}
      </div>
    </div>

    <div class="asec">
      <div class="ah4">Von Hand nachtragen</div>
      <p class="sub erkl">Alles, was nicht aus einem Kundentermin kommt.</p>
      ${zaehlFeld("jbManuell", "Zusätzliche Jobtickets", j.manuell)}
      ${zaehlFeld("jbQual", "Qualifizierte Anmeldungen", j.qualifiziert)}
      ${istTeamleiter() ? zaehlFeld("jbEigene", "davon in eigener Region", j.qualEigene) : ""}
      ${istTeamleiter() ? zaehlFeld("jbFoerd", "Teamleiterförderungen", j.foerderung) : ""}
      <p class="hinweis">Die Zahlen gelten für ${jahr} und starten im neuen Vertriebsjahr wieder bei null.
        Sie fließen direkt in die Ziele und in den Jahresrückblick.</p>
    </div>`;

  const sel = document.getElementById("jobJahrSel");
  sel.onchange = () => {
    jobJahr = +sel.value;
    renderJobtickets();
  };
  const jbFeld = {
    jbManuell: "manuell",
    jbQual: "qualifiziert",
    jbEigene: "qualEigene",
    jbFoerd: "foerderung",
  };
  const jbSetzen = (feld, wert) => {
    jobtickets[jahr] = jobtickets[jahr] || {};
    jobtickets[jahr][feld] = Math.max(0, wert);
    saveData();
    renderJobtickets();
    renderZiele();
    renderJahr();
  };
  box.querySelectorAll("[data-jplus],[data-jminus]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.jplus || b.dataset.jminus;
        const feld = jbFeld[id];
        jbSetzen(feld, (+(jobtickets[jahr] || {})[feld] || 0) + (b.dataset.jplus ? 1 : -1));
      }),
  );
  box.querySelectorAll("[data-jwert]").forEach(
    (el) =>
      (el.onclick = () => {
        const feld = jbFeld[el.dataset.jwert];
        zahlEingabe(el.dataset.zedit || "Anzahl", (jobtickets[jahr] || {})[feld], (v) => jbSetzen(feld, v));
      }),
  );
}
/* Zählzeile für die Seiten außerhalb der Nachbereitung */
function zaehlFeld(id, titel, wert) {
  const n = +wert || 0;
  return `<div class="zzeile${n ? " hat" : ""}">
    <span class="ztitel">${titel}</span>
    <span class="stepper${n ? " hat" : ""}">
      <button type="button" data-jminus="${id}" aria-label="weniger">−</button>
      <b data-jwert="${id}" data-zedit="${titel}" role="button" tabindex="0">${n}</b>
      <button type="button" data-jplus="${id}" aria-label="mehr">+</button>
    </span>
  </div>`;
}

function renderTeamumsatz() {
  const box = document.getElementById("tumsatz");
  if (!box || !me) return;
  if (!istTeamleiter()) {
    box.innerHTML = "";
    return;
  }
  const jetzt = isoWeek(new Date()).year;
  const jahr = tuJahr || jetzt;
  const jahre = [];
  for (let x = 2020; x <= jetzt; x++) jahre.push(x);
  const monate = jahresUebersicht(jahr);
  const daten = teamumsatz[jahr] || {};
  const sumT = monate.reduce((n, m) => n + (+(daten[m.startW] || {}).team || 0), 0);
  const sumE = monate.reduce((n, m) => n + (+(daten[m.startW] || {}).einsteiger || 0), 0);

  box.innerHTML = `
    <div class="asec">
      <h3>Teamumsatz</h3>
      <p class="sub erkl">Nettoumsatz des Teams je Vertriebsmonat — von Hand eingetragen.
        Der Umsatz der Berufseinsteiger wird getrennt erfasst und ist im Teamumsatz enthalten.</p>
      <div class="field jahrwahl"><label for="tuJahrSel">Vertriebsjahr</label>
        <select id="tuJahrSel">${jahre
          .slice()
          .reverse()
          .map((x) => `<option value="${x}" ${x === jahr ? "selected" : ""}>${x}</option>`)
          .join("")}</select></div>
      <div class="kpis">
        ${kpi("Teamumsatz netto", eur(sumT) + " €", `Vertriebsjahr ${jahr}`, "hero")}
        ${kpi("davon Berufseinsteiger", eur(sumE) + " €", sumT ? Math.round((sumE / sumT) * 100) + " % des Teamumsatzes" : "–")}
      </div>
    </div>

    <div class="asec">
      <div class="ah4">Eintragen</div>
      <div class="tuliste">
        ${monate
          .map((m) => {
            const d = daten[m.startW] || {};
            return `<div class="tuzeile">
            <div class="tumon"><b>${m.name}</b><span>KW ${m.kw}</span></div>
            <div class="row2">
              <div class="field"><label for="tu_${m.startW}">Teamumsatz netto €</label>
                <input id="tu_${m.startW}" data-tu="${m.startW}|team" inputmode="decimal" value="${d.team ? eur(+d.team) : ""}" placeholder="–"></div>
              <div class="field"><label for="tue_${m.startW}">davon Berufseinsteiger €</label>
                <input id="tue_${m.startW}" data-tu="${m.startW}|einsteiger" inputmode="decimal" value="${d.einsteiger ? eur(+d.einsteiger) : ""}" placeholder="–"></div>
            </div>
          </div>`;
          })
          .join("")}
      </div>
      <p class="hinweis">Die Summen fließen direkt in deine Teamleiterziele.</p>
    </div>`;

  const sel = document.getElementById("tuJahrSel");
  sel.onchange = () => {
    tuJahr = +sel.value;
    renderTeamumsatz();
  };
  box.querySelectorAll("[data-tu]").forEach(
    (el) =>
      (el.onchange = () => {
        const [kw, feld] = el.dataset.tu.split("|");
        teamumsatz[jahr] = teamumsatz[jahr] || {};
        teamumsatz[jahr][kw] = teamumsatz[jahr][kw] || {};
        const v = num(el.value);
        if (v) teamumsatz[jahr][kw][feld] = v;
        else delete teamumsatz[jahr][kw][feld];
        if (!Object.keys(teamumsatz[jahr][kw]).length) delete teamumsatz[jahr][kw];
        saveData();
        renderTeamumsatz();
        renderZiele();
      }),
  );
}
var jobJahr = 0,
  tuJahr = 0;
