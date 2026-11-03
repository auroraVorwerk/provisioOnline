/**
 * Artikelkatalog
 *
 * Katalogpflege durch den Admin: Kategorien verwalten, freier Hinweistext,
 * Abweichung vom Werkskatalog, Zurücksetzen. Bestände hängen am Schlüssel aus
 * Kategorie und Artikel und werden beim Umbenennen mitgeführt.
 */

const HINWEIS_VORLAGEN = [
  "zur Zeit nicht verfügbar",
  "zur Zeit nicht lieferbar",
  "nicht verfügbar",
  "nicht mehr lieferbar",
  "Nachfolger in Vorbereitung",
];

const katListe = () => (katalog.liste = katalog.liste || []);
const katFinden = (kat) => katListe().find((x) => x.kat === kat);
const katIndex = (kat) => katListe().findIndex((x) => x.kat === kat);

/*
 * ---------- Bestand und Mindestbestand mitführen ----------
 * Beide hängen am Schlüssel aus Kategorie und Artikelname und ziehen bei Umbenennung mit.
 */
function katSchluesselUmziehen(altKat, neuKat) {
  const k = katFinden(altKat) || katFinden(neuKat);
  if (!k) return;
  const min = (settings.invMin = settings.invMin || {});
  (k.artikel || []).forEach((a) => {
    const alt = artKey(altKat + "|" + a.n),
      neu = artKey(neuKat + "|" + a.n);
    if (alt === neu) return;
    if (inventur[alt] !== undefined) {
      inventur[neu] = inventur[alt];
      delete inventur[alt];
    }
    if (min[alt] !== undefined) {
      min[neu] = min[alt];
      delete min[alt];
    }
  });
  const zu = (settings.invZu = settings.invZu || {});
  const altId = artKey(altKat),
    neuId = artKey(neuKat);
  if (altId !== neuId && zu[altId] !== undefined) {
    zu[neuId] = zu[altId];
    delete zu[altId];
  }
}
/* Alles, was zu einer Kategorie gespeichert ist, aufräumen */
function katStandLoeschen(kat) {
  const k = katFinden(kat);
  const min = (settings.invMin = settings.invMin || {});
  if (k)
    (k.artikel || []).forEach((a) => {
      const id = artKey(kat + "|" + a.n);
      delete inventur[id];
      delete min[id];
    });
  const zu = (settings.invZu = settings.invZu || {});
  delete zu[artKey(kat)];
}

/* ---------- Kategorie anlegen oder umbenennen ---------- */
function katDialog(kat) {
  const neu = !kat;
  const k = neu ? null : katFinden(kat);
  if (!neu && !k) return;
  const anzahl = k ? (k.artikel || []).length : 0;
  simpleDialog(
    neu ? "Kategorie anlegen" : "Kategorie umbenennen",
    neu ? "Sie wird unten an den Katalog angehängt" : `${anzahl} Artikel`,
    `<div class="grp">
       ${fld("katName", "Name der Kategorie", neu ? "" : kat, "text", 'autocomplete="off" spellcheck="false"')}
     </div>
     ${
       neu
         ? `<p class="hinweis">Nach dem Anlegen fügst du die Artikel mit „+ Artikel“ hinzu.
          Die Reihenfolge der Kategorien stellst du mit den Pfeilen ein.</p>`
         : `<p class="hinweis">Der Bestand hängt am Namen. Dein eigener Bestand wandert mit —
          bei den anderen Beratern fängt der Bestand dieser ${anzahl} Artikel wieder bei 0 an.
          Benenne also nur um, wenn es wirklich sein muss.</p>`
     }
     <p class="err" id="katErr" hidden></p>`,
    async () => {
      const err = document.getElementById("katErr");
      const zeig = (m) => {
        err.textContent = m;
        err.hidden = false;
      };
      const nn = document.getElementById("katName").value.trim();
      if (!nn) return zeig("Bitte einen Namen eintragen.");
      if (nn.includes("|")) return zeig("Im Namen darf kein senkrechter Strich stehen.");
      if (katListe().some((x) => x !== k && x.kat.toLowerCase() === nn.toLowerCase()))
        return zeig("Diese Kategorie gibt es schon.");
      if (neu) {
        katListe().push({ kat: nn, artikel: [] });
      } else {
        katSchluesselUmziehen(kat, nn);
        k.kat = nn;
        saveData();
      }
      closeModal();
      invNeuZeichnen();
      renderProv();
      await katSpeichern();
    },
    neu ? "Kategorie anlegen" : "Umbenennen",
  );
}
/* ---------- Kategorie verschieben ---------- */
async function katVerschieben(kat, richtung) {
  const i = katIndex(kat);
  const ziel = i + richtung;
  if (i < 0 || ziel < 0 || ziel >= katListe().length) return;
  const [raus] = katListe().splice(i, 1);
  katListe().splice(ziel, 0, raus);
  invNeuZeichnen();
  await katSpeichern();
}
/* ---------- Kategorie löschen ---------- */
function katLoeschenDialog(kat) {
  const k = katFinden(kat);
  if (!k) return;
  const anzahl = (k.artikel || []).length;
  simpleDialog(
    "Kategorie löschen",
    kat,
    `<p class="hinweis">„${kat}“ wird mit ${anzahl} Artikel${anzahl === 1 ? "" : "n"}
       aus dem Katalog entfernt — für alle Berater.
       Der erfasste Bestand dieser Artikel geht dabei verloren.</p>
     ${
       anzahl
         ? `<div class="katliste">${(k.artikel || [])
             .slice(0, 12)
             .map((a) => `<span>${a.n}</span>`)
             .join("")}${anzahl > 12 ? `<span class="mehr">und ${anzahl - 12} weitere</span>` : ""}</div>`
         : ""
     }`,
    async () => {
      katStandLoeschen(kat);
      const i = katIndex(kat);
      if (i >= 0) katListe().splice(i, 1);
      closeModal();
      saveData();
      invNeuZeichnen();
      renderProv();
      await katSpeichern();
    },
    "Endgültig löschen",
  );
}

/* ---------- Zurücksetzen auf den Werkskatalog ---------- */
const werkKatalog = () => JSON.parse(JSON.stringify(K70_KATALOG));
function katalogVergleich() {
  const werk = werkKatalog();
  const jetzt = katListe();
  const zaehl = (l) => l.reduce((n, k) => n + (k.artikel || []).length, 0);
  const namenWerk = new Set();
  werk.forEach((k) => (k.artikel || []).forEach((a) => namenWerk.add(k.kat + "|" + a.n)));
  const namenJetzt = new Set();
  jetzt.forEach((k) => (k.artikel || []).forEach((a) => namenJetzt.add(k.kat + "|" + a.n)));
  let neu = 0,
    weg = 0;
  namenJetzt.forEach((n) => {
    if (!namenWerk.has(n)) neu++;
  });
  namenWerk.forEach((n) => {
    if (!namenJetzt.has(n)) weg++;
  });
  const hinweise = jetzt.reduce((n, k) => n + (k.artikel || []).filter((a) => a.hw).length, 0);
  return {
    kategorien: jetzt.length,
    artikel: zaehl(jetzt),
    werkKategorien: werk.length,
    werkArtikel: zaehl(werk),
    neu,
    weg,
    hinweise,
    abweichung: neu + weg > 0 || jetzt.length !== werk.length,
  };
}
function katalogZuruecksetzen() {
  const v = katalogVergleich();
  simpleDialog(
    "Katalog zurücksetzen",
    "Zurück zum ausgelieferten Stand",
    `<p class="hinweis">Der Katalog wird für <b>alle Berater</b> auf den Werkskatalog
       zurückgesetzt: ${v.werkKategorien} Kategorien mit ${v.werkArtikel} Artikeln.</p>
     <p class="hinweis">Dabei gehen verloren: ${v.neu} selbst angelegte Artikel,
       ${v.hinweise} gesetzte Hinweise und alle Änderungen an Preisen und Reihenfolge.
       Die ${v.weg} entfernten Artikel kommen zurück.</p>
     <p class="hinweis">Der erfasste Bestand bleibt, soweit es den Artikel im
       Werkskatalog gibt.</p>`,
    async () => {
      katalog.liste = werkKatalog();
      closeModal();
      invNeuZeichnen();
      renderProv();
      await katSpeichern();
    },
    "Zurücksetzen",
  );
}

/*
 * ---------- Artikelfenster ----------
 * Ersetzt artikelDialog aus 22-inventur.js; Hinweis als Freitext mit Vorschlägen.
 */
function artikelDialog(kat, name) {
  const k = katFinden(kat);
  if (!k) return;
  const a = name ? (k.artikel || []).find((x) => x.n === name) : null;
  const neu = !a;
  const cur = a || { n: "", p: 0 };
  const hw = cur.hw || "";
  /* Alle Hinweise, die im Katalog schon vorkommen, als Vorschlag anbieten */
  const vorhanden = new Set(HINWEIS_VORLAGEN);
  katListe().forEach((x) =>
    (x.artikel || []).forEach((y) => {
      if (y.hw) vorhanden.add(y.hw);
    }),
  );
  simpleDialog(
    neu ? "Artikel hinzufügen" : "Artikel bearbeiten",
    kat,
    `<div class="grp">
       ${fld("artName", "Artikelname", cur.n, "text", 'autocomplete="off" spellcheck="false"')}
       ${fld("artPreis", "Preis €", neu ? "" : preis(cur.p), "text", 'inputmode="decimal"')}
       <div class="field"><label for="artHw">Hinweis — frei schreiben oder auswählen</label>
         <input id="artHw" list="artHwListe" value="${hw.replace(/"/g, "&quot;")}"
           placeholder="leer lassen, wenn der Artikel normal lieferbar ist"
           autocomplete="off" spellcheck="false">
         <datalist id="artHwListe">${[...vorhanden]
           .map((h) => `<option value="${h.replace(/"/g, "&quot;")}"></option>`)
           .join("")}</datalist></div>
       <div class="katschnell" id="artHwSchnell">
         <button type="button" data-hw=""${hw ? "" : ' class="an"'}>kein Hinweis</button>
         ${HINWEIS_VORLAGEN.map(
           (h) => `<button type="button" data-hw="${h}"${h === hw ? ' class="an"' : ""}>${h}</button>`,
         ).join("")}
       </div>
       <div class="field"><label for="artTop">Verkaufsschlager</label>
         <select id="artTop">
           <option value="0"${cur.top ? "" : " selected"}>nein</option>
           <option value="1"${cur.top ? " selected" : ""}>ja</option></select></div>
     </div>
     ${
       neu
         ? `<p class="hinweis">Der Artikel wird unten in „${kat}“ angehängt —
       den Platz stellst du danach mit dem Schieberegler ein.</p>`
         : `<p class="hinweis">Wird der Name geändert, fängt der Bestand dieses Artikels
       bei den anderen Beratern wieder bei 0 an.</p>`
     }
     <p class="hinweis">Ein Hinweis erscheint bei allen Beratern rot unter dem Artikelnamen.
       Für dauerhaft gestrichene Artikel ist „Löschen“ der richtige Weg.</p>
     <p class="err" id="artErr" hidden></p>`,
    async () => {
      const err = document.getElementById("artErr");
      const zeig = (m) => {
        err.textContent = m;
        err.hidden = false;
      };
      const nn = document.getElementById("artName").value.trim();
      const pp = num(document.getElementById("artPreis").value);
      if (!nn) return zeig("Bitte einen Artikelnamen eintragen.");
      if (nn.includes("|")) return zeig("Im Namen darf kein senkrechter Strich stehen.");
      if ((k.artikel || []).some((x) => x !== a && x.n.toLowerCase() === nn.toLowerCase()))
        return zeig("Diesen Artikel gibt es in dieser Kategorie schon.");
      if (pp <= 0) return zeig("Bitte einen Preis eintragen.");
      const hwNeu = (document.getElementById("artHw").value || "").trim();
      const topNeu = document.getElementById("artTop").value === "1";
      if (neu) {
        const eintrag = { n: nn, p: pp };
        if (topNeu) eintrag.top = 1;
        if (hwNeu) eintrag.hw = hwNeu;
        k.artikel = k.artikel || [];
        k.artikel.push(eintrag);
      } else {
        const altId = artKey(kat + "|" + a.n),
          neuId = artKey(kat + "|" + nn);
        if (altId !== neuId) {
          const min = (settings.invMin = settings.invMin || {});
          if (inventur[altId] !== undefined) {
            inventur[neuId] = inventur[altId];
            delete inventur[altId];
          }
          if (min[altId] !== undefined) {
            min[neuId] = min[altId];
            delete min[altId];
          }
          saveData();
        }
        a.n = nn;
        a.p = pp;
        if (hwNeu) a.hw = hwNeu;
        else delete a.hw;
        if (topNeu) a.top = 1;
        else delete a.top;
      }
      closeModal();
      invNeuZeichnen();
      renderProv();
      await katSpeichern();
    },
    neu ? "Artikel anlegen" : "Änderung speichern",
  );

  /* Die Schnellknöpfe schreiben in das Textfeld */
  const feld = document.getElementById("artHw");
  document.querySelectorAll("#artHwSchnell [data-hw]").forEach(
    (b) =>
      (b.onclick = () => {
        feld.value = b.dataset.hw;
        document
          .querySelectorAll("#artHwSchnell [data-hw]")
          .forEach((x) => x.classList.toggle("an", x === b));
      }),
  );
}

/* ---------- Die Kategoriewerkzeuge in die Inventur einhängen ---------- */
const renderInventurOhneKat = renderInventur;
renderInventur = function () {
  renderInventurOhneKat();
  const box = document.getElementById("inventur");
  if (!box || !me || !istTeamleiter()) return;

  /* Übersicht und Zurücksetzen immer sichtbar, auch ohne Bearbeitenmodus */
  const v = katalogVergleich();
  const kopf = box.querySelector(".asec");
  if (kopf && !box.querySelector("#katUeber")) {
    const u = document.createElement("p");
    u.className = "hinweis katueber";
    u.id = "katUeber";
    u.innerHTML = `Katalog: <b>${v.kategorien}</b> Kategorien, <b>${v.artikel}</b> Artikel${
      v.hinweise ? ` · <b>${v.hinweise}</b> mit Hinweis` : ""
    }${
      v.abweichung
        ? ` · <span class="katab">${v.neu} dazu, ${v.weg} entfernt gegenüber dem Werkskatalog</span>`
        : " · wie ausgeliefert"
    }`;
    const btn = kopf.querySelector("#invPflege");
    if (btn && btn.parentElement) kopf.insertBefore(u, btn.parentElement);
    else kopf.appendChild(u);
  }

  if (!katBearbeiten) return;

  /* Der Hinweis aus 22-inventur.js kennt die Kategoriewerkzeuge noch nicht */
  const htxt = [...box.querySelectorAll(".asec .hinweis")].find((x) =>
    x.textContent.trim().startsWith("Reihenfolge über den Schieberegler"),
  );
  if (htxt)
    htxt.innerHTML = `Artikel: Reihenfolge über den Schieberegler, Preis und Hinweis über
    „Bearbeiten“. Kategorien: Pfeile zum Verschieben, „Umbenennen“ und „Kategorie löschen“
    direkt unter der Überschrift. Ganz unten legst du neue Kategorien an.
    <b>Änderungen am Katalog gelten sofort für alle Berater.</b>`;

  /* Je Kategorie eine Werkzeugzeile unter die Überschrift */
  box.querySelectorAll("[data-katzu]").forEach((knopf, i) => {
    const k = katListe()[i];
    if (!k || knopf.nextElementSibling?.classList.contains("katadmin")) return;
    const zeile = document.createElement("div");
    zeile.className = "katadmin";
    zeile.innerHTML = `
      <button type="button" class="mini" data-katrauf="${k.kat}" ${i === 0 ? "disabled" : ""}
        aria-label="Kategorie nach oben">↑</button>
      <button type="button" class="mini" data-katrunter="${k.kat}"
        ${i === katListe().length - 1 ? "disabled" : ""} aria-label="Kategorie nach unten">↓</button>
      <button type="button" class="mini" data-katname="${k.kat}">Umbenennen</button>
      <button type="button" class="mini gefahr" data-katdel="${k.kat}">Kategorie löschen</button>`;
    knopf.after(zeile);
  });

  /* Neue Kategorie und Zurücksetzen ans Ende der Liste */
  const liste = document.getElementById("invliste");
  if (liste && !document.getElementById("katNeu")) {
    const fuss = document.createElement("div");
    fuss.className = "katfuss";
    fuss.innerHTML = `
      <button type="button" class="btn" id="katNeu">+ Neue Kategorie</button>
      <button type="button" class="btn gefahr" id="katReset">Katalog zurücksetzen</button>`;
    liste.appendChild(fuss);
  }

  box
    .querySelectorAll("[data-katrauf]")
    .forEach((b) => (b.onclick = () => katVerschieben(b.dataset.katrauf, -1)));
  box
    .querySelectorAll("[data-katrunter]")
    .forEach((b) => (b.onclick = () => katVerschieben(b.dataset.katrunter, 1)));
  box.querySelectorAll("[data-katname]").forEach((b) => (b.onclick = () => katDialog(b.dataset.katname)));
  box
    .querySelectorAll("[data-katdel]")
    .forEach((b) => (b.onclick = () => katLoeschenDialog(b.dataset.katdel)));
  const n = document.getElementById("katNeu");
  if (n) n.onclick = () => katDialog(null);
  const r = document.getElementById("katReset");
  if (r) r.onclick = katalogZuruecksetzen;
};
