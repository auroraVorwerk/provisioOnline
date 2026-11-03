/**
 * Planer
 *
 * Ersetzt render() aus 04-raster.js; Interaktion bleibt dort.
 * Aufbau: Stunden als Zeilen, je Tag zwei Spuren. Termine ohne Überschneidung
 * nutzen die volle Breite, überlappende teilen sie sich. Feste Termine
 * (Meeting, Privat, Individuell) stehen auf ihrer echten Zeit.
 */

let gpZeichnet = false; // verhindert, dass sich render und tagesleiste gegenseitig aufrufen
let gpKlassen = null; // die Klassen, die #grid von Anfang an hatte
const GP_OBEN = 23; // oberer Rand der Zeitachse
const GP_UNTEN = Math.min(...HOURS_ASC);
/* Nur Handy-Hochformat: die breite iPad-/Desktop-Ansicht ist ausgebaut. */
const gpBreit = () => false;
/* Richtung der Zeitachse: Standard spät oben, umschaltbar auf früh oben */
const gpFrueh = () => settings.planerRichtung === "frueh";
const gpStunden = () => (gpFrueh() ? HOURS_ASC : START_HOURS);
/* Ansicht: Handy 1 oder 3 Tage, iPad 3 Tage oder Woche. */
function gpErlaubt() {
  return gpBreit() ? ["drei", "woche"] : ["tag", "drei"];
}
function gpAnsicht() {
  const a = settings.planerAnsicht;
  return gpErlaubt().includes(a) ? a : gpBreit() ? "woche" : "tag";
}
function gpTageWahl() {
  const a = gpAnsicht();
  if (a === "woche") return [0, 1, 2, 3, 4, 5, 6];
  if (a === "tag") return [Math.min(6, Math.max(0, tagWahl || 0))];
  const start = Math.min(4, Math.max(0, tagWahl || 0));
  return [start, start + 1, start + 2];
}

/* Alle Termine eines Tages als Blöcke mit echter Zeit */
function gpBloecke(day) {
  const liste = [];
  HOURS_ASC.forEach((h) => {
    const e = entries[key(day, h)];
    if (!e) return;
    /* Feste Blöcke ohne Ankunftsfenster – Titel steht oben (Terminieren und Büro gehören dazu) */
    const fest = ["meeting", "privat", "individuell", "terminieren", "buero", "d2d"].includes(e.kind);
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
      if (e.bisTag && e.bisTag > day) bis = 24; // mehrtägig: bis zum Rand
    }
    von = Math.max(GP_UNTEN, von);
    bis = Math.min(GP_OBEN, Math.max(bis, von + 0.5));
    liste.push({ e, h, von, bis, fest });
  });
  /* Folgetage einer mehrtägigen Privatzeit ohne eigenen Eintrag */
  Object.keys(entries).forEach((k) => {
    const [d] = k.split("|"),
      e = entries[k];
    if (!e || !["privat", "individuell"].includes(e.kind) || !e.bisTag) return;
    if (day <= d || day > e.bisTag) return;
    liste.push({ e, h: null, von: GP_UNTEN, bis: GP_OBEN, fest: true, fremdTag: true });
  });
  return liste.sort((a, b) => a.von - b.von || b.bis - a.bis);
}

/* Spuren vergeben: nur wer sich wirklich überschneidet, teilt sich die Breite */
function gpSpuren(liste) {
  const enden = [];
  liste.forEach((b) => {
    let i = 0;
    while (enden[i] !== undefined && enden[i] > b.von + 0.001) i++;
    b.spur = i;
    enden[i] = b.bis;
  });
  /* zusammenhängende Gruppen bilden */
  const offen = liste.slice(),
    gruppen = [];
  while (offen.length) {
    const g = [offen.shift()];
    let gewachsen = true;
    while (gewachsen) {
      gewachsen = false;
      for (let i = 0; i < offen.length; i++) {
        const x = offen[i];
        if (g.some((y) => x.von < y.bis - 0.001 && x.bis > y.von + 0.001)) {
          g.push(x);
          offen.splice(i, 1);
          i--;
          gewachsen = true;
        }
      }
    }
    gruppen.push(g);
  }
  gruppen.forEach((g) => {
    const n = g.length === 1 ? 1 : Math.max(...g.map((b) => b.spur)) + 1;
    g.forEach((b) => {
      b.spuren = n;
      if (n === 1) b.spur = 0;
    });
  });
  return liste;
}

function gpZeit(x) {
  const h = Math.floor(x),
    m = Math.round((x - h) * 60);
  return pad(h) + (m ? ":" + pad(m) : "");
}

/* Eine Tagesspalte */
function gpSpalte(d, iTag, heute) {
  const day = dk(d);
  const bloecke = gpSpuren(gpBloecke(day));
  const belegt = new Map(); // Stunde -> Block, der sie deckt
  bloecke.forEach((b) => {
    HOURS_ASC.forEach((h) => {
      if (h >= Math.floor(b.von) && h < b.bis) belegt.set(h, b);
    });
  });

  let rows = "";
  gpStunden().forEach((hr, idx) => {
    const alt = idx % 2 ? " row-alt" : "";
    const b = belegt.get(hr);
    const weich = b && (b.e.kind === "privat" || b.e.kind === "individuell");
    if (!b || weich) {
      rows += `<button class="slot gprow${alt}${weich ? " soft" : ""}${archivMark(day, hr) ? " hatarchiv" : ""}"
         data-day="${day}" data-hour="${hr}"
         aria-label="${DAYS_L[iTag]} ${pad(hr)}–${pad(hr + 2)} Uhr, frei">${archivMark(day, hr)}</button>`;
    } else {
      rows += `<div class="gprow gpvoll${alt}"></div>`;
    }
  });

  let bl = "";
  bloecke.forEach((b) => {
    const e = b.e;
    const oben = ((gpFrueh() ? b.von - GP_UNTEN : GP_OBEN - b.bis) * 100) / (GP_OBEN - GP_UNTEN);
    const hoch = ((b.bis - b.von) * 100) / (GP_OBEN - GP_UNTEN);
    const anzahl = b.spuren || 1;
    const breite = 100 / anzahl;
    const links = (b.spur || 0) * breite;
    /* Bei zwei Spuren eine sichtbare Lücke, damit nichts verschmilzt */
    const luft = anzahl > 1 ? 3 : 2;
    const c = colorOf(e) || "var(--surface-2)";
    const qc = quelleFarbe(e, true);
    const l = label(e);
    const status = e.status ? " done" : e.nb && Object.keys(e.nb).length ? " halb" : "";
    const rechts = e.kind === "terminieren" ? " rechts" : "";
    const zeit = b.fest ? `${gpZeit(b.von)}–${gpZeit(b.bis)}` : `${pad(b.h)}–${pad(b.h + 2)}`;
    const tipp = `${l.t1}${e.quelle ? " · " + e.quelle : ""} · ${zeit}`;
    if (b.fremdTag) {
      bl += `<div class="gpblock fest fremdtag" style="top:${oben}%;height:${hoch}%;left:0;width:100%;
             background:${c};color:${textOn(c)}"><span class="gptxt"><b>${l.t1}</b></span></div>`;
      return;
    }
    /*
     * Kräftig = zugesagtes Ankunftsfenster, hell schraffiert = mögliche Dauer.
     * Feste Termine haben einen Rahmen und keine Zweiteilung.
     */
    const fruehOben = gpFrueh();
    let teil = "",
      textLage = "",
      bisTag = "";
    if (!b.fest) {
      const fEnde = Math.min(b.bis, b.h + 1); // Ende des Ankunftsfensters
      const restPct = Math.max(0, ((b.bis - fEnde) / (b.bis - b.von)) * 100);
      teil = `<span class="gprest" style="${fruehOben ? "bottom" : "top"}:0;height:${restPct}%"></span>`;
      bisTag = `<span class="gpbis" style="${fruehOben ? "bottom" : "top"}:3px">bis ${pad(b.h + 2)}</span>`;
      textLage = fruehOben ? "oben" : "unten";
    }
    const zeile2 = b.fest ? zeit : `Ankunft ${pad(b.h)}–${pad(b.h + 1)}`;
    bl += `<button class="slot filled gpblock gpa${b.fest ? " fest" : ""}${b.spuren > 1 ? " geteilt" : ""}${status}"
       style="top:calc(${oben}% + 2px);height:calc(${hoch}% - 5px);left:calc(${links}% + ${luft}px);
              width:calc(${breite}% - ${luft * 2}px);
              background:${c};color:${textOn(c)}${qc ? `;--qc:${qc}` : ""}"
       data-day="${day}" data-hour="${b.h}" title="${tipp}">
       ${teil}
       ${qc ? `<span class="gpq"></span>` : ""}
       <span class="gptxt${rechts} ${textLage}"><b>${l.t1}</b><em>${zeile2}</em></span>
       ${bisTag}
     </button>`;
  });

  return `<div class="gpday${+d === +heute ? " ist-heute" : ""}">
      <div class="gprows">${rows}</div><div class="gpblocks">${bl}</div></div>`;
}

/* Ersetzt die Rasteransicht aus 04-raster.js */
function render() {
  if (gpZeichnet) return;
  gpZeichnet = true;
  try {
    gpRender();
  } finally {
    gpZeichnet = false;
  }
}
function gpRender() {
  weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const { week, year } = isoWeek(monday);
  const vw = vertriebswoche(week, year);
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  document.getElementById("kwText").textContent = `KW ${week}`;
  document.getElementById("rangeText").textContent = `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  document.getElementById("todayBtn").hidden = +monday === +mondayOf(new Date());

  const breit = gpBreit();
  const tage = gpTageWahl().map((i) => ({ d: weekDays[i], i }));

  /* Kopfzeile */
  let kopf = `<div class="gpkopf"><span class="gprail gpvw"><b>VW</b><i>${vw.n}/${vw.of}</i></span>`;
  tage.forEach(({ d, i }) => {
    kopf += `<span class="gptag${+d === +heute ? " ist-heute" : ""}">${DAYS_S[i]}<small>${fmtShort(d)}</small></span>`;
  });
  kopf += `</div>`;

  /* Zeitleiste */
  let rail = `<div class="gprail">`;
  gpStunden().forEach((hr) => {
    rail += `<div class="gprz"><b>${pad(hr)}</b></div>`;
  });
  rail += `</div>`;

  const spalten = tage.map(({ d, i }) => gpSpalte(d, i, heute)).join("");

  /* Soll und Ist */
  const totals = weekDays.map((d) => dayTotals(dk(d)));
  const soll = sollWerte();
  const vmA = vertriebsmonat(monday);
  const istM = umsatz(vmA.fromK, vmA.toK);
  const zielM = monatsZiel(vmA);
  let mrows = "";
  METRICS.forEach((m) => {
    const txt = `<span class="klang">${m.n}</span><span class="kkurz">${m.kurz || m.n}</span>`;
    const lbl = txt;
    const ampel = m.k === "fg" || m.k === "wg" ? ampelPunkt(istM[m.k], zielM[m.k], vmA) : "";
    mrows += `<div class="gpmrow"><div class="gpmlbl">${lbl}${ampel}<small>${m.noSoll ? "ist" : "ist / soll"}</small></div>`;
    tage.forEach(({ i }) => {
      const inhalt = m.noSoll
        ? `<span class="ist">${eur(totals[i][m.k])}</span>`
        : `<span class="ist">${eur(totals[i][m.k])}</span><span class="sep">/</span><span class="soll">${eur(soll[m.k])}</span>`;
      mrows += m.click
        ? `<button type="button" class="gpm klick${m.noSoll ? " one" : ""}" data-mclick="${m.click}" aria-label="${m.n} eintragen">${inhalt}<i class="gpstift">✎</i></button>`
        : `<div class="gpm${m.noSoll ? " one" : ""}">${inhalt}</div>`;
    });
    mrows += `</div>`;
  });

  /* Farblegende */
  const leg = [
    ["Kundentermin", COLORS.kunde],
    ["Premium CheckIn", COLORS.premium],
    ["Terminieren", COLORS.terminieren],
    ["Promotion", COLORS.promotion],
    ["Meeting", COLORS.meeting],
    ["Privat", COLORS.privat],
    ["Eigenkauf", COLORS.eigenkauf],
  ]
    .map(([n, c]) => `<span class="gplc"><i style="background:${c}"></i>${n}</span>`)
    .join("");

  if (gpKlassen === null) gpKlassen = grid.className;
  grid.className = (gpKlassen ? gpKlassen + " " : "") + "gp " + (breit ? "breit" : "schmal");
  grid.style.setProperty("--gp-tage", tage.length);
  const namen = { tag: "1 Tag", drei: "3 Tage", woche: "Woche" };
  const richtung = `<div class="gpleiste">
      <span class="gpansicht" role="group" aria-label="Ansicht">${gpErlaubt()
        .map(
          (a) =>
            `<button type="button" data-gpansicht="${a}" aria-pressed="${gpAnsicht() === a}">${namen[a]}</button>`,
        )
        .join("")}</span>
      <button type="button" class="gprichtung" data-gprichtung
        title="Reihenfolge der Stunden umschalten" aria-label="Reihenfolge umschalten: ${gpFrueh() ? "früh oben" : "spät oben"}">
        <span aria-hidden="true">⇅</span></button>
    </div>`;
  const erklaerung = `<div class="gperkl">
      <span class="gpez"><i class="m voll"></i><span><b>Volle Farbe</b> = dein Ankunftsfenster, das sagst du dem Kunden zu</span></span>
      <span class="gpez"><i class="m hell"></i><span><b>Heller Teil</b> = so lange darf der Termin noch dauern</span></span>
      <span class="gpez"><i class="m fix"></i><span><b>Mit Rahmen</b> = feste Zeit, z. B. ein Meeting</span></span>
    </div>`;
  grid.innerHTML =
    richtung +
    kopf +
    `<div class="gpplan">${rail}<div class="gpspalten">${spalten}</div></div>` +
    `<div class="gpmetrics">${mrows}</div>` +
    erklaerung +
    `<div class="gplegende">${leg}</div>`;
  tagesleiste();
}

/* Bei Lagewechsel die Spaltenzahl neu bestimmen */
let gpBreitVorher = gpBreit();
addEventListener("resize", () => {
  const jetztBreit = gpBreit();
  if (jetztBreit !== gpBreitVorher) {
    gpBreitVorher = jetztBreit;
    try {
      render();
    } catch (e) {}
  }
});
/* Tagesleiste wählt am Handy den sichtbaren Tag */
const gpSetzeTagWahl = setzeTagWahl;
setzeTagWahl = function () {
  gpSetzeTagWahl();
  /*
   * Nur wenn wir nicht gerade mitten im Zeichnen sind – tagesleiste()
   * ruft diese Funktion am Ende selbst auf.
   */
  if (!gpBreit() && !gpZeichnet) render();
};

/* Schalter für die Richtung – einmal am Raster angemeldet */
grid.addEventListener("click", (ev) => {
  const a = ev.target.closest("[data-gpansicht]");
  if (a) {
    settings.planerAnsicht = a.dataset.gpansicht;
    saveData();
    render();
    return;
  }
  const b = ev.target.closest("[data-gprichtung]");
  if (!b) return;
  settings.planerRichtung = gpFrueh() ? "spaet" : "frueh";
  saveData();
  render();
});

/* ---------- Plus-Knopf unten rechts ---------- */
(function () {
  const fab = document.createElement("button");
  fab.type = "button";
  fab.id = "gpFab";
  fab.className = "gpfab";
  fab.setAttribute("aria-label", "Termin anlegen");
  fab.innerHTML = '<span aria-hidden="true">+</span>';
  document.body.appendChild(fab);
  fab.onclick = () => {
    const d = gpBreit() ? new Date() : weekDays[tagWahl] || new Date();
    const vorschlag = (() => {
      const h = new Date().getHours() + 1;
      return Math.min(22, Math.max(7, h));
    })();
    const tag = dk(d);
    simpleDialog(
      "Termin anlegen",
      "Tag und Startzeit wählen",
      `<div class="grp">
         ${fld("gpfTag", "Tag", tag, "date")}
         <div class="field"><label for="gpfH">Startzeit</label>${hourSelect("gpfH", vorschlag)}</div>
       </div>
       <p class="err" id="gpfErr" hidden></p>`,
      () => {
        const t = document.getElementById("gpfTag").value;
        const h = +document.getElementById("gpfH").value;
        const err = document.getElementById("gpfErr");
        if (!t) {
          err.textContent = "Bitte einen Tag wählen.";
          err.hidden = false;
          return;
        }
        if (entries[key(t, h)]) {
          err.textContent = "Um diese Zeit steht schon ein Termin.";
          err.hidden = false;
          return;
        }
        closeModal();
        monday = mondayOf(fromDk(t));
        tagWahl = (fromDk(t).getDay() + 6) % 7;
        render();
        openSlot(t, h);
      },
      "Weiter",
    );
  };
})();

/*
 * Die Teamansicht kopiert nur den Rasterinhalt; ein Rahmen mit denselben
 * Klassen sorgt dafür, dass die Planer-Gestaltung greift.
 */
const fremdAnsichtOhneKlassen = fremdAnsicht;
fremdAnsicht = function () {
  const e = fremdAnsichtOhneKlassen();
  const kl = (grid.className || "")
    .split(" ")
    .filter((x) => ["gp", "breit", "schmal"].includes(x))
    .join(" ");
  /* Die Spaltenzahl steht als Stilangabe am Raster und geht beim Kopieren verloren */
  const tage = ((e && e.gridHtml) || "").split('class="gpday').length - 1;
  if (e && e.gridHtml && kl)
    e.gridHtml = `<div class="${kl}" style="--gp-tage:${Math.max(1, tage)}">${e.gridHtml}</div>`;
  return e;
};
