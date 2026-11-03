/**
 * Einstellungen – gegliedert wie am iPhone
 *
 * Gruppen statt einer langen Seite: Profil, Rolle, Darstellung,
 * Nachbereitung, Sicherheit, Daten, Info. Unterseiten (Profil,
 * Versionsverlauf) schieben sich von rechts herein.
 * Glas-Effekt und „Bewegung reduzieren“ lassen sich hier schalten.
 */
const CHEV = `<svg class="eschev" width="8" height="14" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5l5 5.5-5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ZURUECK = `<svg width="11" height="18" viewBox="0 0 11 18" aria-hidden="true"><path d="M9 2L2 9l7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SCHWEBEBAHN = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><line x1="10" y1="19" x2="54" y2="19"/><line x1="25" y1="20.5" x2="25" y2="27"/><line x1="39" y1="20.5" x2="39" y2="27"/><rect x="18" y="27" width="28" height="18" rx="7"/><line x1="19.5" y1="37" x2="44.5" y2="37"/></g></svg>`;

/* ---------- Glas-Effekt (gilt je Gerät) ---------- */
const glasAn = () => store.get("pv-glas") !== "aus";
function glasAnwenden() {
  document.documentElement.classList.toggle("glas-aus", !glasAn());
}
glasAnwenden();

/* ---------- Unterseiten ---------- */
const unterStapel = [];
function unterseiteOeffnen(titel, zurueckText, html, beimOeffnen) {
  const ebene = document.createElement("section");
  ebene.className = "unter";
  ebene.setAttribute("role", "dialog");
  ebene.setAttribute("aria-label", titel);
  ebene.innerHTML = `<div class="unternav">
      <button type="button" class="unterzurueck">${ZURUECK}<span>${zurueckText}</span></button>
      <span class="untertitel">${titel}</span></div>
    <div class="unterscroll"><h1 class="untergross">${titel}</h1>${html}</div>`;
  document.body.appendChild(ebene);
  const vorige = unterStapel[unterStapel.length - 1];
  unterStapel.push(ebene);
  ebene.querySelector(".unterzurueck").onclick = () => unterseiteSchliessen();
  const sc = ebene.querySelector(".unterscroll");
  sc.addEventListener(
    "scroll",
    () => ebene.classList.toggle("gescrollt", sc.scrollTop > 36),
    { passive: true },
  );
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      ebene.classList.add("auf");
      if (vorige) vorige.classList.add("drunter");
      else document.body.classList.add("unter-offen");
    }),
  );
  if (beimOeffnen) beimOeffnen(ebene);
  return ebene;
}
function unterseiteSchliessen(alle) {
  const n = alle ? unterStapel.length : 1;
  for (let i = 0; i < n; i++) {
    const ebene = unterStapel.pop();
    if (!ebene) break;
    ebene.classList.remove("auf");
    setTimeout(() => ebene.remove(), alle ? 0 : 420);
  }
  const oben = unterStapel[unterStapel.length - 1];
  if (oben) oben.classList.remove("drunter");
  else document.body.classList.remove("unter-offen");
}
addEventListener("hashchange", () => unterStapel.length && unterseiteSchliessen(true));

/* ---------- Hilfsbausteine ---------- */
const esZeile = (id, text, wert = "", cls = "") =>
  `<button type="button" class="esz ${cls}" id="${id}"><span class="eszt">${text}</span>${wert ? `<em>${wert}</em>` : ""}${cls.includes("rot") ? "" : CHEV}</button>`;
const esSchalter = (id, text, an) =>
  `<label class="esz"><span class="eszt">${text}</span><input type="checkbox" role="switch" class="ioswitch" id="${id}"${an ? " checked" : ""}></label>`;
function iosSeg(name, werte, aktiv, klein) {
  const i = Math.max(
    0,
    werte.findIndex(([w]) => w === aktiv),
  );
  return `<div class="ioseg${klein ? " klein" : ""}" role="group" style="--n:${werte.length};--i:${i}">
    <span class="iosegdaumen" aria-hidden="true"></span>${werte
      .map(([w, t]) => `<button type="button" data-${name}="${w}" aria-pressed="${w === aktiv}">${t}</button>`)
      .join("")}</div>`;
}
function vorTagen(ms) {
  if (!ms) return "noch nie";
  const t = Math.floor((Date.now() - ms) / 864e5);
  return t <= 0 ? "heute" : t === 1 ? "gestern" : `vor ${t} Tagen`;
}

/* ---------- Daten: einspielen und zurücksetzen ---------- */
function sicherungEinspielen(datei) {
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
    if (!confirm(`Sicherung vom ${wann} mit ${anzahl} Terminen einspielen?\n\nAlle jetzigen Einträge werden ersetzt.`))
      return;
    const vorher = clean(dataBlob());
    applyData(blob);
    shadow = JSON.parse(JSON.stringify(vorher));
    dataReady = true;
    clearTimeout(saveTimer);
    flushSave();
    renderAll();
    alert("Sicherung eingespielt.");
  };
  leser.readAsText(f);
  datei.value = "";
}
function allesZuruecksetzen() {
  if (!confirm("Alle Termine, Listen, Nachträge und Zahlen löschen?\n\nDein Profil bleibt erhalten.")) return;
  if (!confirm("Wirklich alles zurücksetzen? Das lässt sich nicht rückgängig machen.")) return;
  const vorher = clean(dataBlob());
  applyData(null);
  shadow = JSON.parse(JSON.stringify(vorher));
  dataReady = true;
  clearTimeout(saveTimer);
  flushSave();
  renderAll();
}
function neuerCodeDialog() {
  simpleDialog(
    "Neuer Wiederherstellungs-Code",
    "Der bisherige Code gilt danach nicht mehr",
    `<div class="grp"><input type="text" name="username" autocomplete="username" value="${me.dk}" readonly tabindex="-1" aria-hidden="true" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">${fld("ncPw", "Dein Passwort", "", "password", 'autocomplete="current-password"')}</div>
     <p class="err" id="ncErr" hidden></p>`,
    async () => {
      const err = document.getElementById("ncErr");
      try {
        const pw = document.getElementById("ncPw").value;
        const mk = await bestaetigePasswort(pw);
        const code = neuerWiederherstellungsCode();
        const neuUm = await mkUmschliessen(mk, codeNorm(code));
        /* Online: der Server muss den neuen Code kennen, sonst klappt „Passwort vergessen“ nicht */
        if (typeof onlineCode === "function") await onlineCode(pw, code, neuUm);
        me.mkByCode = neuUm;
        await userSet(me);
        closeModal();
        setTimeout(() => zeigeWiederherstellungsCode(code), 380);
      } catch (e) {
        err.textContent = zugangFehler(e);
        err.hidden = false;
      }
    },
    "Erzeugen",
  );
}

/* ---------- Profil-Unterseite ---------- */
function profilUnterseite() {
  unterseiteOeffnen(
    "Profil",
    "Einstellungen",
    `<div class="esgrp esform">
       <div class="field"><label>DK-Nummer</label><div class="fixed">${me.dk}</div></div>
       ${fld("pfVor", "Vorname", me.vorname)}${fld("pfNach", "Nachname", me.nachname)}
       ${fld("pfMail", "E-Mail-Adresse", me.mail || "", "email")}
       ${fld("pfEinst", "Einstellungsdatum", settings.einstellung || "", "date")}
       <div class="field vorschlagfeld"><label for="pfWohn_str">Wohnadresse</label>
         <input id="pfWohn_str" data-adr="pfWohn" value="${settings.wohnort || ""}" autocomplete="off"
           spellcheck="false" placeholder="Straße, PLZ und Ort">
         <div class="vorschlaege" id="pfWohn_vorschlaege" hidden></div></div>
     </div>
     <p class="esfuss">Das Einstellungsdatum bestimmt deine Ziele (unter 52 Wochen: Berufseinsteiger).
       Die Wohnadresse ist der Startpunkt im Fahrtenbuch.</p>
     <p class="err" id="pfErr" hidden></p>
     <div class="esaktion"><button type="button" class="btn primary" id="pfSave">Speichern</button></div>`,
    (ebene) => {
      ebene.querySelector("#pfSave").onclick = async () => {
        await profilSpeichern();
        const err = document.getElementById("pfErr");
        if (err && !err.hidden && err.textContent) return;
        const b = ebene.querySelector("#pfSave");
        b.textContent = "Gespeichert";
        setTimeout(() => unterseiteSchliessen(), 650);
      };
    },
  );
}

/* ---------- Must-have-K70-Artikel ---------- */
function mustHaveZahl() {
  return (katalog.liste || []).reduce((s, k) => s + (k.artikel || []).filter((a) => a.top).length, 0);
}
function mustHaveUnterseite() {
  const liste = katalog.liste || [];
  unterseiteOeffnen(
    "Must-have-Artikel",
    "Einstellungen",
    `<p class="esfuss" style="margin:0 4px 6px">Was eingeschaltet ist, steht in der K70-Inventur hervorgehoben.</p>
     ${liste
       .map(
         (k, ki) => `<p class="esgh">${entschaerfeText(k.kat)}</p>
       <div class="esgrp">${(k.artikel || [])
         .map(
           (a, ai) =>
             `<label class="esz"><span class="eszt">${entschaerfeText(a.n)}</span>
              <input type="checkbox" role="switch" class="ioswitch" data-must="${ki}|${ai}"${a.top ? " checked" : ""}></label>`,
         )
         .join("")}</div>`,
       )
       .join("")}`,
    (ebene) =>
      ebene.querySelectorAll("[data-must]").forEach(
        (f) =>
          (f.onchange = () => {
            const [ki, ai] = f.dataset.must.split("|").map(Number);
            const a = ((katalog.liste || [])[ki] || {}).artikel[ai];
            if (!a) return;
            if (f.checked) a.top = 1;
            else delete a.top;
            store.set("bw-katalog", katalog.liste);
            const em = document.querySelector("#esMusthave em");
            if (em) em.textContent = mustHaveZahl() + " an";
            try {
              renderInventur();
            } catch (e) {}
          }),
      ),
  );
}

/* ---------- Hauptseite ---------- */
renderProfil = async function () {
  const box = document.getElementById("profil");
  if (!box || !me) return;
  const tl = istTeamleiter();
  const ini = ((me.vorname || "")[0] || "") + ((me.nachname || "")[0] || "");
  const ruhe = typeof animStufe === "function" && animStufe() === "aus";
  const neu = store.get("pv-version-gesehen") !== VERSIONEN[0].v;
  box.innerHTML = `
    <div class="es">
      <h3 class="esseite">Einstellungen</h3>
      <button type="button" class="esich" id="esProfil">
        <span class="esav">${entschaerfeText(ini.toUpperCase() || "?")}</span>
        <span class="esichtx"><b>${entschaerfeText(`${me.vorname || ""} ${me.nachname || ""}`.trim())}</b>
          <small>${me.dk} · Profil bearbeiten</small></span>${CHEV}</button>

      <p class="esgh">Rolle</p>
      <div class="esgrp espad">${iosSeg(
        "rolle",
        [
          ["KB", "Kundenberatung"],
          ["TL", "Teamleitung"],
        ],
        tl ? "TL" : "KB",
      )}</div>
      <p class="esfuss">${
        tl
          ? "Als Teamleitung kommen Teammitglieder, Team-Wochenmeldung und Teamprovision dazu."
          : "Du siehst deine eigenen Termine, Zahlen und deine Provision."
      }</p>

      <p class="esgh">Darstellung</p>
      <div class="esgrp">
        <div class="esz"><span class="eszt">Erscheinungsbild</span>${iosSeg(
          "thema",
          [
            ["Dunkel", "Dunkel"],
            ["Hell", "Hell"],
          ],
          themaJetzt(),
          true,
        )}</div>
        ${esSchalter("esGlas", "Glas-Effekt", glasAn())}
        ${esSchalter("esRuhe", "Bewegung reduzieren", ruhe)}
        <div class="esz"><span class="eszt">iPhone Duo</span>${iosSeg(
          "duo",
          [
            ["auto", "Auto"],
            ["an", "An"],
            ["aus", "Aus"],
          ],
          typeof duoModus === "function" ? duoModus() : "auto",
          true,
        )}</div>
      </div>
      <p class="esfuss">Der Glas-Effekt macht Leisten und Fenster durchscheinend. Auf älteren Geräten
        ausschalten, falls die App ruckelt. iPhone Duo: zugeklappt läuft die Leiste rechts an der Seite,
        aufgeklappt unten; quer wird um Hochformat gebeten. „Auto“ erkennt das Gerät am Bildschirmformat.</p>

      <p class="esgh">Nachbereitung</p>
      <div class="esgrp">${esSchalter("esSchritte", "Schritt für Schritt", settings.nbSchritte !== false)}</div>
      <p class="esfuss">Führt dich nach einem Kundentermin Schritt für Schritt durch die Nachbereitung.</p>

      <p class="esgh">Sicherheit</p>
      <div class="esgrp">
        ${esZeile("esPw", "Passwort ändern")}
        ${esZeile("esCode", "Neuer Wiederherstellungs-Code")}
      </div>

      <p class="esgh">Daten</p>
      <div class="esgrp">
        ${esZeile("esSichern", "Daten sichern", vorTagen(store.get("bw-last-backup")))}
        ${esZeile("esEinspielen", "Sicherung einspielen")}
      </div>
      <p class="esfuss">Deine Daten liegen verschlüsselt nur auf diesem Gerät. Eine Sicherung schützt,
        falls die App gelöscht oder das Gerät zurückgesetzt wird.</p>
      <div class="esgrp">${esZeile("esLeeren", "Alle Einträge zurücksetzen", "", "rot")}</div>
      <input type="file" id="pfDatei" accept=".json,application/json" hidden>

      <p class="esgh">K70</p>
      <div class="esgrp">${esZeile("esMusthave", "Must-have-Artikel", mustHaveZahl() + " an")}</div>
      <p class="esfuss">Diese Artikel sind in der Inventur hervorgehoben.</p>

      <p class="esgh">Info</p>
      <div class="esgrp">
        ${esZeile("esVersionen", "Versionsverlauf", (neu ? '<i class="esneu" aria-label="Neu"></i>' : "") + aktuelleApp() + " · " + aktuelleSecurity().replace("Security", "Sec."))}
      </div>
      <div class="esgrp">${esZeile("esAbmelden", "Abmelden", "", "rot")}</div>

      <div class="esmarke">${SCHWEBEBAHN}<b>Provisio</b><span>${aktuelleApp()} · ${aktuelleSecurity()} · lokal · verschlüsselt · offline</span></div>
    </div>`;

  const $ = (id) => box.querySelector("#" + id);
  $("esProfil").onclick = profilUnterseite;
  box.querySelectorAll("[data-rolle]").forEach(
    (b) =>
      (b.onclick = async () => {
        const neuTL = b.dataset.rolle === "TL";
        if (neuTL === istTeamleiter()) return;
        const seg = b.closest(".ioseg");
        seg.style.setProperty("--i", neuTL ? 1 : 0);
        seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        me.rolle = neuTL ? ROLLE_TL : ROLLE_KB;
        await userSet(me);
        setTimeout(() => {
          if (typeof renderMenu === "function") renderMenu();
          renderAll();
        }, 320);
      }),
  );
  box.querySelectorAll("[data-thema]").forEach(
    (b) =>
      (b.onclick = () => {
        const seg = b.closest(".ioseg");
        seg.style.setProperty("--i", b.dataset.thema === "Hell" ? 1 : 0);
        seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        setTimeout(() => themaSetzen(b.dataset.thema, true), 260);
      }),
  );
  $("esGlas").onchange = (ev) => {
    store.set("pv-glas", ev.target.checked ? "an" : "aus");
    glasAnwenden();
  };
  $("esRuhe").onchange = (ev) => {
    const aus = ev.target.checked;
    settings.bewegung = aus ? "aus" : "an";
    bewegungSetzen();
    if (typeof animSetzen === "function") animSetzen(aus ? "aus" : "ruhig");
    else saveData();
  };
  $("esSchritte").onchange = (ev) => {
    settings.nbSchritte = ev.target.checked;
    saveData();
  };
  $("esPw").onclick = () => passwortAendernDialog();
  $("esCode").onclick = neuerCodeDialog;
  $("esSichern").onclick = () => {
    datenSichern();
    const em = $("esSichern").querySelector("em");
    if (em) em.textContent = "gerade eben";
  };
  const datei = $("pfDatei");
  $("esEinspielen").onclick = () => datei.click();
  datei.onchange = () => sicherungEinspielen(datei);
  $("esLeeren").onclick = allesZuruecksetzen;
  $("esMusthave").onclick = mustHaveUnterseite;
  $("esVersionen").onclick = versionenUnterseite;
  $("esAbmelden").onclick = () => {
    if (confirm("Abmelden? Deine Daten bleiben verschlüsselt auf dem Gerät.")) logout();
  };
};

/* ---------- Statistik als PDF (A4 quer) ---------- */
document.addEventListener("click", (ev) => {
  if (ev.target.closest && ev.target.closest("#statPdfBtn")) statPdf();
});

/* ---------- Untere Leiste: gleitende Markierung unter dem aktiven Reiter ---------- */
function leistenPille() {
  const bar = document.getElementById("tabbar");
  if (!bar) return;
  let p = bar.querySelector(":scope > .pvpille");
  if (!p) {
    p = document.createElement("span");
    p.className = "pvpille";
    p.setAttribute("aria-hidden", "true");
    bar.prepend(p);
  }
  const reiter = [...bar.querySelectorAll(".tab, .tabmehr")];
  const seite = (location.hash || "#heute").slice(1);
  let i = reiter.findIndex((t) => t.dataset.page === seite);
  if (i < 0 && document.body.classList.contains("menu-offen")) i = reiter.length - 1;
  p.style.opacity = i < 0 ? "0" : "1";
  if (i >= 0) p.style.transform = `translateX(${i * 100}%)`;
}
addEventListener("hashchange", () => requestAnimationFrame(leistenPille));
addEventListener("load", () => setTimeout(leistenPille, 200));

/* Druckblatt: Spaltenfarben als Variablen mitgeben – die App-Ansicht blendet Hintergründe aus */
if (typeof druckBlattBauen === "function") {
  const druckBlattOhneFarben = druckBlattBauen;
  druckBlattBauen = function () {
    const r = druckBlattOhneFarben.apply(this, arguments);
    document.querySelectorAll("#druckStat th.vh").forEach((th) => {
      const c = th.style.background || th.style.backgroundColor;
      if (c) th.style.setProperty("--vhc", c);
    });
    document.querySelectorAll("#druckStat td.tick, #druckStat td.cnt").forEach((td) => {
      if (td.style.color) td.style.setProperty("--tc", td.style.color);
    });
    return r;
  };
}
