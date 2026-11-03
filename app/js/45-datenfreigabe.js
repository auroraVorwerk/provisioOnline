/**
 * Datenfreigabe
 *
 * Berater können die Einsicht der Teamleitung einschränken (settings.datenSperre).
 * Sichtbar bleiben Wochenmeldung und Potenzialliste; Planer und Statistik sind gesperrt.
 */
(function () {
  "use strict";

  function gesperrtFuer(blob) {
    return !!(blob && blob.settings && blob.settings.datenSperre === true);
  }

  /* ---------- Zugriffsregel ---------- */
  if (typeof window.tmZugriff === "function") {
    const tmZugriffOhneSperre = window.tmZugriff;
    window.tmZugriff = function () {
      const z = tmZugriffOhneSperre.apply(this, arguments);
      try {
        if (gesperrtFuer(typeof teamBlob !== "undefined" ? teamBlob : null)) {
          return Object.assign({}, z, { voll: false, gesperrt: true });
        }
      } catch (e) {}
      return z;
    };
  }

  /* ---------- Hinweis in der Teamansicht ---------- */
  if (typeof window.renderTeam === "function") {
    const renderTeamOhneSperre = window.renderTeam;
    window.renderTeam = function () {
      const r = renderTeamOhneSperre.apply(this, arguments);
      try {
        const z = tmZugriff();
        if (!z || !z.gesperrt) return r;
        const box = document.getElementById("tmViews");
        if (!box) return r;
        const hin = box.querySelector(".tmblock .hinweis");
        const name = typeof viewUser !== "undefined" && viewUser ? viewUser.name : "Dieses Mitglied";
        if (hin)
          hin.innerHTML = `<b>${name} hat die Datenfreigabe eingeschränkt.</b> Planer und Statistik
           sind deshalb nicht einsehbar. Wochenmeldung und Potenzialliste bleiben.`;
        /* Die Zeile zum Einstellungsdatum ist hier ohne Bedeutung */
        const ez = box.querySelector(".tmeinst");
        if (ez) ez.hidden = true;
      } catch (e) {}
      return r;
    };
  }

  /* ---------- Schalter in den Einstellungen ---------- */
  function schalterBauen() {
    const box = document.getElementById("profil");
    if (!box || box.querySelector("#dsBlock")) return;
    if (typeof me === "undefined" || !me) return;

    const an = !!(settings && settings.datenSperre === true);
    const tl = typeof istTeamleiter === "function" && istTeamleiter();

    const a = document.createElement("div");
    a.className = "asec";
    a.id = "dsBlock";
    a.innerHTML = `<h3>Datenfreigabe</h3>
      <p class="sub">Was dein Teamleiter von dir sehen darf.</p>

      <label class="schalter" for="dsSperre">
        <input type="checkbox" id="dsSperre" ${an ? "checked" : ""}
               role="switch" aria-checked="${an}">
        <span class="gleis"><span class="knopf"></span></span>
        <span class="stext">
          <b>Daten verweigern</b>
          <small>Planer und Statistik bleiben für deinen Teamleiter verborgen.</small>
        </span>
      </label>

      <div class="dsliste" id="dsListe"></div>

      <p class="hinweis">Die Wochenmeldung und die Potenzialliste bleiben immer
        sichtbar — darauf stützt sich die Teamprovision und die Betreuung.
        Dieselbe Regel gilt automatisch, sobald du länger als 26 Wochen dabei bist.
        ${
          tl
            ? `<br><br>Du bist selbst Teamleiter. Der Schalter gilt für das, was
                <em>dein</em> Teamleiter von dir sieht — nicht für dein eigenes Team.`
            : ""
        }</p>`;
    box.appendChild(a);

    const s = a.querySelector("#dsSperre");
    s.addEventListener("change", () => {
      if (!s.checked) {
        /* Freigeben ist der Schritt, der Daten sichtbar macht - kurz rückfragen */
        s.checked = true;
        if (typeof simpleDialog === "function") {
          simpleDialog(
            "Daten wieder freigeben",
            "",
            `<p class="hinweis">Dein Teamleiter sieht dann wieder deinen Planer
             und kann deine Statistik als PDF laden — solange du keine 26 Wochen
             dabei bist. Wochenmeldung und Potenzialliste waren ohnehin sichtbar.</p>`,
            () => {
              setzen(false);
              closeModal();
            },
            "Freigeben",
          );
        } else {
          setzen(false);
        }
        return;
      }
      setzen(true);
    });
    listeZeichnen();
  }

  function setzen(wert) {
    try {
      settings.datenSperre = !!wert;
      if (!wert) delete settings.datenSperre;
      if (typeof saveData === "function") saveData();
    } catch (e) {}
    try {
      renderProfil();
    } catch (e) {}
  }

  function listeZeichnen() {
    const l = document.getElementById("dsListe");
    if (!l) return;
    const an = !!(settings && settings.datenSperre === true);
    const zeile = (text, sichtbar) =>
      `<div class="dszeile ${sichtbar ? "ja" : "nein"}">
         <span class="dsicon">${sichtbar ? "&#10003;" : "&#10005;"}</span>
         <span>${text}</span></div>`;
    l.innerHTML =
      zeile("Wochenmeldung · Termine, Einheiten, Umsatz je Woche", true) +
      zeile("Potenzialliste als PDF", true) +
      zeile("Dein Planer mit Namen und Adressen", !an) +
      zeile("Deine Statistik als PDF", !an);
  }

  if (typeof window.renderProfil === "function") {
    const renderProfilOhneDS = window.renderProfil;
    window.renderProfil = async function () {
      const r = await renderProfilOhneDS.apply(this, arguments);
      try {
        schalterBauen();
      } catch (e) {}
      return r;
    };
  }

  window.datenGesperrt = () => !!(typeof settings === "object" && settings && settings.datenSperre === true);
})();
