/**
 * Einstellungen und Teamverwaltung
 *
 * Einstellungsseite mit Hilfe und Zugangsdaten, Nichtkauf-Grund direkt in der
 * Nachbereitung, Teammitglieder entfernen sowie Berater ohne App anlegen
 * und deren Wochenmeldung manuell erfassen.
 */

/* ---------- 1 · Einstellungen ---------- */
PAGES.profil = "Einstellungen";
(function () {
  const i = MENUE.findIndex((m) => m[0] === "profil");
  if (i >= 0) MENUE[i] = ["profil", "Einstellungen"];
  const h = MENUE.findIndex((m) => m[0] === "faq");
  if (h >= 0) MENUE.splice(h, 1); // Hilfe ist Teil der Einstellungen
})();

const renderProfilAlt = renderProfil;
renderProfil = async function () {
  await renderProfilAlt();
  const box = document.getElementById("profil");
  if (!box || !me || box.querySelector("#rsZugang")) return;
  const h3 = box.querySelector(".asec h3");
  if (h3 && h3.textContent.trim() === "Profil") h3.textContent = "Einstellungen";

  const zugang = document.createElement("div");
  zugang.className = "asec";
  zugang.id = "rsZugang";
  zugang.innerHTML = `<h3>Zugangsdaten</h3>
    <p class="sub">Nur für dich sichtbar. Angemeldet wird immer mit der DK-Nummer.</p>
    <div class="rsliste">
      <div class="rszeile"><span>DK-Nummer</span><b>${me.dk.replace(/^TL-/, "")}</b></div>
      <div class="rszeile"><span>Passwort</span><b id="rsPw">••••••••</b>
        <button class="mini" id="rsPwNeu">ändern</button></div>
    </div>
    <p class="hinweis" id="rsHinweis" hidden></p>`;
  const hilfe = document.createElement("div");
  hilfe.className = "asec";
  hilfe.innerHTML = `<h3>Hilfe</h3>
    <p class="sub">Erste Schritte und Antworten auf häufige Fragen.</p>
    <div class="actions"><button class="btn" id="rsHilfe">Hilfe öffnen</button></div>`;
  box.insertBefore(zugang, box.children[1] || null);
  box.appendChild(hilfe);

  /* Rolle: jeder kann sich selbst zwischen Kundenberater und Teamleiter umschalten */
  if (!box.querySelector("#rsRolle")) {
    const tl = istTeamleiter();
    const rolle = document.createElement("div");
    rolle.className = "asec";
    rolle.id = "rsRolle";
    rolle.innerHTML = `<h3>Rolle</h3>
      <p class="sub">Als Teamleiter bekommst du zusätzlich Teammitglieder, Team-Wochenmeldung
        und Teamumsatz. Du kannst jederzeit wechseln.</p>
      <div class="seg" role="group" aria-label="Rolle">
        <button type="button" data-rolle="KB" aria-pressed="${!tl}">Kundenberater</button>
        <button type="button" data-rolle="TL" aria-pressed="${tl}">Teamleiter</button>
      </div>`;
    box.insertBefore(rolle, box.children[1] || null);
    rolle.querySelectorAll("[data-rolle]").forEach(
      (b) =>
        (b.onclick = async () => {
          me.rolle = b.dataset.rolle === "TL" ? ROLLE_TL : ROLLE_KB;
          await userSet(me);
          if (typeof renderMenu === "function") renderMenu();
          renderAll();
          renderProfil();
        }),
    );
  }

  const hinweis = (t) => {
    const p = document.getElementById("rsHinweis");
    p.textContent = t;
    p.hidden = !t;
  };
  document.getElementById("rsHilfe").onclick = () => {
    location.hash = "faq";
  };
  document.getElementById("rsPwNeu").onclick = () => passwortAendernDialog();
};

/* ---------- 2 · Nichtkauf: nur der Grund ---------- */

function nkGrundHTML(n) {
  const gew = n.nkgruende || [];
  return `<div class="grp nkgrund">
      <div class="sect"><span class="lb">Warum nicht gekauft? (mehrfach möglich)</span>
        <div class="nkchips">${NK_GRUENDE.map(
          (g) =>
            `<button type="button" class="nkchip${gew.includes(g) ? " an" : ""}" data-nkg="${g.replace(/"/g, "&quot;")}"
             aria-pressed="${gew.includes(g)}">${g}</button>`,
        ).join("")}</div></div>
      ${fld("grund", "Eigener Grund (freiwillig)", n.grund || "")}
      <p class="hinweis">Der Kunde kommt mit dem vollen Potenzial in die Potenzialliste.
        Was er schon besitzt, trägst du dort nach.</p>
    </div>`;
}
const nbFormAlt = nbForm;
nbForm = function () {
  let h = nbFormAlt();
  const n = draft.nb || {};
  /* Das Potenzial-Formular weicht dem Grund */
  h = h.replace(
    /<div class="grp">\s*<div class="actions"><button type="button" class="btn[^"]*" id="potOeffnen">[\s\S]*?<\/button><\/div>\s*<\/div>/g,
    nkGrundHTML(n),
  );
  /* Die Wiedervorlage-Abfrage fällt weg */
  h = h.replace(
    /<div class="h4">Wiedervorlage<\/div>\s*<div class="grp">\s*<div class="field"><label for="wvMonat">[\s\S]*?<\/div>\s*<\/div>/,
    "",
  );
  return h;
};
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-nkg]");
  if (!b || typeof draft === "undefined" || !draft) return;
  collect();
  const g = b.dataset.nkg;
  const l = (draft.nb.nkgruende = draft.nb.nkgruende || []);
  const i = l.indexOf(g);
  if (i >= 0) l.splice(i, 1);
  else l.push(g);
  draft.nb.besitz = draft.nb.besitz || []; // nichts gilt als vorhanden – volles Potenzial
  repaint();
});

/* ---------- 3 · Team ---------- */
function teamManuell() {
  return settings.teamManuell || (settings.teamManuell = []);
}
function teamMeldungen() {
  return settings.teamMeldungen || (settings.teamMeldungen = {});
}

/* Knopf zum Anlegen eines Teammitglieds oben auf der Teammitglieder-Seite */
function teamLeisteEinbauen() {
  const bar = document.querySelector("#page-team .teambar");
  if (!bar || bar.querySelector("#tmOhneApp")) return;
  bar.insertAdjacentHTML(
    "beforeend",
    `<button class="btn primary" id="tmOhneApp">Teammitglied hinzufügen</button>`,
  );
  document.getElementById("tmOhneApp").onclick = () => manuellDialog(null);
}

function manuellDialog(id) {
  const m = id ? teamManuell().find((x) => x.id === id) : { name: "", einst: "" };
  simpleDialog(
    id ? "Teammitglied bearbeiten" : "Teammitglied hinzufügen",
    "Die Wochenzahlen trägst du selbst ein",
    `<div class="grp">${fld("tmmName", "Name", m.name || "")}</div>
     <p class="hinweis">Deinen Anteil wählst du jede Woche in der Wochenmeldung des Mitglieds.</p>
     ${id ? `<div class="actions"><button type="button" class="btn gefahr" id="tmmWeg">Entfernen</button></div>` : ""}`,
    () => {
      const name = document.getElementById("tmmName").value.trim();
      if (!name) return;
      if (id) {
        Object.assign(m, { name: entschaerfeText(name) });
      } else teamManuell().push({ id: "M" + Date.now().toString(36), name: entschaerfeText(name) });
      saveData();
      closeModal();
      renderTeamManuell();
      try {
        renderProv();
      } catch (e) {}
    },
    "Speichern",
  );
  const weg = document.getElementById("tmmWeg");
  if (weg)
    weg.onclick = () => {
      settings.teamManuell = teamManuell().filter((x) => x.id !== id);
      delete teamMeldungen()[id];
      saveData();
      closeModal();
      renderTeamManuell();
      try {
        renderProv();
      } catch (e) {}
    };
}

const MANUELL_FELDER = [
  ["termine", "Kundentermine"],
  ["einheiten", "Einheiten gesamt"],
  ["einheitenFG", "davon Festgebiet"],
  ["einheitenMesse", "davon Messe"],
  ["umsatzNetto", "Umsatz netto €"],
  ["k70ein", "K70 Einkauf €"],
  ["pci", "Premium CheckIn"],
  ["promosFG", "Promotions FG"],
  ["kontakteFG", "Kontakte FG"],
  ["promoTermineFG", "Termine aus Promotion FG"],
  ["promosWG", "Promotions WG"],
  ["kontakteWG", "Kontakte WG"],
  ["promoTermineWG", "Termine aus Promotion WG"],
  ["jobtickets", "Jobtickets"],
  ["nTermine", "Kundentermine Folgewoche"],
  ["erwUmsatz", "Erwarteter Umsatz netto €"],
  ["erwEinheiten", "Erwartete Einheiten"],
  ["nPromosFG", "Promotions FG Folgewoche"],
  ["nPromosWG", "Promotions WG Folgewoche"],
  ["nTerminieren", "FGB-Blöcke Folgewoche"],
];

function meldungManuellDialog(id, wochenKey) {
  const m = teamManuell().find((x) => x.id === id);
  if (!m) return;
  const alt = (teamMeldungen()[id] || {})[wochenKey] || {};
  const { week } = isoWeek(fromDk(wochenKey));
  simpleDialog(
    `${m.name} · KW ${week}`,
    "Wochenmeldung von Hand",
    `<div class="grp mmgitter">${MANUELL_FELDER.map(([k, l]) =>
      fld("mm_" + k, l, alt[k] ?? "", "text", 'inputmode="decimal"'),
    ).join("")}</div>`,
    () => {
      const w = {};
      MANUELL_FELDER.forEach(([k]) => {
        const v = document.getElementById("mm_" + k).value;
        if (v !== "") w[k] = num(v);
      });
      const alle = teamMeldungen();
      alle[id] = alle[id] || {};
      alle[id][wochenKey] = w;
      saveData();
      closeModal();
      renderTeamManuell();
      try {
        renderProv();
      } catch (e) {}
    },
    "Woche speichern",
  );
}

function renderTeamManuell() {
  const seite = document.getElementById("page-team");
  if (!seite || !istTeamleiter()) return;
  teamLeisteEinbauen();
  let box = document.getElementById("tmManuell");
  if (!box) {
    box = document.createElement("div");
    box.id = "tmManuell";
    box.className = "asec";
    seite.appendChild(box);
  }
  const liste = teamManuell();
  const woche = dk(tmMontag || monday);
  box.innerHTML = `<h3>Dein Team</h3>
    <p class="sub">Jedes Mitglied und seine Wochenzahlen trägst du selbst ein —
      sie zählen in Wochenmeldung und Teamprovision mit.</p>
    ${
      liste.length
        ? liste
            .map((m) => {
              const hat = (teamMeldungen()[m.id] || {})[woche];
              return `<div class="rszeile">
        <span>${m.name}<small>${m.einst ? "seit " + fmt(fromDk(m.einst)) : "ohne Einstellungsdatum"}</small></span>
        <button class="mini" data-mmel="${m.id}">${hat ? "Meldung ändern" : "Meldung eintragen"}</button>
        <button class="mini" data-mbear="${m.id}">Bearbeiten</button></div>`;
            })
            .join("")
        : `<p class="hinweis">Noch niemand eingetragen. Über „Teammitglied hinzufügen“ legst du jemanden an.</p>`
    }`;
  box
    .querySelectorAll("[data-mmel]")
    .forEach((b) => (b.onclick = () => meldungManuellDialog(b.dataset.mmel, woche)));
  box.querySelectorAll("[data-mbear]").forEach((b) => (b.onclick = () => manuellDialog(b.dataset.mbear)));
}

/* Die Meldung eines Beraters ohne App in dieselbe Form wie meldungDaten bringen */
function meldungAusManuell(w) {
  const b = (v) => (v || 0) * MWST; // Tabelle rechnet netto aus brutto
  return {
    termine: w.termine || 0,
    aktiv: (w.termine || w.einheiten || 0) > 0,
    einheiten: w.einheiten || 0,
    einheitenFG: w.einheitenFG || 0,
    einheitenMesse: w.einheitenMesse || 0,
    umsatzFG: b(w.umsatzNetto),
    umsatzWG: 0,
    umsatzMesse: 0,
    k70ein: b(w.k70ein),
    pci: w.pci || 0,
    /* ältere Meldungen kannten nur „Promotions“ – die zählen als Festgebiet */
    promoFG: w.promosFG ?? w.promos ?? 0,
    promoWG: w.promosWG || 0,
    kontakteFG: w.kontakteFG ?? w.kontakte ?? 0,
    kontakteWG: w.kontakteWG || 0,
    promoTermineFG: w.promoTermineFG ?? w.promoTermine ?? 0,
    promoTermineWG: w.promoTermineWG || 0,
    empfehlungen: w.empfehlungen || 0,
    jobtickets: w.jobtickets || 0,
    nTermine: w.nTermine || 0,
    erwarteterUmsatz: b(w.erwUmsatz),
    erwarteteEinheiten: w.erwEinheiten || 0,
    nPromosFG: w.nPromosFG ?? w.nPromos ?? 0,
    nPromosWG: w.nPromosWG || 0,
    nPromos: (w.nPromosFG ?? w.nPromos ?? 0) + (w.nPromosWG || 0),
    nTerminieren: w.nTerminieren || 0,
  };
}

/* Teamprovision: eingetragene Teammitglieder mit ihren Umsätzen */
const tpLadenOhneManuell = tpLaden;
tpLaden = async function (vm) {
  const res = await tpLadenOhneManuell(vm);
  const kopie = { daten: [...res.daten.filter((x) => !x.manuell)], fehler: res.fehler };
  teamManuell().forEach((m) => {
    let nettoUm = 0;
    Object.entries(teamMeldungen()[m.id] || {}).forEach(([wk, w]) => {
      if (wk >= vm.fromK && wk <= vm.toK) nettoUm += +w.umsatzNetto || 0;
    });
    const wochen = m.einst
      ? Math.max(0, Math.floor((Date.now() - fromDk(m.einst).getTime()) / (7 * 86400000)) + 1)
      : null;
    const satz = wochen === null ? null : tpSatz(wochen);
    kopie.daten.push({
      dk: m.id,
      name: m.name,
      einst: m.einst,
      wochen,
      satz,
      nettoUm,
      anteil: satz === null ? 0 : nettoUm * satz,
      manuell: true,
    });
  });
  return kopie;
};

/* Team-Seite bei jedem Aufruf ergänzen */
const showMitTeam = show;
show = function (k) {
  showMitTeam(k);
  if (document.body.dataset.page === "team")
    try {
      renderTeamManuell();
    } catch (e) {
      console.error(e);
    }
  if (document.body.dataset.page === "provision")
    try {
      renderProv();
    } catch (e) {
      console.error(e);
    }
};

/*
 * ---------- PIN und Passwort ----------
 * Nach Umstellung von TL-DK auf DK wird zusätzlich unter der alten Nummer gesucht.
 */
const pinLesenOhneAlt = pinLesen;
pinLesen = async function (dk) {
  let p = await pinLesenOhneAlt(dk);
  if (!p && me && me.umgezogenVon && dk === me.dk) p = await pinLesenOhneAlt(me.umgezogenVon);
  return p;
};
async function passwortOeffnen(pin) {
  try {
    return await pinOeffnen(pin, me.dk);
  } catch (e) {
    if (me.umgezogenVon) return await pinOeffnen(pin, me.umgezogenVon);
    throw e;
  }
}
/* Prüft das aktuelle Passwort, indem es den Master Key öffnet; gibt ihn zurück. */
async function bestaetigePasswort(pw) {
  if (!me) throw new Error("Nicht angemeldet.");
  const mk = await mkOeffnen(me.mkByPw, pw);
  if (!mk) {
    const e = new Error("wrong-password");
    e.code = "wrong-password";
    throw e;
  }
  return mk;
}
function zugangFehler(e) {
  const c = (e && e.code) || "";
  if (/wrong-password|invalid-credential|invalid-login/.test(c)) return "Das aktuelle Passwort stimmt nicht.";
  if (/too-many-requests/.test(c)) return "Zu viele Versuche. Bitte kurz warten.";
  if (/weak-password/.test(c)) return "Das neue Passwort braucht mindestens 6 Zeichen.";
  if (/network/.test(c)) return "Keine Verbindung.";
  return (e && e.message) || "Hat nicht geklappt.";
}
function pinAendernDialog() {
  simpleDialog(
    "PIN festlegen",
    "Vier Ziffern – dein Notschlüssel, falls du das Passwort vergisst",
    `<div class="grp">${fld("npPin", "Neuer PIN", "", "password", 'inputmode="numeric" maxlength="4" autocomplete="off"')}
       ${fld("npPw", "Dein aktuelles Passwort", "", "password", 'autocomplete="current-password"')}</div>
     <p class="err" id="npErr" hidden></p>`,
    async () => {
      const pin = document.getElementById("npPin").value.trim();
      const pw = document.getElementById("npPw").value;
      const err = document.getElementById("npErr");
      const zeig = (t) => {
        err.textContent = t;
        err.hidden = false;
      };
      if (!/^\d{4}$/.test(pin)) return zeig("Der PIN besteht aus genau vier Ziffern.");
      try {
        await bestaetigePasswort(pw);
        throw new Error("Die PIN-Funktion gibt es nicht mehr.");
        closeModal();
        renderProfil();
      } catch (e) {
        zeig(zugangFehler(e));
      }
    },
    "Speichern",
  );
}
function passwortAendernDialog() {
  simpleDialog(
    "Passwort ändern",
    "Gilt ab sofort für die Anmeldung",
    `<div class="grp"><input type="text" name="username" autocomplete="username" value="${me.dk}" readonly tabindex="-1" aria-hidden="true" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">${fld("ppAlt", "Aktuelles Passwort", "", "password", 'autocomplete="current-password"')}
       ${fld("ppNeu", "Neues Passwort", "", "password", 'autocomplete="new-password"')}
       ${fld("ppNeu2", "Neues Passwort wiederholen", "", "password", 'autocomplete="new-password"')}</div>
     <p class="hinweis bleibt">${PW_REGEL_TEXT}</p>
     <p class="err" id="ppErr" hidden></p>`,
    async () => {
      const alt = document.getElementById("ppAlt").value;
      const neu = document.getElementById("ppNeu").value;
      const neu2 = document.getElementById("ppNeu2").value;
      const err = document.getElementById("ppErr");
      const zeig = (t) => {
        err.textContent = t;
        err.hidden = false;
      };
      const pf = pwRegelFehler(neu);
      if (pf) return zeig(pf);
      if (neu !== neu2) return zeig("Die beiden neuen Passwörter stimmen nicht überein.");
      try {
        const mk = await bestaetigePasswort(alt); // Master Key mit altem Passwort öffnen
        const neuUm = await mkUmschliessen(mk, neu); // mit neuem Passwort neu umschließen
        /* Online: zuerst auf dem Server ändern – klappt das nicht, bleibt alles beim Alten */
        if (typeof onlinePasswort === "function") await onlinePasswort(alt, neu, neuUm);
        me.mkByPw = neuUm;
        masterKey = mk;
        await userSet(me);
        closeModal();
        renderProfil();
      } catch (e) {
        zeig(zugangFehler(e));
      }
    },
    "Ändern",
  );
}

/*
 * ---------- Beträge runden ----------
 * Gilt für alle Betragsfelder: 150,90 → 151, 150,40 → 150. Punkt und Komma werden erkannt.
 */
document.addEventListener(
  "change",
  (ev) => {
    const f = ev.target;
    if (!f || f.tagName !== "INPUT" || f.getAttribute("inputmode") !== "decimal") return;
    if (!f.value.trim()) return;
    const gerundet = Math.round(num(f.value));
    if (String(gerundet) !== f.value) f.value = String(gerundet);
  },
  true,
);
