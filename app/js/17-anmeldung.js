/**
 * Anmeldung (lokal)
 *
 * Registrierung und Anmeldung ausschließlich auf dem Gerät. Das Passwort wird
 * nicht im Klartext gespeichert, sondern als gesalzener PBKDF2-Hash im lokalen
 * Nutzersatz. Es gibt keine Netz-Anmeldung und kein Zurücksetzen per E-Mail.
 */
const loginEl = document.getElementById("login"),
  loginBox = document.getElementById("loginBox");
let lgStep = "start",
  lg = {},
  lgErrText = "",
  lgBusy = false;
const FALSCH = "Passwort oder Daten falsch, bitte überprüfen.";

/*
 * ---------- Passwort und Verschlüsselung ----------
 * Das Passwort wird nicht gespeichert. Richtig ist es genau dann, wenn sich mit
 * ihm der umschlossene Master Key (u.mkByPw) öffnen lässt – dann ist auch die
 * Datei entschlüsselbar. Die Krypto-Bausteine stehen in 16-cloud-sync.js.
 */
/* Master Key + Umschläge für Passwort und Wiederherstellungs-Code anlegen. */
async function kontoKryptoAnlegen(u, pw, code) {
  const mk = await neuerMasterKey();
  u.mkByPw = await mkUmschliessen(mk, pw);
  u.mkByCode = await mkUmschliessen(mk, codeNorm(code));
  delete u.pwHash; // Reste aus älteren Ständen
  delete u.pwSalt;
  delete u.uid;
  masterKey = mk;
  return mk;
}
/* Mit dem Passwort anmelden: Master Key öffnen (oder null bei falschem Passwort). */
async function kontoOeffnenMitPw(u, pw) {
  const mk = await mkOeffnen(u && u.mkByPw, pw);
  if (mk) masterKey = mk;
  return mk;
}

/* Leere Hüllen für frühere Aufrufer (PIN-Wiederherstellung gibt es nicht mehr). */
async function pinSpeichern() {}
async function pinOeffnen() {
  throw new Error("Die PIN-Wiederherstellung gibt es nicht mehr.");
}
/* E-Mail des Zugangs je DK lokal merken; die Datenbank gibt sie vor der Anmeldung nicht preis. */
const mailMerken = (dk, m) => {
  if (dk && m && !/@bunte-woche\.app$/.test(m)) store.set("bw-mail-" + dk, m);
};
const mailGemerkt = (dk) => store.get("bw-mail-" + dk) || "";

/* Autofill: nur die DK-Nummer gilt als Benutzername (autocomplete="username") */
const feld = (id, l, v = "", extra = "") =>
  `<div class="field"><label for="${id}">${l}</label><input id="${id}" value="${v}"${
    /autocomplete=/.test(extra) ? "" : ' autocomplete="off"'
  } spellcheck="false" ${extra}></div>`;
const EYE_AN = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg>`;
const EYE_AUS = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2 12s3.6-6 10-6c2.1 0 3.9.6 5.4 1.5M22 12s-3.6 6-10 6c-2.1 0-3.9-.6-5.4-1.5"/><line x1="4" y1="20" x2="20" y2="4"/></svg>`;
const pwFeld = (id, l, ac = "new-password") => `<div class="field pw"><label for="${id}">${l}</label>
  <input id="${id}" type="password" autocomplete="${ac}" placeholder="••••••••">
  <button type="button" class="eye" data-eye="${id}" aria-label="Passwort anzeigen">${EYE_AN}</button></div>`;
const wert = (id) => {
  const e = document.getElementById(id);
  return e ? e.value.trim() : "";
};

/*
 * ---------- Passwortregeln ----------
 * Mindestens 8 Zeichen mit Groß- und Kleinbuchstabe, Zahl und Sonderzeichen.
 * Wird bei Registrierung und Passwortänderung geprüft.
 */
const PW_REGEL_TEXT = "mind. 8 Zeichen · Groß- und Kleinbuchstabe · Zahl · Sonderzeichen";
function pwRegelFehler(pw) {
  if ((pw || "").length < 8) return "Das Passwort braucht mindestens 8 Zeichen.";
  if (!/[A-ZÄÖÜ]/.test(pw)) return "Das Passwort braucht mindestens einen Großbuchstaben.";
  if (!/[a-zäöüß]/.test(pw)) return "Das Passwort braucht mindestens einen Kleinbuchstaben.";
  if (!/[0-9]/.test(pw)) return "Das Passwort braucht mindestens eine Zahl.";
  if (!/[^A-Za-z0-9ÄÖÜäöüß]/.test(pw)) return "Das Passwort braucht mindestens ein Sonderzeichen.";
  return "";
}
function lgFehler(t) {
  lgErrText = t;
  renderLogin();
}

function renderLogin() {
  const kopf = `<div class="lgmark">Provisio</div>`;
  const fehler = lgErrText ? `<p class="err">${lgErrText}</p>` : "";
  const laden = lgBusy ? ` disabled` : "";
  let h = "";
  if (lgStep === "start") {
    h =
      kopf +
      `<h2>Willkommen</h2><p class="lgsub">Melde dich an oder lege deinen Zugang an.</p>
      <button class="opt" data-go="login">Anmelden</button>
      <button class="opt" data-go="reg1">Neu registrieren</button>`;
  }
  if (lgStep === "login") {
    h =
      kopf +
      `<h2>Anmelden</h2><p class="lgsub">DK-Nummer und Passwort entsperren deine verschlüsselten Daten.</p>
      ${feld("lgDk", "DK-Nummer", lg.dk || "", 'placeholder="DK00000000" autocomplete="username" autocapitalize="characters" name="username"')}
      ${pwFeld("lgPw", "Passwort", "current-password")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy ? "einen Moment …" : "Anmelden"}</button>
      <button class="linkbtn" data-go="forgot">Passwort vergessen?</button>
      <button class="zurueck" data-go="start">Zurück</button>`;
  }
  if (lgStep === "reg1") {
    h =
      kopf +
      `<h2>Neu registrieren</h2><p class="lgsub">Deine Daten und ein selbst gewähltes Passwort.</p>
      <div class="row2">${feld("lgVor", "Vorname", lg.vor || "", 'autocomplete="given-name"')}${feld("lgNach", "Nachname", lg.nach || "", 'autocomplete="family-name"')}</div>
      ${feld("lgDk", "DK-Nummer", lg.dk || "", 'placeholder="DK00000000" autocomplete="username" autocapitalize="characters" name="username"')}
      ${pwFeld("lgPw", "Passwort")}
      <p class="lghint" style="margin:-6px 0 10px">${PW_REGEL_TEXT}</p>
      ${pwFeld("lgPw2", "Passwort wiederholen")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy ? "einen Moment …" : "Registrieren"}</button>
      <button class="zurueck" data-go="start">Zurück</button>`;
  }
  if (lgStep === "forgot") {
    h =
      kopf +
      `<h2>Passwort vergessen</h2><p class="lgsub">Mit deinem Wiederherstellungs-Code setzt du ein neues Passwort. Deine Daten bleiben erhalten.</p>
      ${feld("lgDk", "DK-Nummer", lg.dk || "", 'placeholder="DK00000000" autocomplete="username" autocapitalize="characters" name="username"')}
      ${feld("lgCode", "Wiederherstellungs-Code", lg.code || "", 'placeholder="XXXX-XXXX-XXXX-…" autocapitalize="characters" spellcheck="false"')}
      ${pwFeld("lgPw", "Neues Passwort")}
      <p class="lghint" style="margin:-6px 0 10px">${PW_REGEL_TEXT}</p>
      ${pwFeld("lgPw2", "Neues Passwort wiederholen")}
      ${fehler}
      <button class="btn primary" id="lgGo"${laden}>${lgBusy ? "einen Moment …" : "Neues Passwort setzen"}</button>
      <p class="lgsub" style="margin-top:14px">Kein Code mehr? Ohne Passwort und ohne Code lassen sich die verschlüsselten Daten nicht mehr öffnen — dann hilft nur eine eigene Sicherung (Export).</p>
      <button class="zurueck" data-go="login">Zurück</button>`;
  }
  loginBox.innerHTML =
    h +
    `<p class="lghint">DK-Nummer: DK und acht Ziffern ohne Leerzeichen.<br>Für alle gleich, auch für Teamleiter.</p>`;
  const go = document.getElementById("lgGo");
  if (go) go.onclick = lgWeiter;
}
loginBox.addEventListener("click", (ev) => {
  const nav = ev.target.closest("[data-go]");
  if (nav) {
    merkeEingaben();
    lgErrText = "";
    lgStep = nav.dataset.go;
    renderLogin();
    return;
  }
});
/* Auge-Umschalter überall auf der Seite */
document.addEventListener("click", (ev) => {
  const eye = ev.target.closest("[data-eye]");
  if (!eye) return;
  const inp = document.getElementById(eye.dataset.eye);
  if (!inp) return;
  inp.type = inp.type === "password" ? "text" : "password";
  eye.innerHTML = inp.type === "password" ? EYE_AN : EYE_AUS;
  eye.setAttribute("aria-label", inp.type === "password" ? "Passwort anzeigen" : "Passwort verbergen");
});
loginBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lgWeiter();
});
function merkeEingaben() {
  if (document.getElementById("lgDk")) {
    /* Präfix TL- wird entfernt; Anmeldung erfolgt immer mit der reinen DK-Nummer. */
    lg.dk = wert("lgDk").toUpperCase().replace(/\s/g, "").replace(/^TL-/, "");
  }
  if (document.getElementById("lgVor")) lg.vor = wert("lgVor");
  if (document.getElementById("lgNach")) lg.nach = wert("lgNach");
  if (document.getElementById("lgMail")) lg.mail = wert("lgMail").toLowerCase();
  if (document.getElementById("lgCode")) lg.code = wert("lgCode");
}
const nameGleich = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

async function lgWeiter() {
  if (lgBusy) return;
  merkeEingaben();
  lgErrText = "";
  const dk = lg.dk || "";
  const pw = wert("lgPw"),
    pw2 = wert("lgPw2");

  if (["login", "reg1"].includes(lgStep) && !DK_RE.test(dk))
    return lgFehler("Die DK-Nummer besteht aus DK und acht Ziffern.");

  if (["login", "reg1"].includes(lgStep) && !CRYPTO_OK)
    return lgFehler(
      "Für die Verschlüsselung muss die App über https:// oder http://localhost laufen " +
        "(nicht als reine Datei). Bitte so öffnen.",
    );

  lgBusy = true;
  renderLogin();
  try {
    /* ---- Anmelden: mit dem Passwort den Master Key öffnen ---- */
    if (lgStep === "login") {
      if (!pw) throw new Error(FALSCH);
      const u = await userGet(dk);
      if (!u || !u.mkByPw) throw new Error(FALSCH);
      const mk = await kontoOeffnenMitPw(u, pw);
      if (!mk) throw new Error(FALSCH);
      if (lg.mail) {
        u.mail = lg.mail;
        await userSet(u);
      }
      store.set("bw-session", { dk });
      return starteSitzung(u);
    }

    /* ---- Registrieren: Konto anlegen, Master Key + Wiederherstellungs-Code erzeugen ---- */
    if (lgStep === "reg1") {
      if (!lg.vor || !lg.nach) throw new Error("Bitte Vor- und Nachnamen eintragen.");
      const pf = pwRegelFehler(pw);
      if (pf) throw new Error(pf);
      if (pw !== pw2) throw new Error("Die beiden Passwörter stimmen nicht überein.");
      const vorhanden = await userGet(dk);
      if (vorhanden && vorhanden.mkByPw)
        throw new Error("Diese DK-Nummer ist auf diesem Gerät bereits angelegt. Bitte anmelden.");
      if (vorhanden && (!nameGleich(vorhanden.vorname, lg.vor) || !nameGleich(vorhanden.nachname, lg.nach)))
        throw new Error("Zu dieser DK-Nummer ist ein anderer Name hinterlegt.");
      const u = vorhanden
        ? { ...vorhanden, vorname: lg.vor, nachname: lg.nach }
        : { dk, vorname: lg.vor, nachname: lg.nach, rolle: rolleAus(dk), team: [] };
      if (lg.mail) u.mail = lg.mail;
      const code = neuerWiederherstellungsCode();
      await kontoKryptoAnlegen(u, pw, code); // setzt masterKey
      await userSet(u);
      store.set("bw-session", { dk });
      /* Login-Overlay ausblenden, damit der Code-Dialog bedienbar ist und keine
         Begrüßungsanimation darüber läuft; danach erst die Sitzung starten. */
      loginEl.hidden = true;
      await zeigeWiederherstellungsCode(code);
      await starteSitzung(u);
      return; // kein Rundgang mehr beim ersten Start
    }

    /* ---- Passwort vergessen: mit dem Wiederherstellungs-Code neues Passwort setzen ---- */
    if (lgStep === "forgot") {
      if (!DK_RE.test(dk)) throw new Error("Die DK-Nummer besteht aus DK und acht Ziffern.");
      const u = await userGet(dk);
      if (!u || !u.mkByCode) throw new Error("Zu dieser DK-Nummer gibt es auf diesem Gerät keinen Zugang.");
      const pf = pwRegelFehler(pw);
      if (pf) throw new Error(pf);
      if (pw !== pw2) throw new Error("Die beiden neuen Passwörter stimmen nicht überein.");
      const mk = await mkOeffnen(u.mkByCode, codeNorm(lg.code));
      if (!mk) throw new Error("Der Wiederherstellungs-Code stimmt nicht.");
      masterKey = mk;
      u.mkByPw = await mkUmschliessen(mk, pw); // Passwort neu umschließen
      await userSet(u);
      store.set("bw-session", { dk });
      return starteSitzung(u);
    }
  } catch (err) {
    lgBusy = false;
    return lgFehler(err.message || FALSCH);
  }
}

/* Den Wiederherstellungs-Code genau einmal anzeigen (Promise löst beim Bestätigen). */
function zeigeWiederherstellungsCode(code) {
  return new Promise((resolve) => {
    if (typeof simpleDialog !== "function") return resolve();
    simpleDialog(
      "Dein Wiederherstellungs-Code",
      "Einmalig — jetzt sicher notieren",
      `<div class="grp">
         <p class="hinweis" style="margin-top:0">Damit setzt du ein neues Passwort, falls du deins vergisst.
           <b>Nur mit Passwort oder diesem Code</b> kommst du wieder an deine Daten — wir können ihn nicht
           noch einmal anzeigen. Bewahre ihn getrennt vom Gerät auf.</p>
         <div id="rcCode" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.05rem;
           letter-spacing:1px;padding:14px;background:var(--surface-2);border-radius:12px;
           text-align:center;word-break:break-all;-webkit-user-select:all;user-select:all">${code}</div>
         <div class="actions"><button type="button" class="btn" id="rcCopy">Code kopieren</button></div>
       </div>`,
      () => {
        closeModal();
        resolve();
      },
      "Ich habe ihn notiert",
    );
    const c = document.getElementById("rcCopy");
    if (c)
      c.onclick = () => {
        navigator.clipboard
          .writeText(code)
          .then(() => (c.textContent = "Kopiert"))
          .catch(() => (c.textContent = "Kopieren nicht möglich"));
      };
  });
}
/* Zugänge werden lokal nicht als "gelöscht" markiert – nur noch als Stub vorhanden. */
async function istGeloescht(dk) {
  return false;
}
async function starteSitzung(u) {
  me = u;
  /* Einen lokal angepassten K70-Katalog übernehmen (sonst bleibt der Werkskatalog). */
  try {
    const k = store.get("bw-katalog");
    if (k && k.length) katalog.liste = k;
  } catch (e) {}
  if (me.thema) themaSetzen(me.thema);
  me.lastLogin = Date.now();
  store.set("bw-lastseen", Date.now());
  await userSet(me); // lastLogin und evtl. neu gesetztes Passwort sichern
  dataReady = false;
  applyData(await loadData(u.dk));
  shadow = JSON.parse(JSON.stringify(clean(dataBlob())));
  dataReady = true;
  await flushSave(); // verschlüsselte Datei sofort anlegen/aktualisieren
  lgBusy = false;
  lg = {};
  lgStep = "start";
  lgErrText = "";
  loginEl.hidden = true;
  renderMenu();
  await fuelleMemberSelect();
  renderAll();
  if (istTeamleiter()) teamVergleich();
  /* Sanfte Sicherungs-Erinnerung, aber nicht mitten in Begrüßung/Tour. */
  if (typeof sicherungErinnerung === "function") setTimeout(sicherungErinnerung, 1500);
}
async function logout() {
  clearTimeout(saveTimer);
  await flushSave(); // verschlüsselt sichern, bevor der Schlüssel verfällt
  dataReady = false;
  masterKey = null; // ohne Schlüssel ist die Datei wieder unlesbar
  store.del("bw-session");
  me = null;
  viewUser = null;
  applyData(null);
  shadow = {};
  lgStep = "start";
  lg = {};
  lgErrText = "";
  renderLogin();
  loginEl.hidden = false;
  location.hash = "#heute";
  setMenu(false);
}
