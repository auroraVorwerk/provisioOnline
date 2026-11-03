/**
 * Zählmodus
 *
 * Zähler für Türen, Ansprachen und Termine während der Terminierung.
 */
const ZAEHLER = {
  Promotion: [
    ["ansprachen", "Ansprachen"],
    ["gespraeche", "Gespräche"],
    ["termine", "Termine"],
    ["kontakte", "Kontakte"],
  ],
  Festgebietsbegehung: [
    ["tueren", "Türen"],
    ["erreicht", "Erreicht"],
    ["termine", "Termine"],
    ["rueck", "Rückmeldung"],
  ],
};
/* Antippen der Zahl in einem Stepper: kleine Tastatur statt vielem Tippen */
function zahlEingabe(titel, wert, cb) {
  const alt = document.getElementById("zahlbox");
  if (alt) alt.remove();
  const box = document.createElement("div");
  box.id = "zahlbox";
  /*
   * Band mit den kleinen Zahlen: ein Griff statt vielem Tippen.
   * Das Eingabefeld bleibt darunter für alles ab 21.
   */
  const band = Array.from(
    { length: 21 },
    (_, i) => `<button type="button" data-zb="${i}" aria-pressed="${i === (+wert || 0)}">${i}</button>`,
  ).join("");
  box.innerHTML = `<div class="zbinner">
      <div class="zbtitel">${titel}</div>
      <div class="zband" id="zbBand">${band}</div>
      <input id="zbFeld" type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" value="${+wert || 0}">
      <div class="zbakt"><button type="button" class="btn" id="zbAb">Abbrechen</button>
        <button type="button" class="btn primary" id="zbOk">Übernehmen</button></div>
    </div>`;
  document.body.appendChild(box);
  const feld = box.querySelector("#zbFeld");
  const zu = () => box.remove();
  const ok = () => {
    const v = Math.max(0, Math.round(+feld.value || 0));
    zu();
    cb(v);
  };
  box.querySelector("#zbAb").onclick = zu;
  box.querySelector("#zbOk").onclick = ok;
  box.querySelectorAll("[data-zb]").forEach(
    (b) =>
      (b.onclick = () => {
        feld.value = b.dataset.zb;
        box.querySelectorAll("[data-zb]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        stups(8);
        ok();
      }),
  );
  feld.addEventListener("input", () => {
    box
      .querySelectorAll("[data-zb]")
      .forEach((x) => x.setAttribute("aria-pressed", x.dataset.zb === String(+feld.value || 0)));
  });
  /* Die gewählte Zahl in den sichtbaren Bereich holen */
  setTimeout(() => {
    const akt = box.querySelector('[data-zb][aria-pressed="true"]');
    if (akt && akt.scrollIntoView) akt.scrollIntoView({ inline: "center", block: "nearest" });
  }, 40);
  box.addEventListener("click", (ev) => {
    if (ev.target === box) zu();
  });
  feld.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      ok();
    }
  });
}

function zaehlZeile(id, titel, wert) {
  const n = +wert || 0;
  return `<div class="zzeile${n ? " hat" : ""}">
    <span class="ztitel">${titel}</span>
    <span class="stepper${n ? " hat" : ""}">
      <button type="button" data-zminus="${id}" aria-label="weniger">−</button>
      <b data-zwert="${id}" data-zedit="${titel}" role="button" tabindex="0">${n}</b>
      <button type="button" data-zplus="${id}" aria-label="mehr">+</button>
    </span>
  </div>`;
}
const uhrJetzt = () => {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
};
let zaehlDaten = null;
function zaehlModus(e) {
  collect();
  const felder = ZAEHLER[e.quelle] || ZAEHLER.Festgebietsbegehung;
  zaehlDaten = {
    felder,
    werte: Object.fromEntries(felder.map(([id]) => [id, +draft.nb[id] || 0])),
    start: draft.nb.realStart || uhrJetzt(), // ein bereits gestarteter Einsatz behält seine Zeit
    quelle: e.quelle,
    ziel: +e.ziel || 0,
    modus: "zaehlen",
    gemerkt: 0,
    hinweis: "",
  };
  zaehlZeichnen();
}
function zaehlZeichnen() {
  const z = zaehlDaten;
  let box = document.getElementById("zaehlflaeche");
  if (!box) {
    box = document.createElement("div");
    box.id = "zaehlflaeche";
    document.body.appendChild(box);
  }

  const kopf = `<div class="zkopf">
      <div><b>${z.quelle}</b><span>läuft seit ${z.start} Uhr${z.gemerkt ? ` · ${z.gemerkt} gemerkt` : ""}${
        z.ziel ? ` · Ziel ${z.werte.termine || 0}/${z.ziel}` : ""
      }</span></div>
    </div>`;

  if (z.modus === "kontakt") {
    const naechster = new Date();
    naechster.setMonth(naechster.getMonth() + 1, 1);
    box.innerHTML =
      kopf +
      `
      <div class="zform">
        <p class="zfhinweis">Der Eintrag landet in deiner Potenzialliste.</p>
        <div class="row2">
          <div class="field"><label for="zkVor">Vorname</label><input id="zkVor"></div>
          <div class="field"><label for="zkNach">Nachname</label><input id="zkNach"></div>
        </div>
        <div class="row2">
          <div class="field vorschlagfeld" style="flex:1 1 65%"><label for="zk_str">Straße</label>
            <input id="zk_str" data-adr="zk" autocomplete="off" spellcheck="false">
            <div class="vorschlaege" id="zk_vorschlaege" hidden></div></div>
          <div class="field" style="flex:0 0 32%"><label for="zk_hnr">Nr.</label><input id="zk_hnr" inputmode="text" autocapitalize="off" spellcheck="false" placeholder="5b"></div>
        </div>
        <div class="row2">
          <div class="field" style="flex:0 0 42%"><label for="zk_plz">PLZ</label><input id="zk_plz" inputmode="numeric" maxlength="5"></div>
          <div class="field"><label for="zk_ort">Ort</label><input id="zk_ort"></div>
        </div>
        <div class="field"><label for="zkTel">Telefon</label><input id="zkTel" inputmode="tel"></div>
        ${wvFeld("zkWieder", "", "Wieder ansprechen")}
        <div class="field"><label for="zkNotiz">Notiz</label><input id="zkNotiz" placeholder="z. B. melden im Oktober"></div>
        <p class="err" id="zkErr" hidden></p>
      </div>
      <div class="zfuss">
        <button class="btn" id="zkZurueck">Zurück</button>
        <button class="btn primary" id="zkSichern">Als Interessent merken</button>
      </div>`;
    document.getElementById("zkZurueck").onclick = () => {
      z.modus = "zaehlen";
      z.hinweis = "";
      zaehlZeichnen();
    };
    document.getElementById("zkSichern").onclick = () => {
      const w = (id) => (document.getElementById(id).value || "").trim();
      const err = document.getElementById("zkErr");
      if (!w("zkNach")) {
        err.textContent = "Ohne Nachnamen geht es nicht.";
        err.hidden = false;
        return;
      }
      const p = {
        vorname: w("zkVor"),
        nachname: w("zkNach"),
        str: w("zk_str"),
        hnr: w("zk_hnr"),
        strasse: [w("zk_str"), w("zk_hnr")].filter(Boolean).join(" "),
        plz: w("zk_plz"),
        ort: w("zk_ort"),
        telefon: w("zkTel"),
        notiz: w("zkNotiz"),
        quelle: z.quelle,
        datum: dk(new Date()),
      };
      p.id = [p.vorname, p.nachname, p.str, p.plz].map((v) => (v || "").trim().toLowerCase()).join("|");
      const vorhanden = interessenten.findIndex((x) => x.id === p.id);
      if (vorhanden >= 0) interessenten[vorhanden] = { ...interessenten[vorhanden], ...p };
      else interessenten.push(p);
      if (w("zkWieder")) wvSetzen(p, w("zkWieder"), p.notiz || `Angesprochen bei ${z.quelle}`);
      z.gemerkt++;
      z.modus = "zaehlen";
      z.hinweis = `${[p.vorname, p.nachname].filter(Boolean).join(" ")} steht bei den Interessenten.`;
      saveData();
      zaehlZeichnen();
    };
    document.getElementById("zkVor").focus();
    return;
  }

  box.innerHTML =
    kopf +
    `
    <div class="zgitter">
      ${z.felder
        .map(
          ([id, t]) => `
        <button class="zkachel${id === "termine" && z.ziel && (z.werte[id] || 0) >= z.ziel ? " ziel" : ""}" data-ztipp="${id}">
          <span class="zk-t">${t}${id === "termine" && z.ziel ? ` · Ziel ${z.ziel}` : ""}</span>
          <span class="zk-n">${z.werte[id]}</span>
          <span class="zk-minus" data-zab="${id}">−</span>
        </button>`,
        )
        .join("")}
    </div>
    <p class="zhinweis${z.hinweis ? " gut" : ""}" id="zMeldung">${
      z.hinweis || "„Kurz raus“ sichert den Stand — beim Fortsetzen läuft die Zeit weiter."
    }</p>
    <div class="zfuss drei">
      <button class="btn" id="zaehlKontakt">Kontakt merken</button>
      <button class="btn" id="zaehlPause">Kurz raus</button>
      <button class="btn primary" id="zaehlEnde">Einsatz beenden</button>
    </div>`;

  box.querySelectorAll("[data-ztipp]").forEach(
    (b) =>
      (b.onclick = (ev) => {
        if (ev.target.closest("[data-zab]")) return;
        z.werte[b.dataset.ztipp]++;
        b.querySelector(".zk-n").textContent = z.werte[b.dataset.ztipp];
        if (navigator.vibrate) navigator.vibrate(8);
      }),
  );
  box.querySelectorAll("[data-zab]").forEach(
    (b) =>
      (b.onclick = (ev) => {
        ev.stopPropagation();
        const id = b.dataset.zab;
        z.werte[id] = Math.max(0, z.werte[id] - 1);
        b.parentElement.querySelector(".zk-n").textContent = z.werte[id];
      }),
  );
  document.getElementById("zaehlKontakt").onclick = () => {
    z.modus = "kontakt";
    zaehlZeichnen();
  };
  document.getElementById("zaehlPause").onclick = zaehlSichern;
  document.getElementById("zaehlEnde").onclick = zaehlBeenden;
  z.hinweis = "";
}
/* Zahlen sichern, ohne den Einsatz zu beenden – die Startzeit bleibt stehen */
function zaehlSichern() {
  const z = zaehlDaten;
  Object.keys(z.werte).forEach((id) => (draft.nb[id] = z.werte[id]));
  draft.nb.realStart = z.start;
  const e = entries[key(draft.day, draft.hour)];
  if (e) e.nb = { ...draft.nb };
  zaehlDaten = null;
  document.getElementById("zaehlflaeche")?.remove();
  saveData();
  repaint(); // zurück in den Termin – die Endzeit bleibt offen
}
function zaehlBeenden() {
  const z = zaehlDaten;
  Object.keys(z.werte).forEach((id) => (draft.nb[id] = z.werte[id]));
  draft.nb.realStart = z.start;
  draft.nb.realEnde = uhrJetzt();
  zaehlDaten = null;
  document.getElementById("zaehlflaeche")?.remove();
  delete draft.nb["_zu_zeit"];
  saveData();
  repaint();
}
