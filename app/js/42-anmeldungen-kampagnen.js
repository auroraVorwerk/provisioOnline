/**
 * Qualifizierte Anmeldungen und Kampagnen
 *
 * Anmeldungen mit Einstellungsdatum und Qualifizierungswoche, vier Quartalskampagnen,
 * Prämien je Vertriebsmonat (ab der zweiten Qualifizierung doppelt, ab der dritten
 * dreifach), zwei Pflichtanmeldungen je TL-Jahr fürs Fahrzeug sowie das Ziel "Vian".
 * Außerdem: Tagesleiste im Heute-Tab.
 */

/*
 * ---------- Kampagnen ----------
 * einstVon/einstBis begrenzen das Einstellungsdatum, qualBis ist der letzte gültige Qualifizierungstag.
 */
const KAMPAGNEN = [
  { id: "q1", name: "Q1", jahr: 2026, einstVon: "2025-12-29", einstBis: "2026-03-29", qualBis: "2026-04-26" },
  { id: "q2", name: "Q2", jahr: 2026, einstVon: "2026-03-30", einstBis: "2026-06-28", qualBis: "2026-07-26" },
  { id: "q3", name: "Q3", jahr: 2026, einstVon: "2026-06-29", einstBis: "2026-09-27", qualBis: "2026-10-25" },
  {
    id: "q4",
    name: "Q4",
    jahr: 2026,
    einstVon: "2026-09-28",
    einstBis: "2026-12-27",
    qualBis: "2027-03-28",
    praemien: [
      { name: "Oktober", jahr: 2026, kwVon: 40, kwBis: 43, betrag: 999 },
      { name: "November", jahr: 2026, kwVon: 44, kwBis: 47, betrag: 666 },
      { name: "Dezember", jahr: 2026, kwVon: 48, kwBis: 53, betrag: 333 },
    ],
  },
];
const KAMPAGNE_AKTIV = "q4";
const VIAN_ZIEL = 3;
const AUTO_ZIEL = 2; /* zwei Anmeldungen je TL-Jahr fürs Auto */
const MONATE_LANG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const kampagne = (id) => KAMPAGNEN.find((k) => k.id === id);
const aktiveKampagne = () => kampagne(KAMPAGNE_AKTIV);
const VIAN_START = aktiveKampagne().einstVon;

/*
 * ---------- Grunddaten ----------
 * Die Liste liegt in den Einstellungen und wird mit ihnen synchronisiert.
 */
function anmListe() {
  if (!Array.isArray(settings.anmeldungen)) settings.anmeldungen = [];
  return settings.anmeldungen;
}
const anmId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const istDatum = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
const anmName = (a) => [a.vorname, a.nachname].filter(Boolean).join(" ").trim() || a.name || "Ohne Namen";

/* Qualifizierung als Kalenderwoche; ältere Einträge mit Datum werden umgerechnet. */
function anmQualWoche(a) {
  if (a && +a.qualKw && +a.qualJahr) return { week: +a.qualKw, year: +a.qualJahr };
  if (a && istDatum(a.qual)) return isoWeek(fromDk(a.qual));
  return null;
}
/* Für alle Rechnungen mit Datum: der Montag der Qualifizierungswoche */
function anmQualDatum(a) {
  const w = anmQualWoche(a);
  if (!w) return null;
  if (a && istDatum(a.qual) && !+a.qualKw) return a.qual;
  return dk(mondayOfISOWeek(w.year, w.week));
}
const anmQualifiziert = (a) => !!anmQualWoche(a);
const anmQualText = (a) => {
  const w = anmQualWoche(a);
  return w ? `KW ${w.week} · ${w.year}` : "noch offen";
};

/* Welche Kampagne gehört zu einer Anmeldung? Das Einstellungsdatum entscheidet. */
function anmKampagne(a) {
  if (!a || !istDatum(a.einst)) return null;
  return KAMPAGNEN.find((k) => a.einst >= k.einstVon && a.einst <= k.einstBis) || null;
}
/*
 * Zählt die Anmeldung für ihre Kampagne? Dann muss auch die Qualifizierung
 * rechtzeitig erfolgt sein.
 */
function anmZaehltFuerKampagne(a) {
  const k = anmKampagne(a);
  if (!k || !anmQualifiziert(a)) return null;
  const d = anmQualDatum(a);
  return d && d <= k.qualBis ? k : null;
}
function anmDerKampagne(id) {
  return anmListe()
    .filter((a) => {
      const k = anmZaehltFuerKampagne(a);
      return k && k.id === id;
    })
    .sort((x, y) => String(anmQualDatum(x)).localeCompare(String(anmQualDatum(y))));
}

/* Alle Anmeldungen, deren Qualifizierung in dieses Vertriebsjahr fällt */
function anmImJahr(jahr) {
  const sp = jahrSpanne(jahr);
  return anmListe().filter((a) => {
    const d = anmQualDatum(a);
    return d && d >= sp.fromK && d <= sp.toK;
  });
}
function anmOffen() {
  return anmListe().filter((a) => !anmQualifiziert(a));
}

/* ---------- TL-Jahr und die zwei Anmeldungen fürs Auto ---------- */
const tlMonat = () => Math.min(12, Math.max(1, +settings.tlMonat || 0)) || 0;
/* Beginn des TL-Jahres, in dem ein Datum liegt */
function tlJahrStart(datum) {
  const m = tlMonat();
  if (!m || !istDatum(datum)) return null;
  const d = fromDk(datum);
  const jahr = d.getMonth() + 1 >= m ? d.getFullYear() : d.getFullYear() - 1;
  return `${jahr}-${pad(m)}-01`;
}
const tlJahrEnde = (start) => {
  if (!start) return null;
  const d = fromDk(start);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return dk(d);
};
const tlJahrJetzt = () => tlJahrStart(dk(new Date()));
const autoVorab = (start) => Math.min(AUTO_ZIEL, Math.max(0, +(settings.autoVorab || {})[start] || 0));

/*
 * Welche Anmeldungen zählen fürs Auto? Die ersten zwei Qualifizierungen je
 * TL-Jahr - abzüglich derer, die schon vor der App erbracht wurden.
 */
function autoZuordnung() {
  const treffer = new Map();
  if (!istTeamleiter() || !tlMonat()) return treffer;
  const nachJahr = {};
  anmListe()
    .filter(anmQualifiziert)
    .sort((x, y) => String(anmQualDatum(x)).localeCompare(String(anmQualDatum(y))))
    .forEach((a) => {
      const start = tlJahrStart(anmQualDatum(a));
      if (!start) return;
      (nachJahr[start] = nachJahr[start] || []).push(a);
    });
  Object.keys(nachJahr).forEach((start) => {
    const noch = Math.max(0, AUTO_ZIEL - autoVorab(start));
    nachJahr[start].slice(0, noch).forEach((a) => treffer.set(a.id, start));
  });
  return treffer;
}
/* Stand des laufenden TL-Jahres */
function autoStand() {
  const start = tlJahrJetzt();
  if (!start) return null;
  const zu = autoZuordnung();
  const ausListe = [...zu.entries()].filter(([, s]) => s === start).map(([id]) => id);
  const vorab = autoVorab(start);
  return {
    start,
    ende: tlJahrEnde(start),
    vorab,
    ausListe: anmListe().filter((a) => ausListe.includes(a.id)),
    erfuellt: Math.min(AUTO_ZIEL, vorab + ausListe.length),
    offen: Math.max(0, AUTO_ZIEL - vorab - ausListe.length),
  };
}

/* ---------- Prämien der laufenden Kampagne ---------- */
function praemieStufe(a, k) {
  const w = anmQualWoche(a);
  if (!w || !k || !k.praemien) return null;
  return k.praemien.find((p) => p.jahr === w.year && w.week >= p.kwVon && w.week <= p.kwBis) || null;
}
function praemieRechnung() {
  const k = aktiveKampagne();
  const auto = autoZuordnung();
  const alle = anmDerKampagne(k.id);
  const zeilen = alle.map((a) => {
    const istAuto = auto.has(a.id);
    const stufe = praemieStufe(a, k);
    return { a, istAuto, stufe, betrag: istAuto || !stufe ? 0 : stufe.betrag };
  });
  const zahlend = zeilen.filter((z) => z.betrag > 0);
  const summe = zahlend.reduce((s, z) => s + z.betrag, 0);
  const faktor = Math.min(3, zahlend.length) || 0;
  const jeStufe = (k.praemien || []).map((p) => ({
    ...p,
    anzahl: zahlend.filter((z) => z.stufe === p).length,
  }));
  return {
    k,
    zeilen,
    zahlend,
    summe,
    faktor,
    gesamt: summe * faktor,
    jeStufe,
    auto: zeilen.filter((z) => z.istAuto),
    ohneStufe: zeilen.filter((z) => !z.istAuto && !z.stufe),
  };
}

function anmSpeichern() {
  settings.anmeldungen = anmListe()
    .slice()
    .sort((a, b) => String(b.einst || "").localeCompare(String(a.einst || "")));
  saveData();
  try {
    renderJobtickets();
  } catch (e) {}
  try {
    renderZiele();
  } catch (e) {}
  try {
    renderJahr();
  } catch (e) {}
}

/*
 * ---------- Anbindung an die Ziele ----------
 * jt() liefert die Zahlen für Club of Excellence, Kobold Club und Jahresrückblick;
 * die Anmeldungen fließen hier ein.
 */
const jtRoh = jt;
jt = function (jahr) {
  const j = jtRoh(jahr);
  const liste = anmImJahr(jahr);
  return {
    ...j,
    qualifiziert: j.qualifiziert + liste.length,
    qualEigene: j.qualEigene + liste.filter((a) => a.region).length,
  };
};

/* ---------- Fenster: Anmeldung anlegen oder ändern ---------- */
function kwFeld(idKw, idJahr, kw, jahr) {
  const jetzt = isoWeek(new Date()).year;
  const jahre = [jetzt - 1, jetzt, jetzt + 1];
  return `<div class="row2 kwzeile">
    <div class="field"><label for="${idKw}">Qualifizierung · Kalenderwoche</label>
      <input id="${idKw}" type="number" min="1" max="53" inputmode="numeric"
        value="${kw || ""}" placeholder="z. B. 46"></div>
    <div class="field"><label for="${idJahr}">Jahr</label>
      <select id="${idJahr}">
        <option value="">—</option>
        ${jahre.map((j) => `<option value="${j}" ${+jahr === j ? "selected" : ""}>${j}</option>`).join("")}
      </select></div>
  </div>`;
}
function anmDialog(id) {
  const liste = anmListe();
  const a = id ? liste.find((x) => x.id === id) : null;
  const neu = !a;
  const w = anmQualWoche(a) || {};
  const v = a || { vorname: "", nachname: "", einst: "", region: false, notiz: "" };
  simpleDialog(
    neu ? "Qualifizierte Anmeldung" : "Anmeldung bearbeiten",
    neu ? "Name und Einstellungsdatum genügen fürs Erste" : anmName(a),
    `<div class="grp">
       <div class="row2">
         ${fld("anVor", "Vorname", v.vorname || "", "text")}
         ${fld("anNach", "Nachname", v.nachname || (a && !a.vorname ? a.name || "" : ""), "text")}
       </div>
       ${fld("anEinst", "Einstellungsdatum", v.einst, "date")}
       ${kwFeld("anKw", "anJahr", w.week, w.year)}
       <p class="hinweis">Die Qualifizierung kannst du leer lassen und später nachtragen.
         Erst damit zählt die Anmeldung mit.</p>
       <label class="anmhaken"><input type="checkbox" id="anRegion" ${v.region ? "checked" : ""}>
         <span>In eigener Region</span></label>
       ${fld("anNotiz", "Notiz (freiwillig)", v.notiz || "", "text")}
     </div>
     <p class="hinweis">Das Einstellungsdatum entscheidet, zu welcher Kampagne die Anmeldung gehört.
       Die Qualifizierung muss ins Fenster dieser Kampagne fallen.</p>
     ${neu ? "" : `<div class="actions einzeln"><button class="btn warn" id="anWeg">Anmeldung löschen</button></div>`}`,
    () => {
      const vor = (document.getElementById("anVor").value || "").trim();
      const nach = (document.getElementById("anNach").value || "").trim();
      const einst = document.getElementById("anEinst").value;
      const kw = +document.getElementById("anKw").value || 0;
      const jahr = +document.getElementById("anJahr").value || 0;
      const region = document.getElementById("anRegion").checked;
      const notiz = (document.getElementById("anNotiz").value || "").trim();
      if (!nach) {
        alert("Bitte mindestens den Nachnamen eintragen.");
        return;
      }
      if (!istDatum(einst)) {
        alert("Bitte das Einstellungsdatum eintragen.");
        return;
      }
      if ((kw && !jahr) || (!kw && jahr)) {
        alert("Bitte Kalenderwoche und Jahr zusammen eintragen.");
        return;
      }
      if (kw && (kw < 1 || kw > weeksInISOYear(jahr))) {
        alert(`${jahr} hat ${weeksInISOYear(jahr)} Kalenderwochen.`);
        return;
      }
      if (kw && dk(mondayOfISOWeek(jahr, kw)) < einst) {
        alert("Die Qualifizierung kann nicht vor der Einstellung liegen.");
        return;
      }
      const satz = {
        vorname: vor,
        nachname: nach,
        einst,
        qualKw: kw || 0,
        qualJahr: jahr || 0,
        region,
        notiz,
      };
      if (neu) liste.push({ id: anmId(), ...satz });
      else {
        Object.assign(a, satz);
        delete a.name;
        if (!kw) delete a.qual;
      }
      closeModal();
      anmSpeichern();
    },
    neu ? "Hinzufügen" : "Speichern",
  );
  const weg = document.getElementById("anWeg");
  if (weg)
    weg.onclick = () => {
      const i = liste.findIndex((x) => x.id === id);
      if (i >= 0) liste.splice(i, 1);
      closeModal();
      anmSpeichern();
    };
}
/* Die Qualifizierung mit einem Tipp nachtragen */
function anmQualNachtragen(id) {
  const a = anmListe().find((x) => x.id === id);
  if (!a) return;
  const jetzt = isoWeek(new Date());
  const k = anmKampagne(a);
  simpleDialog(
    "Qualifizierung eintragen",
    anmName(a),
    `<div class="grp">
       ${kwFeld("anQ2Kw", "anQ2Jahr", jetzt.week, jetzt.year)}
       <p class="hinweis">Eingestellt am ${istDatum(a.einst) ? fmt(fromDk(a.einst)) : "unbekannt"}${
         k ? ` · Kampagne ${k.name}, Qualifizierung bis ${fmt(fromDk(k.qualBis))}` : ""
       }.
         Qualifiziert ist, wer angestellt ist und die ersten 5.000 € Nettoumsatz geschrieben hat.</p>
     </div>`,
    () => {
      const kw = +document.getElementById("anQ2Kw").value || 0;
      const jahr = +document.getElementById("anQ2Jahr").value || 0;
      if (!kw || !jahr) {
        alert("Bitte Kalenderwoche und Jahr eintragen.");
        return;
      }
      if (kw < 1 || kw > weeksInISOYear(jahr)) {
        alert(`${jahr} hat ${weeksInISOYear(jahr)} Kalenderwochen.`);
        return;
      }
      if (istDatum(a.einst) && dk(mondayOfISOWeek(jahr, kw)) < a.einst) {
        alert("Die Qualifizierung kann nicht vor der Einstellung liegen.");
        return;
      }
      a.qualKw = kw;
      a.qualJahr = jahr;
      delete a.qual;
      closeModal();
      anmSpeichern();
    },
    "Eintragen",
  );
}
/* TL-Monat festlegen */
function tlMonatDialog() {
  simpleDialog(
    "Dein TL-Monat",
    "Beginn deines persönlichen Teamleiterjahres",
    `<div class="grp">
       <div class="field"><label for="tlMon">TL-Monat</label>
         <select id="tlMon">
           <option value="">— noch nicht festgelegt —</option>
           ${MONATE_LANG.map((m, i) => `<option value="${i + 1}" ${tlMonat() === i + 1 ? "selected" : ""}>${m}</option>`).join("")}
         </select></div>
       <p class="hinweis">Dein Teamleiterjahr beginnt am 1. dieses Monats und läuft zwölf Monate.
         Die ersten zwei Qualifizierungen darin zählen fürs Auto und bringen keine Prämie.</p>
       ${fld(
         "tlVorab",
         "Davon schon erbracht, bevor du die App genutzt hast",
         String(autoVorab(tlJahrJetzt()) || ""),
         "number",
         'min="0" max="2" inputmode="numeric"',
       )}
       <p class="hinweis">Hast du deine zwei Anmeldungen fürs laufende TL-Jahr schon vor der App
         gemacht, trag hier eine 2 ein. Dann zählen alle Einträge sofort für die Prämie.</p>
     </div>`,
    () => {
      const m = +document.getElementById("tlMon").value || 0;
      const vor = Math.min(2, Math.max(0, +document.getElementById("tlVorab").value || 0));
      settings.tlMonat = m || 0;
      const start = tlJahrJetzt();
      settings.autoVorab = settings.autoVorab || {};
      if (start) {
        if (vor) settings.autoVorab[start] = vor;
        else delete settings.autoVorab[start];
      }
      closeModal();
      anmSpeichern();
    },
    "Speichern",
  );
}

/* ---------- Jobtickets: Kampagnen, Prämien, Liste ---------- */
const renderJobticketsOhneListe = renderJobtickets;
renderJobtickets = function () {
  renderJobticketsOhneListe();
  const box = document.getElementById("jobt");
  if (!box || !me) return;
  const jahr = jobJahr || isoWeek(new Date()).year;
  const roh = jtRoh(jahr);
  const imJahr = anmImJahr(jahr);
  const offen = anmOffen();
  const p = praemieRechnung();
  const stand = autoStand();
  const vian = anmDerKampagne("q4");

  /* Kopfkacheln aus 23-ziele-jobtickets.js nachschärfen */
  const geschrieben = jobticketsGeschrieben(jahr) + roh.manuell;
  const qGesamt = imJahr.length + roh.qualifiziert;
  box.querySelectorAll(".kpi").forEach((k) => {
    const l = k.querySelector(".kl"),
      w = k.querySelector(".kv"),
      s = k.querySelector(".ks");
    if (!l) return;
    const t = l.textContent.trim();
    if (t === "Qualifizierte Anmeldungen" && s)
      s.textContent = `${imJahr.length} als Eintrag · ${roh.qualifiziert} ohne Datum`;
    /*
     * Die Quote kann über 100 % laufen, wenn Anmeldungen ohne eigenes
     *  Jobticket dazukommen. Angezeigt wird sie dann gedeckelt.
     */
    if (t === "Quote") {
      const r = geschrieben ? Math.round((qGesamt / geschrieben) * 100) : 0;
      if (w) w.textContent = geschrieben ? Math.min(100, r) + " %" : "–";
      if (s)
        s.textContent = geschrieben
          ? `${qGesamt} Anmeldungen aus ${geschrieben} Jobtickets`
          : "noch keine Jobtickets geschrieben";
    }
  });

  /* ---- große Prämienkachel ---- */
  const praemie = document.createElement("div");
  praemie.className = "asec praemie" + (p.gesamt ? " an" : "");
  praemie.innerHTML = `
    <div class="prkopf">
      <span class="prlabel">Deine Prämie · Kampagne ${p.k.name}</span>
      <div class="prbetrag" data-ziel="${p.gesamt}">0 €</div>
      <span class="prsub">${
        p.zahlend.length
          ? `${eur(p.summe)} € aus ${p.zahlend.length} Qualifizierung${p.zahlend.length === 1 ? "" : "en"}${
              p.faktor > 1 ? ` · mal ${p.faktor}` : ""
            }`
          : "noch keine prämienwirksame Qualifizierung"
      }</span>
    </div>
    <div class="prstufen">
      ${p.jeStufe
        .map(
          (s) => `<div class="prstufe${s.anzahl ? " hat" : ""}">
        <b>${eur(s.betrag)} €</b>
        <span>${s.name}</span>
        <i>KW ${s.kwVon}–${s.kwBis}</i>
        <em>${s.anzahl ? `${s.anzahl}× = ${eur(s.anzahl * s.betrag)} €` : "noch keine"}</em>
      </div>`,
        )
        .join("")}
    </div>
    <div class="prrechnung">
      <div><span>Zwischensumme</span><b>${eur(p.summe)} €</b></div>
      <div><span>Faktor${p.faktor < 3 && p.zahlend.length ? ` · noch ${3 - p.zahlend.length} bis ×3` : ""}</span>
           <b>×&nbsp;${p.faktor || 1}</b></div>
      <div class="gross"><span>Gesamt</span><b>${eur(p.gesamt)} €</b></div>
    </div>
    <p class="hinweis">Mit der zweiten Qualifizierung verdoppelt sich die Summe, mit der dritten
      verdreifacht sie sich. Darüber hinaus gibt es keinen weiteren Bonus.
      Gewertet wird der gesamte Kampagnenzeitraum.
      ${
        p.auto.length || (stand && stand.offen)
          ? `<br>Qualifizierungen fürs <b>Auto</b> bringen keine Prämie.`
          : ""
      }
      ${
        p.ohneStufe.length
          ? `<br>${p.ohneStufe.length} Qualifizierung${p.ohneStufe.length === 1 ? "" : "en"} liegt außerhalb der drei
           Prämienmonate und zählt für die Kampagne, aber nicht für die Prämie.`
          : ""
      }</p>`;

  /* ---- Kampagnen als Zielleisten ---- */
  const kamp = document.createElement("div");
  kamp.className = "asec kampsec";
  const heute = dk(new Date());
  kamp.innerHTML = `
    <h3>Kampagnen</h3>
    <p class="sub">Das Einstellungsdatum entscheidet, zu welcher Kampagne eine Anmeldung gehört.
      Die Qualifizierung muss bis zum Stichtag erfolgt sein.</p>
    ${KAMPAGNEN.map((k) => {
      const liste = anmDerKampagne(k.id);
      const laeuft = heute <= k.qualBis;
      const istAktiv = k.id === KAMPAGNE_AKTIV;
      const ziel = istAktiv ? VIAN_ZIEL : Math.max(liste.length, 1);
      return `<div class="kampzeile${istAktiv ? " aktiv" : ""}${laeuft ? "" : " vorbei"}">
        <div class="kampkopf">
          <b>${k.name} ${k.jahr}</b>
          ${
            istAktiv
              ? `<span class="kamptag">läuft</span>`
              : laeuft
                ? `<span class="kamptag offen">Qualifizierung läuft</span>`
                : `<span class="kamptag alt">beendet</span>`
          }
          <span class="kampzahl">${liste.length}${istAktiv ? ` / ${VIAN_ZIEL}` : ""}</span>
        </div>
        <div class="zbalken"><i style="--soll:${Math.min(100, (liste.length / ziel) * 100)}%"></i></div>
        <div class="kampfuss">
          <span>Einstellung ${fmtShort(fromDk(k.einstVon))} – ${fmt(fromDk(k.einstBis))}</span>
          <span>Qualifizierung bis ${fmt(fromDk(k.qualBis))}</span>
        </div>
        ${
          liste.length
            ? `<div class="kampnamen">${liste
                .map((a) => `<span>${anmName(a)}<i>${anmQualText(a)}</i></span>`)
                .join("")}</div>`
            : ""
        }
      </div>`;
    }).join("")}`;

  /* ---- Liste der Anmeldungen ---- */
  const auto = autoZuordnung();
  const zeile = (a) => {
    const q = anmQualifiziert(a);
    const k = anmKampagne(a);
    const gilt = anmZaehltFuerKampagne(a);
    const istAuto = auto.has(a.id);
    const stufe = gilt && gilt.id === KAMPAGNE_AKTIV ? praemieStufe(a, gilt) : null;
    return `<div class="anmzeile${q ? " fertig" : ""}${istAuto ? " auto" : ""}">
      <div class="anmkopf">
        <b>${anmName(a)}</b>
        ${istAuto ? `<span class="anmauto">Auto</span>` : ""}
        ${stufe && !istAuto ? `<span class="anmpr">${eur(stufe.betrag)} €</span>` : ""}
        ${k ? `<span class="anmtag">${k.name}</span>` : `<span class="anmtag alt">keine Kampagne</span>`}
        ${a.region ? `<span class="anmtag">eigene Region</span>` : ""}
      </div>
      <div class="anmdaten">
        <span><i>Eingestellt</i>${istDatum(a.einst) ? fmt(fromDk(a.einst)) : "–"}</span>
        <span><i>Qualifiziert</i>${anmQualText(a)}</span>
      </div>
      ${
        q && k && !gilt
          ? `<p class="anmwarn">Qualifizierung nach dem ${fmt(fromDk(k.qualBis))} —
         zählt nicht mehr für ${k.name}.</p>`
          : ""
      }
      ${a.notiz ? `<p class="anmnotiz">${a.notiz}</p>` : ""}
      <div class="anmknoepfe">
        ${q ? "" : `<button class="btn primary" data-anmqual="${a.id}">Qualifizierung eintragen</button>`}
        <button class="btn" data-anmedit="${a.id}">Bearbeiten</button>
      </div>
    </div>`;
  };

  const abschnitt = document.createElement("div");
  abschnitt.className = "asec anmsec";
  abschnitt.innerHTML = `
    <div class="anmtitel">
      <h3>Qualifizierte Anmeldungen</h3>
      <button class="anmplus" id="anmNeu" aria-label="Anmeldung hinzufügen">+</button>
    </div>
    <p class="sub">Jede Anmeldung einzeln, mit Einstellungsdatum und der Kalenderwoche der
      Qualifizierung. Die Qualifizierung trägst du nach, sobald sie steht.</p>
    <div class="kpis">
      ${kpi("Im Vertriebsjahr " + jahr, String(imJahr.length), "qualifiziert", "hero")}
      ${kpi("Noch offen", String(offen.length), offen.length ? "eingetragen, noch nicht qualifiziert" : "nichts offen")}
      ${
        istTeamleiter()
          ? kpi(
              "Für den Vian",
              `${vian.length} / ${VIAN_ZIEL}`,
              `Einstellung ab ${fmtShort(fromDk(VIAN_START))}`,
              vian.length >= VIAN_ZIEL ? "hero" : "",
            )
          : ""
      }
    </div>
    ${
      anmListe().length
        ? `<div class="anmliste">${anmListe().map(zeile).join("")}</div>`
        : `<p class="aempty">Noch keine Anmeldung eingetragen. Tipp auf das Plus — auch dann schon,
          wenn die Qualifizierung noch aussteht.</p>`
    }
    <p class="hinweis">Gezählt wird nach der Qualifizierungswoche: eine Anmeldung landet in dem
      Vertriebsjahr, in dem sie qualifiziert wurde.</p>`;

  /* ---- TL-Monat und Auto, ganz unten ---- */
  let tlBlock = null;
  if (istTeamleiter()) {
    tlBlock = document.createElement("div");
    tlBlock.className = "asec tlsec";
    const s = stand;
    tlBlock.innerHTML = `
      <h3>TL-Monat und Auto</h3>
      <p class="sub">Dein Teamleiterjahr läuft nicht mit dem Kalender, sondern ab deinem TL-Monat.
        Die ersten zwei Qualifizierungen darin zählen fürs Auto — und bringen keine Prämie.</p>
      ${
        tlMonat()
          ? `
        <div class="kpis">
          ${kpi("Dein TL-Monat", MONATE_LANG[tlMonat() - 1], "Beginn des TL-Jahres")}
          ${kpi(
            "Laufendes TL-Jahr",
            `${fromDk(s.start).getFullYear()}/${String(fromDk(s.ende).getFullYear()).slice(2)}`,
            `${fmt(fromDk(s.start))} – ${fmt(fromDk(s.ende))}`,
          )}
          ${kpi(
            "Auto erfüllt",
            `${s.erfuellt} / ${AUTO_ZIEL}`,
            s.offen ? `noch ${s.offen} nötig` : "erledigt",
            s.offen ? "" : "hero",
          )}
        </div>
        ${zielBalken(
          "Anmeldungen fürs Auto",
          s.erfuellt,
          AUTO_ZIEL,
          "",
          s.vorab ? `${s.vorab} davon vor der App erbracht` : "",
        )}
        ${
          s.ausListe.length
            ? `<div class="anmmini">${s.ausListe
                .map(
                  (a) =>
                    `<span data-anmedit="${a.id}" role="button"><b>${anmName(a)}</b><i>qualifiziert ${anmQualText(a)} · zählt fürs Auto, keine Prämie</i></span>`,
                )
                .join("")}</div>`
            : ""
        }
        <p class="hinweis">${
          s.offen
            ? `Die nächsten ${s.offen} Qualifizierung${s.offen === 1 ? "" : "en"} werden automatisch fürs Auto
             gewertet. Erst danach sammelst du wieder Prämien.`
            : `Das Auto ist für dieses TL-Jahr erledigt. Ab jetzt zählt jede Qualifizierung wieder
             für die Prämie — bis zum ${fmt(fromDk(s.ende))}.`
        }</p>`
          : `<p class="aempty">Dein TL-Monat ist noch nicht hinterlegt. Ohne ihn lässt sich nicht
            berechnen, welche Anmeldungen fürs Auto zählen.</p>`
      }
      <div class="actions einzeln">
        <button class="btn${tlMonat() ? "" : " primary"}" id="tlMonBtn">${
          tlMonat() ? "TL-Monat ändern" : "TL-Monat festlegen"
        }</button>
      </div>`;
  }

  /* Reihenfolge: Kopf · Prämie · Kampagnen · Liste · Nachtragen · TL-Monat */
  const kopf = box.querySelectorAll(".asec")[0];
  const nachtragen = box.querySelectorAll(".asec")[1] || null;
  if (kopf && kopf.nextSibling) {
    box.insertBefore(praemie, kopf.nextSibling);
    box.insertBefore(kamp, praemie.nextSibling);
    box.insertBefore(abschnitt, kamp.nextSibling);
  } else {
    box.appendChild(praemie);
    box.appendChild(kamp);
    box.appendChild(abschnitt);
  }
  if (tlBlock) box.appendChild(tlBlock);

  /* Der alte Zähler bleibt als Rückfalloption, bekommt aber einen klaren Hinweis */
  box.querySelectorAll(".ztitel").forEach((t) => {
    if (t.textContent.trim() === "Qualifizierte Anmeldungen")
      t.innerHTML = `Qualifizierte Anmeldungen <small class="anmklein">ohne Datum — zählen nicht für Kampagnen und Prämien</small>`;
  });

  document.getElementById("anmNeu").onclick = () => anmDialog(null);
  box.querySelectorAll("[data-anmedit]").forEach((b) => (b.onclick = () => anmDialog(b.dataset.anmedit)));
  box
    .querySelectorAll("[data-anmqual]")
    .forEach((b) => (b.onclick = () => anmQualNachtragen(b.dataset.anmqual)));
  const tb = document.getElementById("tlMonBtn");
  if (tb) tb.onclick = tlMonatDialog;
  praemieTicker(praemie.querySelector(".prbetrag"), p.gesamt);
};

/* Der Betrag zählt beim Zeichnen hoch - sonst übersieht man ihn */
function praemieTicker(el, ziel) {
  if (!el) return;
  if (!ziel) {
    el.textContent = "0 €";
    return;
  }
  const dauer = 900,
    start = performance.now();
  const schritt = (t) => {
    const f = Math.min(1, (t - start) / dauer);
    const w = Math.round(ziel * (1 - Math.pow(1 - f, 3)));
    el.textContent = eur(w) + " €";
    if (f < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

/* ---------- Ziele: der Vian bekommt Inhalt ---------- */
const renderZieleOhneVian = renderZiele;
renderZiele = function () {
  renderZieleOhneVian();
  const box = document.getElementById("ziele");
  if (!box || !me) return;
  let platz = null;
  box.querySelectorAll(".asec.zsec h3").forEach((h) => {
    if (h.textContent.trim().startsWith("Vian")) platz = h.closest(".asec");
  });
  if (!platz) return;
  if (!istTeamleiter()) {
    platz.remove();
    return;
  }

  const k = aktiveKampagne();
  const vian = anmDerKampagne(k.id);
  const offenAbStichtag = anmListe().filter(
    (a) => !anmQualifiziert(a) && istDatum(a.einst) && a.einst >= k.einstVon && a.einst <= k.einstBis,
  );
  const erreicht = vian.length >= VIAN_ZIEL;
  const p = praemieRechnung();

  platz.className = "asec zsec" + (erreicht ? " gewonnen" : "");
  platz.innerHTML = `
    <div class="anmtitel"><h3>Vian${erreicht ? ' <span class="zhaken">erreicht</span>' : ""}</h3>
      <button class="anmplus" id="vianNeu" aria-label="Anmeldung hinzufügen">+</button></div>
    <p class="sub erkl">Nur für Teamleiter. Gezählt werden qualifizierte Anmeldungen der Kampagne ${k.name}:
      Einstellung ab dem ${fmt(fromDk(k.einstVon))}, Qualifizierung bis ${fmt(fromDk(k.qualBis))}.</p>
    ${zielQuer(
      "Qualifizierte Anmeldungen",
      vian.length,
      VIAN_ZIEL,
      "",
      offenAbStichtag.length ? `${offenAbStichtag.length} weitere eingetragen, noch nicht qualifiziert` : "",
    )}
    ${
      vian.length
        ? `<div class="anmmini">${vian
            .map(
              (a) =>
                `<span><b>${anmName(a)}</b><i>eingestellt ${fmt(fromDk(a.einst))} · qualifiziert ${anmQualText(a)}</i></span>`,
            )
            .join("")}</div>`
        : ""
    }
    ${
      offenAbStichtag.length
        ? `<div class="anmmini">${offenAbStichtag
            .map(
              (a) =>
                `<span data-anmedit="${a.id}" role="button"><b>${anmName(a)}</b><i>eingestellt ${fmt(fromDk(a.einst))} · noch nicht qualifiziert</i></span>`,
            )
            .join("")}</div>`
        : ""
    }
    ${
      p.gesamt
        ? `<div class="kpis"><div class="kpi hero"><span class="kl">Prämie aus ${k.name}</span>
      <span class="kv">${eur(p.gesamt)} €</span>
      <span class="ks">${eur(p.summe)} € mal ${p.faktor || 1}</span></div></div>`
        : ""
    }
    <p class="hinweis">Anmeldungen von vor dem ${fmt(fromDk(k.einstVon))} werden hier nicht gewertet —
      für Club of Excellence und Kobold Club zählen sie weiter mit.
      Neue Anmeldung mit Plus, zum Bearbeiten oder Qualifizieren auf einen Namen tippen.</p>`;
  const neu = platz.querySelector("#vianNeu");
  if (neu) neu.onclick = () => anmDialog(null);
  platz.querySelectorAll("[data-anmedit]").forEach((b) => (b.onclick = () => anmDialog(b.dataset.anmedit)));
};

/*
 * ---------- Tagesleiste im Heute-Tab ----------
 * Der Tag als horizontale Leiste mit Markierung der aktuellen Uhrzeit;
 * am Handy seitlich scrollbar.
 */
const HTL_VON = Math.min(...HOURS_ASC);
const HTL_BIS = 23;
const htlPct = (x) => ((x - HTL_VON) / (HTL_BIS - HTL_VON)) * 100;
let htlUhr = null;

function htlBloecke(tag) {
  const liste = [];
  HOURS_ASC.forEach((h) => {
    const e = entries[key(tag, h)];
    if (!e) return;
    const fest = ["meeting", "privat", "individuell"].includes(e.kind);
    let von = h,
      bis = h + 2;
    if (!fest && e.kind === "terminieren" && e.bis) {
      // länger geplante Einsätze
      const b = toDec(e.bis);
      const bb = b === 0 ? 24 : b;
      if (bb > h + 2) bis = bb;
    }
    if (fest) {
      if (e.von) von = toDec(e.von);
      if (e.bis) {
        const b = toDec(e.bis);
        bis = b === 0 ? 24 : b;
      }
    }
    von = Math.max(HTL_VON, von);
    bis = Math.min(HTL_BIS, Math.max(bis, von + 0.5));
    liste.push({ e, h, von, bis, fest });
  });
  return liste.sort((a, b) => a.von - b.von || b.bis - a.bis);
}
/* Nur wer sich wirklich überschneidet, bekommt eine eigene Spur */
function htlSpuren(liste) {
  const enden = [];
  liste.forEach((b) => {
    let i = 0;
    while (enden[i] !== undefined && enden[i] > b.von + 0.001) i++;
    b.spur = i;
    enden[i] = b.bis;
  });
  return { liste, spuren: Math.max(1, enden.length) };
}
const gpZeitKurz = (x) => {
  const h = Math.floor(x),
    m = Math.round((x - h) * 60);
  return pad(h) + (m ? ":" + pad(m) : "");
};
function htlHTML() {
  const d = new Date();
  const tag = dk(d);
  const { liste, spuren } = htlSpuren(htlBloecke(tag));
  const jetzt = d.getHours() + d.getMinutes() / 60;
  const imBild = jetzt >= HTL_VON && jetzt <= HTL_BIS;

  let stunden = "";
  for (let h = HTL_VON; h <= HTL_BIS; h++) {
    const rand = h === HTL_VON ? " erste" : h === HTL_BIS ? " letzte" : "";
    stunden += `<span class="htlstd${rand}" style="left:${htlPct(h)}%">${pad(h)}</span>`;
  }

  const bl = liste
    .map((b) => {
      const e = b.e,
        c = colorOf(e) || "var(--accent)";
      const qc = quelleFarbe(e, true);
      const l = label(e);
      const name = e.nachname ? `${e.vorname ? e.vorname.charAt(0) + ". " : ""}${e.nachname}` : l.t1;
      const links = htlPct(b.von),
        breite = Math.max(2.2, htlPct(b.bis) - htlPct(b.von));
      const anteil = !b.fest && b.bis - b.von > 1 ? (1 / (b.bis - b.von)) * 100 : 100;
      const laeuft = jetzt >= b.von && jetzt < b.bis;
      return `<button class="htlblock${b.fest ? " fest" : ""}${laeuft ? " laeuft" : ""}${e.status ? " fertig" : ""}"
       style="left:${links}%;width:${breite}%;top:${b.spur * 46}px;
              --htl-c:${c};--htl-voll:${anteil}%;${qc ? `--htl-q:${qc};` : ""}"
       data-oeffne="${tag}|${b.h}" title="${name} · ${gpZeitKurz(b.von)}–${gpZeitKurz(b.bis)}">
       <b>${name}</b><i>${
         b.fest
           ? `${gpZeitKurz(b.von)}–${gpZeitKurz(b.bis)}`
           : `Ankunft ${gpZeitKurz(b.von)}–${gpZeitKurz(b.von + 1)}`
       }</i></button>`;
    })
    .join("");

  const hoehe = spuren * 46 + 6;
  return `<div class="asec htl">
    <div class="htlkopf">
      <h3>Dein Tag</h3>
      <span>${pad(HTL_VON)}–${pad(HTL_BIS)} Uhr${liste.length ? ` · ${liste.length} Eintr${liste.length === 1 ? "ag" : "äge"}` : ""}</span>
    </div>
    <div class="htlscroll" id="htlScroll">
      <div class="htlband" style="height:${hoehe + 42}px">
        <div class="htlachse">${stunden}</div>
        <div class="htlspur" style="height:${hoehe}px">
          ${bl || `<span class="htlleer">Heute ist nichts eingetragen.</span>`}
          ${
            imBild
              ? `<div class="htljetzt" style="left:${htlPct(jetzt)}%"><i></i>
             <b>${pad(d.getHours())}:${pad(d.getMinutes())}</b></div>`
              : ""
          }
        </div>
      </div>
    </div>
  </div>`;
}
function htlEinsetzen() {
  const box = document.getElementById("heute");
  if (!box || !me) return;
  const alt = box.querySelector(".htl");
  if (alt) alt.remove();
  const tag = box.querySelector(".htag");
  const h = document.createElement("div");
  h.innerHTML = htlHTML();
  const el = h.firstElementChild;
  if (tag) box.insertBefore(el, tag);
  else box.appendChild(el);

  const sc = document.getElementById("htlScroll");
  if (sc) {
    const d = new Date();
    const jetzt = d.getHours() + d.getMinutes() / 60;
    if (jetzt > HTL_VON && sc.scrollWidth > sc.clientWidth)
      sc.scrollLeft = Math.max(0, sc.scrollWidth * (htlPct(jetzt) / 100) - sc.clientWidth * 0.4);
  }
  el.querySelectorAll("[data-oeffne]").forEach(
    (b) =>
      (b.onclick = () => {
        const [t, hh] = b.dataset.oeffne.split("|");
        hOeffne(t, hh);
      }),
  );
}
const renderHeuteOhneLeiste = renderHeute;
renderHeute = function () {
  renderHeuteOhneLeiste();
  try {
    htlEinsetzen();
  } catch (e) {
    console.error("Tagesleiste:", e);
  }
  clearInterval(htlUhr);
  htlUhr = setInterval(() => {
    if (location.hash && location.hash !== "#heute") return;
    const el = document.querySelector(".htl .htljetzt");
    if (!el) return;
    const d = new Date(),
      jetzt = d.getHours() + d.getMinutes() / 60;
    if (jetzt < HTL_VON || jetzt > HTL_BIS) {
      el.remove();
      return;
    }
    el.style.left = htlPct(jetzt) + "%";
    const b = el.querySelector("b");
    if (b) b.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, 60000);
};

/* ================= Tabellen: Hinweis aufs seitliche Wischen ================= */
function tabellenHinweis() {
  document.querySelectorAll(".ascroll").forEach((box) => {
    const zuBreit = box.scrollWidth - box.clientWidth > 8;
    const da = box.nextElementSibling && box.nextElementSibling.classList.contains("awisch");
    if (zuBreit && !da) {
      const p = document.createElement("p");
      p.className = "awisch";
      p.textContent = "Seitlich wischen für die übrigen Spalten →";
      box.after(p);
    } else if (!zuBreit && da) {
      box.nextElementSibling.remove();
    }
  });
}
const renderAllOhneHinweis = renderAll;
renderAll = function () {
  renderAllOhneHinweis();
  requestAnimationFrame(() => {
    try {
      tabellenHinweis();
    } catch (e) {}
  });
};
addEventListener("resize", () => {
  try {
    tabellenHinweis();
  } catch (e) {}
});
addEventListener("hashchange", () =>
  setTimeout(() => {
    try {
      tabellenHinweis();
    } catch (e) {}
  }, 60),
);
