/**
 * Profil und Konto
 *
 * Profildaten, Datenexport, Kontolöschung und Sitzungspflege.
 */
const TAG = 86400000;
async function pinLesen() {
  return "";
}

/* Alle Daten als JSON-Sicherungsdatei herunterladen und den Zeitpunkt merken. */
function datenSichern() {
  const inhalt = JSON.stringify(
    {
      dk: me.dk,
      name: `${me.vorname} ${me.nachname}`,
      stand: new Date().toISOString(),
      daten: clean(dataBlob()),
    },
    null,
    1,
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([inhalt], { type: "application/json" }));
  a.download = `provisio-${me.dk}-${dk(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  store.set("bw-last-backup", Date.now());
}

/*
 * Sanfte Erinnerung: liegt die letzte Sicherung mehr als 14 Tage zurück und
 * gibt es echte Daten, einmal je Sitzung zum Sichern einladen.
 */
let sicherungGeprueft = false;
function sicherungErinnerung() {
  if (sicherungGeprueft || !me) return;
  sicherungGeprueft = true;
  const hatDaten = Object.keys(entries).length || potenzial.length || verlauf.length;
  if (!hatDaten) return;
  const letzte = store.get("bw-last-backup") || 0;
  let basis = letzte || store.get("bw-first-seen") || 0;
  if (!basis) {
    store.set("bw-first-seen", Date.now()); // ab jetzt zählen
    return;
  }
  if (Date.now() - basis < 14 * TAG) return;
  if (typeof simpleDialog !== "function") return;
  simpleDialog(
    "Daten sichern?",
    "Zur Sicherheit",
    `<p class="hinweis">Deine Daten liegen verschlüsselt auf diesem Gerät. Eine zusätzliche
       Sicherung schützt vor Verlust, falls die App gelöscht oder das Gerät zurückgesetzt wird.
       Zuletzt gesichert: ${letzte ? fmt(new Date(letzte)) : "noch nie"}.</p>`,
    () => {
      datenSichern();
      closeModal();
    },
    "Jetzt sichern",
  );
}
async function renderProfil() {
  const box = document.getElementById("profil");
  if (!box || !me) return;
  const pin = await pinLesen(me.dk);
  const letzter = me.lastLogin ? fmt(new Date(me.lastLogin)) : "–";
  box.innerHTML = `
    <div class="asec">
      <h3>Profil</h3>
      <p class="sub">${rolleName(me.rolle)} · letzte Anmeldung ${letzter}</p>
      <div class="grp">
        <div class="field"><label>DK-Nummer</label><div class="fixed">${me.dk}</div></div>
        <div class="row2">
          ${fld("pfVor", "Vorname", me.vorname)}${fld("pfNach", "Nachname", me.nachname)}
        </div>
        ${fld("pfMail", "E-Mail-Adresse (ab dem zweiten Monat)", me.mail || me.mailPending || "", "email")}
        ${fld("pfEinst", "Einstellungsdatum", settings.einstellung || "", "date")}
        <div class="field vorschlagfeld"><label for="pfWohn_str">Wohnadresse — Start im Fahrtenbuch</label>
          <input id="pfWohn_str" data-adr="pfWohn" value="${settings.wohnort || ""}" autocomplete="off" spellcheck="false"
            placeholder="Straße, PLZ und Ort">
          <div class="vorschlaege" id="pfWohn_vorschlaege" hidden></div></div>
        <p class="hinweis" style="margin-top:0">Im Fahrtenbuch lässt sie sich dann mit einem Tipp
          als Start- oder Zieladresse einsetzen.</p>
        <p class="hinweis" style="margin-top:0">Wer weniger als 52 Wochen dabei ist, gilt als Berufseinsteiger —
          davon hängen die Ziele ab.</p>
        ${me.mailPending && !me.mail ? `<p class="hinweis bleibt">Für ${me.mailPending} steht die Bestätigung noch aus.</p>` : ""}
      </div>
      <p class="err" id="pfErr" hidden></p>
      <div class="ah4">Was gerade läuft</div>
      <div class="grp"><div class="aline"><span class="nm">Programmstand</span>
          <span class="vl">${BUILD}</span></div>
        <div class="aline"><span class="nm">Stilvorlage geladen</span>
          <span class="vl" id="pfCss">wird geprüft …</span></div>
        <div class="aline"><span class="nm">Telefon: Bewegung reduzieren</span>
          <span class="vl" id="pfMotion">–</span></div>
        <div class="aline"><span class="nm">Animationen in der App</span>
          <span class="vl" id="pfAnim">–</span></div>
      </div>

      <div class="ah4">Erscheinungsbild</div>
      <div class="grp"><div class="seg">${["Dunkel", "Hell"]
        .map(
          (t) => `<button type="button" data-thema="${t}"
          aria-pressed="${themaJetzt() === t}">${t}</button>`,
        )
        .join("")}</div>
        <div class="field" style="margin-top:14px"><label>Bewegung</label>
          <div class="seg">${[
            ["system", "Wie im System"],
            ["an", "Immer an"],
            ["aus", "Aus"],
          ]
            .map(
              ([w, t]) =>
                `<button type="button" data-bewegung="${w}"
                 aria-pressed="${bewegungJetzt() === w}">${t}</button>`,
            )
            .join("")}</div>
          <p class="hinweis">Steht am Telefon unter Bedienungshilfen „Bewegung reduzieren“ an,
            sind die Animationen der App aus. Mit „Immer an“ laufen sie trotzdem.</p></div>
      </div>
      <div class="actions"><button class="btn primary" id="pfSave">Speichern</button></div>
      <p class="hinweis">Die App läuft nur auf diesem Gerät. Dein Passwort kannst du unter
        „Einstellungen“ ändern; vergisst du es, setzt ein Admin-Zugang deinen Zugang im Profil
        zurück und du vergibst mit derselben DK-Nummer ein neues — deine Daten bleiben erhalten.</p>
      <div class="sicherung">
        <p class="hinweis"><button type="button" class="mini" id="pfBackup">Daten sichern</button>
          legt eine Datei mit allen deinen Einträgen auf dem Gerät ab.</p>
        <p class="hinweis"><button type="button" class="mini" id="pfRestore">Sicherung einspielen</button>
          ersetzt alle Einträge durch den Stand aus einer solchen Datei — auch aus einer Serversicherung.
          <input type="file" id="pfDatei" accept=".json,application/json" hidden></p>
        <p class="hinweis"><button type="button" class="mini gefahr" id="pfLeeren">Alle Einträge zurücksetzen</button>
          löscht Termine, Listen und Zahlen — Profil und Kalender bleiben.</p>
      </div>
      <p class="buildzeile">Stand ${BUILD}</p>
    </div>`;
  document.getElementById("pfSave").onclick = () => {
    profilSpeichern();
    const b = document.getElementById("pfSave");
    if (b && !b.dataset.laeuft) {
      b.dataset.laeuft = "1";
      const alt = b.textContent;
      b.textContent = "Gespeichert ✓";
      b.classList.add("okpuls");
      setTimeout(() => {
        b.textContent = alt;
        b.classList.remove("okpuls");
        delete b.dataset.laeuft;
      }, 1800);
    }
  };
  const rs = document.getElementById("pfRestore");
  const datei = document.getElementById("pfDatei");
  if (rs) rs.onclick = () => datei.click();
  if (datei)
    datei.onchange = () => {
      const f = datei.files && datei.files[0];
      if (!f) return;
      const leser = new FileReader();
      leser.onload = () => {
        let paket;
        try {
          paket = JSON.parse(leser.result);
        } catch (e) {
          alert("Diese Datei lässt sich nicht lesen.");
          return;
        }
        const blob = paket && paket.daten ? paket.daten : paket;
        if (!blob || typeof blob !== "object" || !("entries" in blob)) {
          alert("Das sieht nicht nach einer Sicherung aus.");
          return;
        }
        const anzahl = Object.keys(blob.entries || {}).length;
        const wann = paket && paket.stand ? new Date(paket.stand).toLocaleString("de-DE") : "unbekannt";
        if (
          !confirm(
            `Sicherung vom ${wann} mit ${anzahl} Terminen einspielen?\n\nAlle jetzigen Einträge werden ersetzt.`,
          )
        )
          return;
        if (!confirm("Wirklich einspielen? Das lässt sich nicht rückgängig machen.")) return;
        const vorher = clean(dataBlob());
        applyData(blob);
        shadow = JSON.parse(JSON.stringify(vorher)); // erzwingt das Schreiben aller Unterschiede
        dataReady = true;
        clearTimeout(saveTimer);
        flushSave();
        renderAll();
        alert("Sicherung eingespielt.");
      };
      leser.readAsText(f);
      datei.value = "";
    };

  const leeren = document.getElementById("pfLeeren");
  if (leeren)
    leeren.onclick = () => {
      if (
        !confirm(
          "Alle Termine, Listen, Nachträge und Zahlen löschen?\n\nProfil und Kalenderabo bleiben erhalten.",
        )
      )
        return;
      if (!confirm("Wirklich alles zurücksetzen? Das lässt sich nicht rückgängig machen.")) return;
      const vorher = clean(dataBlob());
      applyData(null);
      shadow = JSON.parse(JSON.stringify(vorher));
      dataReady = true;
      clearTimeout(saveTimer);
      flushSave();
      renderAll();
      alert("Alle Einträge wurden zurückgesetzt.");
    };

  const bk = document.getElementById("pfBackup");
  if (bk)
    bk.onclick = () => {
      datenSichern();
      bk.textContent = "gesichert";
      setTimeout(() => (bk.textContent = "Daten sichern"), 1800);
    };
  /*
   * Sagt in einem Satz, ob der neue Stand wirklich angekommen ist -
   * statt dass wir es per Screenshot raten müssen.
   */
  (function selbstauskunft() {
    const css = document.getElementById("pfCss");
    if (css) {
      const link = document.querySelector('link[href*="ui.css"]');
      const geladen = [...document.styleSheets].some((b) => (b.href || "").includes("ui.css"));
      const regel = getComputedStyle(document.documentElement).getPropertyValue("--tab-h").trim();
      css.textContent =
        (link ? link.getAttribute("href").split("=")[1] : "?") +
        (geladen && regel ? " · aktiv" : " · NICHT aktiv");
    }
    const mm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = document.getElementById("pfMotion");
    if (m) m.textContent = mm ? "an" : "aus";
    const a = document.getElementById("pfAnim");
    if (a)
      a.textContent =
        bewegungJetzt() === "aus" || (mm && bewegungJetzt() !== "an") ? "laufen nicht" : "laufen";
  })();
  box.querySelectorAll("[data-thema]").forEach(
    (b) =>
      (b.onclick = () => {
        themaSetzen(b.dataset.thema, true);
        renderProfil();
      }),
  );
  box.querySelectorAll("[data-bewegung]").forEach(
    (b) =>
      (b.onclick = () => {
        settings.bewegung = b.dataset.bewegung;
        bewegungSetzen();
        saveData();
        renderProfil();
      }),
  );
}
async function profilSpeichern() {
  const err = document.getElementById("pfErr");
  const zeig = (m) => {
    err.textContent = m;
    err.hidden = !m;
    err.classList.remove("ok");
  };
  zeig("");
  const vor = document.getElementById("pfVor").value.trim();
  const nach = document.getElementById("pfNach").value.trim();
  const mail = document.getElementById("pfMail").value.trim().toLowerCase();
  const wohn = document.getElementById("pfWohn_str");
  if (wohn) {
    const v = wohn.value.trim();
    if (v) settings.wohnort = v;
    else {
      delete settings.wohnort;
      delete settings.wohnLat;
      delete settings.wohnLon;
    }
    if (adrZielFeld && adrZielFeld.feld === "pfWohn" && adrZielFeld.lat) {
      settings.wohnLat = +adrZielFeld.lat;
      settings.wohnLon = +adrZielFeld.lon;
    }
    saveData();
  }
  const einst = document.getElementById("pfEinst");
  if (einst) {
    const v = einst.value.trim();
    if (v) settings.einstellung = v;
    else delete settings.einstellung;
    saveData();
  }
  if (!vor || !nach) return zeig("Vor- und Nachname dürfen nicht leer sein.");
  if (mail && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(mail))
    return zeig("Diese E-Mail-Adresse sieht nicht gültig aus.");
  try {
    /* Lokal: die E-Mail wird einfach im Nutzersatz gespeichert, ohne Bestätigung. */
    me = { ...me, vorname: vor, nachname: nach };
    if (mail) me.mail = mail;
    else delete me.mail;
    delete me.mailPending;
    await userSet(me, ["mailPending"]);
    renderMenu();
    zeig("");
    renderProfil();
  } catch (e2) {
    zeig(e2.message || "Speichern fehlgeschlagen.");
  }
}

/* ---------- Sitzungspflege ---------- */
const NEUANMELDUNG_NACH = 60 * TAG,
  PAUSE_MAX = 14 * TAG;
function sitzungAbgelaufen(u) {
  const jetzt = Date.now();
  const gesehen = store.get("bw-lastseen") || 0;
  if (u.lastLogin && jetzt - u.lastLogin > NEUANMELDUNG_NACH)
    return "Aus Sicherheitsgründen bitte alle 60 Tage neu anmelden.";
  if (gesehen && jetzt - gesehen > PAUSE_MAX)
    return "Du warst länger als zwei Wochen nicht da — bitte einmal neu anmelden.";
  return "";
}

/* Wie viele Wochen in Folge wurde das Wochenziel erreicht? */
function zielSerie() {
  if (!(wunsch.einkommen > 0)) return { wochen: 0, beste: 0 };
  let lauf = 0,
    beste = 0,
    aktuell = 0,
    erste = true;
  const m = mondayOf(new Date());
  for (let i = 0; i < 104; i++) {
    const von = new Date(m);
    von.setDate(von.getDate() - i * 7);
    const bis = new Date(von);
    bis.setDate(bis.getDate() + 6);
    const vm = vertriebsmonat(von);
    const ziel = monatsZiel(vm);
    const wochenziel = (ziel.fg + ziel.wg) / vm.weeks;
    if (!wochenziel) break;
    const u = umsatz(dk(von), dk(bis));
    const erreicht = u.fg + u.wg >= wochenziel;
    if (erreicht) {
      lauf++;
      beste = Math.max(beste, lauf);
    } else {
      if (erste) aktuell = lauf;
      lauf = 0;
    }
    if (erste && !erreicht) erste = false;
  }
  return { wochen: erste ? lauf : aktuell, beste: Math.max(beste, erste ? lauf : aktuell) };
}
