/**
 * Fahrtenbuch
 *
 * Fahrten mit Kilometern und Anlass, Export als CSV.
 */
/* Bewusst von Hand: Start und Ziel, Zeiten und Tachostand — daraus ergibt sich alles Weitere. */
const fahrtKm = (f) => {
  const a = num(f.kmStart),
    b = num(f.kmEnde);
  if (b > a) return Math.round((b - a) * 10) / 10;
  return +f.km || 0; // ältere Einträge
};
const fahrtSort = () =>
  fahrten.sort(
    (a, b) => (b.datum || "").localeCompare(a.datum || "") || (b.von || "").localeCompare(a.von || ""),
  );

function fahrtDialog(vorhanden) {
  const f = vorhanden || { id: "f" + Date.now(), datum: dk(new Date()), art: "Business" };
  const neu = !vorhanden;
  const d = fromDk(f.datum);
  simpleDialog(
    neu ? "Fahrt hinzufügen" : "Fahrt bearbeiten",
    `${DAYS_L[(d.getDay() + 6) % 7]}, ${fmt(d)}`,
    `<div class="grp">
       <div class="sect"><span class="lb">Art der Fahrt</span>
         <div class="seg">${["Business", "Privat"]
           .map(
             (a) =>
               `<button type="button" data-fart="${a}" aria-pressed="${(f.art || "Business") === a}">${a}</button>`,
           )
           .join("")}</div></div>
       <div class="row2">
         ${fld("fbVonZeit", "Startzeit", f.von || "", "time", 'step="300"')}
         ${fld("fbBisZeit", "Endzeit", f.bis || "", "time", 'step="300"')}
       </div>
       <div class="field vorschlagfeld"><label for="fbVon_str">Startadresse</label>
         <input id="fbVon_str" data-adr="fbVon" value="${f.vonAdr || ""}" autocomplete="off" spellcheck="false">
         <div class="vorschlaege" id="fbVon_vorschlaege" hidden></div></div>
       ${settings.wohnort ? `<button type="button" class="mini" data-fbheim="von">Wohnadresse einsetzen</button>` : ""}
       <div class="field vorschlagfeld"><label for="fbBis_str">Zieladresse</label>
         <input id="fbBis_str" data-adr="fbBis" value="${f.bisAdr || ""}" autocomplete="off" spellcheck="false">
         <div class="vorschlaege" id="fbBis_vorschlaege" hidden></div></div>
       ${settings.wohnort ? `<button type="button" class="mini" data-fbheim="bis">Wohnadresse einsetzen</button>` : ""}
       <div class="row2">
         ${fld("fbKmStart", "Kilometerstand Start", f.kmStart || "", "text", 'inputmode="decimal"')}
         ${fld("fbKmEnde", "Kilometerstand Ende", f.kmEnde || "", "text", 'inputmode="decimal"')}
       </div>
       <p class="hinweis" id="fbStrecke">${fahrtKm(f) ? `Strecke: ${String(fahrtKm(f)).replace(".", ",")} km` : "Die Strecke ergibt sich aus den beiden Tachoständen."}</p>
     </div>
     <p class="err" id="fbErr" hidden></p>
     ${!neu ? `<div class="actions"><button type="button" class="btn danger" id="fbWeg">Fahrt löschen</button></div>` : ""}`,
    () => {
      const err = document.getElementById("fbErr");
      const zeig = (m) => {
        err.textContent = m;
        err.hidden = false;
      };
      const w = (id) => (document.getElementById(id).value || "").trim();
      const kmA = num(w("fbKmStart")),
        kmB = num(w("fbKmEnde"));
      if (!w("fbVon_str") || !w("fbBis_str")) return zeig("Bitte Start- und Zieladresse eintragen.");
      if (!kmA || !kmB) return zeig("Bitte beide Kilometerstände eintragen.");
      if (kmB <= kmA) return zeig("Der Endstand muss größer sein als der Startstand.");
      if (w("fbVonZeit") && w("fbBisZeit") && toDec(w("fbBisZeit")) <= toDec(w("fbVonZeit")))
        return zeig("Die Endzeit muss nach der Startzeit liegen.");
      const rec = {
        id: f.id,
        datum: f.datum,
        art: fahrtArt,
        von: w("fbVonZeit"),
        bis: w("fbBisZeit"),
        vonAdr: w("fbVon_str"),
        bisAdr: w("fbBis_str"),
        kmStart: kmA,
        kmEnde: kmB,
      };
      const i = fahrten.findIndex((x) => x.id === f.id);
      if (i >= 0) fahrten[i] = rec;
      else fahrten.push(rec);
      fahrtSort();
      closeModal();
      saveData();
      renderFahrten();
    },
    neu ? "Fahrt eintragen" : "Änderung sichern",
  );

  fahrtArt = f.art || "Business";
  const setzeArt = () =>
    sheet
      .querySelectorAll("[data-fart]")
      .forEach((b) => b.setAttribute("aria-pressed", b.dataset.fart === fahrtArt));
  sheet.querySelectorAll("[data-fart]").forEach(
    (b) =>
      (b.onclick = () => {
        fahrtArt = b.dataset.fart;
        setzeArt();
      }),
  );
  sheet.querySelectorAll("[data-fbheim]").forEach(
    (b) =>
      (b.onclick = () => {
        const el = document.getElementById(b.dataset.fbheim === "von" ? "fbVon_str" : "fbBis_str");
        if (el) el.value = settings.wohnort;
      }),
  );
  const rechne = () => {
    const a = num(document.getElementById("fbKmStart").value || ""),
      b = num(document.getElementById("fbKmEnde").value || "");
    const p = document.getElementById("fbStrecke");
    p.textContent =
      b > a
        ? `Strecke: ${String(Math.round((b - a) * 10) / 10).replace(".", ",")} km`
        : "Die Strecke ergibt sich aus den beiden Tachoständen.";
  };
  ["fbKmStart", "fbKmEnde"].forEach((id) => (document.getElementById(id).oninput = rechne));
  const weg = document.getElementById("fbWeg");
  if (weg)
    weg.onclick = () => {
      const i = fahrten.findIndex((x) => x.id === f.id);
      if (i >= 0) fahrten.splice(i, 1);
      closeModal();
      saveData();
      renderFahrten();
    };
}
var fahrtArt = "Business";

function renderFahrten() {
  const box = document.getElementById("fahrtenbuch");
  if (!box || !me) return;
  fahrtSort();
  const jetzt = dk(new Date()).slice(0, 7);
  const monat = fbMonat || jetzt;
  const imMonat = fahrten.filter((f) => (f.datum || "").slice(0, 7) === monat);
  const monate = [...new Set(fahrten.map((f) => (f.datum || "").slice(0, 7)).filter(Boolean))];
  if (!monate.includes(jetzt)) monate.push(jetzt);
  monate.sort().reverse();
  const summe = (art) =>
    imMonat.filter((f) => (f.art || "Business") === art).reduce((n, f) => n + fahrtKm(f), 0);
  const km = (n) => String(Math.round(n * 10) / 10).replace(".", ",") + " km";
  const monatsName = (m) => {
    const [j, mo] = m.split("-");
    return (
      [
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
      ][+mo - 1] +
      " " +
      j
    );
  };

  let letzterTag = "";
  const liste = imMonat
    .map((f) => {
      const d = fromDk(f.datum);
      const kopf =
        f.datum !== letzterTag ? `<div class="fbtag">${DAYS_L[(d.getDay() + 6) % 7]}, ${fmt(d)}</div>` : "";
      letzterTag = f.datum;
      return (
        kopf +
        `<button type="button" class="fbkarte ${(f.art || "Business") === "Privat" ? "privat" : "business"}" data-fbedit="${f.id}">
      <div class="fbkopf"><span class="fbart">${f.art || "Business"}</span>
        <span class="fbzeit">${f.von || "–"}${f.bis ? `–${f.bis}` : ""}</span>
        <b class="fbkm">${km(fahrtKm(f))}</b></div>
      <div class="fbstrecke"><span>${f.vonAdr || "–"}</span><i>→</i><span>${f.bisAdr || "–"}</span></div>
      ${f.kmStart || f.kmEnde ? `<div class="fbtacho">Tacho ${eur(+f.kmStart || 0)} → ${eur(+f.kmEnde || 0)}</div>` : ""}
    </button>`
      );
    })
    .join("");

  box.innerHTML = `
    <div class="asec">
      <h3>Fahrtenbuch</h3>
      <p class="sub erkl">Jede Fahrt einzeln eintragen — Datum setzt sich von selbst.</p>
      <div class="actions"><button class="btn primary" id="fbNeu">Fahrt hinzufügen</button></div>
      ${
        monate.length > 1
          ? `<div class="field jahrwahl" style="margin-top:16px"><label for="fbMonatSel">Monat</label>
        <select id="fbMonatSel">${monate
          .map((m) => `<option value="${m}" ${m === monat ? "selected" : ""}>${monatsName(m)}</option>`)
          .join("")}</select></div>`
          : ""
      }
      <div class="kpis">
        ${kpi("Business", km(summe("Business")), `${imMonat.filter((f) => (f.art || "Business") === "Business").length} Fahrten`, "hero")}
        ${kpi("Privat", km(summe("Privat")), `${imMonat.filter((f) => f.art === "Privat").length} Fahrten`)}
        ${kpi("Gesamt", km(summe("Business") + summe("Privat")), monatsName(monat))}
      </div>
      ${imMonat.length ? `<div class="actions"><button class="btn" id="fbExport">Monat als Tabelle sichern</button></div>` : ""}
    </div>
    <div class="asec fbliste">${
      liste ||
      `<p class="aempty">Noch keine Fahrt in diesem Monat.
      Oben auf „Fahrt hinzufügen“ tippen.</p>`
    }</div>`;

  document.getElementById("fbNeu").onclick = () => fahrtDialog(null);
  const sel = document.getElementById("fbMonatSel");
  if (sel)
    sel.onchange = () => {
      fbMonat = sel.value;
      renderFahrten();
    };
  box.querySelectorAll("[data-fbedit]").forEach(
    (b) =>
      (b.onclick = () => {
        const f = fahrten.find((x) => x.id === b.dataset.fbedit);
        if (f) fahrtDialog(f);
      }),
  );
  const ex = document.getElementById("fbExport");
  if (ex)
    ex.onclick = () => {
      const zeilen = imMonat
        .slice()
        .reverse()
        .map((f) =>
          [
            fmt(fromDk(f.datum)),
            f.von || "",
            f.bis || "",
            f.vonAdr || "",
            f.bisAdr || "",
            f.kmStart || "",
            f.kmEnde || "",
            String(fahrtKm(f)).replace(".", ","),
            f.art || "Business",
          ].join(";"),
        );
      const text = [
        "Datum;Start;Ende;Startadresse;Zieladresse;km Start;km Ende;Strecke;Art",
        ...zeilen,
        `Summe Business;;;;;;;${String(Math.round(summe("Business") * 10) / 10).replace(".", ",")};`,
        `Summe Privat;;;;;;;${String(Math.round(summe("Privat") * 10) / 10).replace(".", ",")};`,
      ].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
      a.download = `fahrtenbuch-${monat}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
}
var fbMonat = "";

/* Zeigt beim Anlegen an, wenn dieser Kunde schon einmal erfasst war */
function kundenTreffer() {
  const box = document.getElementById("kdTreffer");
  if (!box) return;
  const w = (id) => (document.getElementById(id)?.value || "").trim();
  const nach = w("f_nach");
  if (nach.length < 3) {
    box.innerHTML = "";
    return;
  }
  const plz = w("f_plz"),
    str = w("f_str");
  const alle = kundenListe()
    .filter((r) => {
      if (norm(r.nachname) !== norm(nach)) return false;
      if (plz && norm(r.plz) && norm(r.plz) !== norm(plz)) return false;
      if (str && norm(r.str || r.strasse) && !norm(r.str || r.strasse).includes(norm(str))) return false;
      return true;
    })
    .slice(0, 3);
  if (!alle.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<div class="kdhinweis">
    <div class="kdh1">${alle.length === 1 ? "Diesen Kunden gibt es schon" : "Diese Kunden gibt es schon"}</div>
    ${alle
      .map(
        (r, i) => `<button type="button" class="kdvorschlag" data-kduebernehmen="${i}">
      <span class="kdn">${[r.vorname, r.nachname].filter(Boolean).join(" ")}</span>
      <span class="kdm">${[r.strasse, [r.plz, r.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "ohne Adresse"}</span>
      <span class="kdm">${r.termine.length} Termin${r.termine.length > 1 ? "e" : ""} · zuletzt ${fmt(fromDk(r.letzterTermin))}${
        r.kunde ? " · hat gekauft" : ""
      }</span>
      <span class="kdu">Daten übernehmen</span></button>`,
      )
      .join("")}
  </div>`;
  box.querySelectorAll("[data-kduebernehmen]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = alle[+b.dataset.kduebernehmen];
        const setz = (id, wert) => {
          const el = document.getElementById(id);
          if (el && wert) el.value = wert;
        };
        setz("f_vor", r.vorname);
        setz("f_nach", r.nachname);
        setz("f_str", r.str || (r.strasse || "").replace(/\s*\d+\s*[a-zA-Z]?$/, ""));
        setz("f_hnr", r.hnr);
        setz("f_plz", r.plz);
        setz("f_ort", r.ort);
        setz("f_tel", r.telefon);
        const an = document.getElementById("f_anrede");
        if (an && r.anrede) an.value = r.anrede;
        box.innerHTML = `<div class="kdhinweis uebernommen">Daten von ${[r.vorname, r.nachname].filter(Boolean).join(" ")} übernommen.</div>`;
      }),
  );
}
