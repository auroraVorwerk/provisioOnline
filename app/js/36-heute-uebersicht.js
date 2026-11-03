/**
 * Heute – Übersicht
 *
 * Ersetzt renderHeute() aus 28-heute.js mit kompakter Darstellung:
 * Zielkacheln (Ist/Soll), offene Anrufe und Nachbereitungen, heutiger Tag.
 */

function hKachel(titel, ist, ziel, klasse) {
  const pct = ziel > 0 ? Math.min(100, Math.round((ist / ziel) * 100)) : 0;
  const zustand = !ziel ? "" : ist >= ziel ? " ok" : klasse || "";
  return `<div class="hkachel${zustand}">
    <span class="hkl">${titel}</span>
    <span class="hkv"><b>${ist}</b><s>/${ziel > 0 ? ziel : "–"}</s></span>
    <span class="hkbar"><i style="width:${pct}%"></i></span>
  </div>`;
}

function hFenster(titel, sub, inhalt) {
  let ov = document.getElementById("hFenster");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "hFenster";
    ov.className = "hfenster";
    document.body.appendChild(ov);
    ov.addEventListener("click", (ev) => {
      if (ev.target === ov || ev.target.closest("[data-hzu]")) ov.hidden = true;
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") ov.hidden = true;
    });
  }
  ov.innerHTML = `<div class="hfbox" role="dialog" aria-modal="true" aria-label="${titel}">
    <div class="hfgriff"></div>
    <div class="hfkopf"><div><b>${titel}</b>${sub ? `<span>${sub}</span>` : ""}</div>
      <button class="mini" data-hzu aria-label="Schließen">✕</button></div>
    <div class="hfinhalt">${inhalt}</div></div>`;
  ov.hidden = false;
  return ov;
}

function hOeffne(tag, h) {
  const ov = document.getElementById("hFenster");
  if (ov) ov.hidden = true;
  monday = mondayOf(fromDk(tag));
  render();
  openSlot(tag, +h);
}

function renderHeute() {
  const box = document.getElementById("heute");
  if (!box || !me) return;
  const d = new Date();
  const heute = dk(d);
  const liste = HOURS_ASC.map((h) => ({ h, e: entries[key(heute, h)] })).filter((x) => x.e);
  const offen = offeneNachbereitung();
  const anrufe = offeneAnrufe();
  const bald = kommendeAnrufe();
  const v = vorbereitung();
  const jetztH = d.getHours();

  /* ---------- Kacheln ---------- */
  const kacheln = v.zielTermine
    ? `<div class="hkompass">
        ${hKachel("Kundentermine<br>nächste Woche", v.termine, v.zielTermine, " fehlt")}
        ${hKachel("Festgebiets-<br>begehung", v.bloecke, v.zielFGB || 0)}
        ${hKachel("Promotion<br>diese Woche", v.promos, v.zielPromo || 0)}
      </div>
      <p class="hkhinweis">Bedarf aus dem Provisionswunsch${
        v.proFGB ? ` · ${dec(v.proFGB, 1)} Termine je Block` : ""
      }${v.proPromo ? ` · ${dec(v.proPromo, 1)} je Promotion` : ""}</p>`
    : `<div class="hleer">Sobald im Provisionswunsch dein Einkommen steht, erscheinen hier deine Wochenziele.
        <button class="mini" data-leerziel="wunsch">Zum Provisionswunsch</button></div>`;

  /* ---------- Streifen ---------- */
  const anzahlCalls = anrufe.length;
  const streifen = `<div class="hstreifen">
    <button class="hpill${anzahlCalls ? " heiss" : ""}" id="hCalls">
      <span class="hz">${anzahlCalls}</span>
      <span class="htx"><b>Offene Calls</b><span>${
        anzahlCalls
          ? anrufe
              .slice(0, 2)
              .map((a) => (a.art === "happy" ? "Happy Call" : "Reminder"))
              .join(" · ")
          : bald.length
            ? "vorgemerkt: " + bald[0].sub
            : "nichts offen"
      }</span></span>
    </button>
    <button class="hpill${offen.length ? " heiss" : ""}" id="hNb">
      <span class="hz">${offen.length}</span>
      <span class="htx"><b>Nachbereitung</b><span>${
        offen.length ? "älteste vom " + fmtShort(fromDk(offen[0].tag)) : "alles erledigt"
      }</span></span>
    </button>
  </div>`;

  /* ---------- Tagesliste ---------- */
  const zeile = ({ h, e }) => {
    const l = label(e),
      c = colorOf(e) || "var(--accent)";
    const qc = quelleFarbe(e, true);
    const adr = adresseVon(e);
    const laeuft = jetztH >= h && jetztH < h + 2;
    const fest = ["meeting", "privat", "individuell"].includes(e.kind) && e.von && e.bis;
    const zeit = fest
      ? `${e.start || e.von}<i>${e.bis}</i>`
      : e.start
        ? `${e.start}<i>Uhr</i>`
        : `${pad(h)}<i>–${pad(h + 2)}</i>`;
    const status = e.status
      ? `<span class="hst ok">fertig</span>`
      : h + 2 <= jetztH
        ? `<span class="hst offen">offen</span>`
        : laeuft
          ? `<span class="hst jetzt">jetzt</span>`
          : "";
    const name = e.nachname ? `${e.vorname ? e.vorname.charAt(0) + ". " : ""}${e.nachname}` : l.t1;
    const sub = [l.t2 && l.t2 !== name ? l.t2 : "", adr].filter(Boolean).join(" · ");
    return `<button class="hzeile${laeuft ? " laeuft" : ""}" data-oeffne="${heute}|${h}">
      <span class="hzeit">${zeit}</span>
      <span class="hstrich" style="background:${qc || c}"></span>
      <span class="hin"><b>${name}</b>${sub ? `<span>${sub}</span>` : ""}</span>
      ${status}
    </button>`;
  };
  const tag = `<div class="asec htag">
    <div class="htkopf"><h3>Heute · ${DAYS_S[(d.getDay() + 6) % 7]} ${fmtShort(d)}</h3>
      <span>${liste.length ? liste.length + (liste.length === 1 ? " Termin" : " Termine") : "frei"}</span></div>
    ${liste.length ? liste.map(zeile).join("") : `<p class="hleerzeile">Heute ist nichts eingetragen.</p>`}
  </div>`;

  box.innerHTML = kacheln + streifen + tag;

  /* ---------- Bedienung ---------- */
  box.querySelectorAll("[data-oeffne]").forEach(
    (b) =>
      (b.onclick = () => {
        const [t, h] = b.dataset.oeffne.split("|");
        hOeffne(t, h);
      }),
  );
  document.getElementById("hCalls").onclick = () => {
    if (!anrufe.length && !bald.length) return;
    const ov = hFenster(
      "Offene Calls",
      anrufe.length ? `${anrufe.length} fällig` : "nichts fällig",
      (anrufe.length
        ? anrufe
            .map(
              (a) => `<div class="hfzeile">
          <div class="hfin"><b>${a.titel}</b><span>${a.sub}</span></div>
          <div class="hfakt">
            ${a.e.telefon ? `<a class="mini" href="${telLink(a.e.telefon)}">Anrufen</a>` : ""}
            <button class="mini" data-rufauf="${a.tag}|${a.h}">Öffnen</button>
            <button class="mini" data-rufweg="${a.art}|${a.tag}|${a.h}">Erledigt</button>
          </div></div>`,
            )
            .join("")
        : `<p class="hleerzeile">Kein Anruf fällig.</p>`) +
        (bald.length
          ? `<p class="hfnotiz">Vorgemerkt: ${bald
              .map((b) => b.sub)
              .slice(0, 4)
              .join(" · ")}</p>`
          : ""),
    );
    ov.querySelectorAll("[data-rufauf]").forEach(
      (b) =>
        (b.onclick = () => {
          const [t, h] = b.dataset.rufauf.split("|");
          hOeffne(t, h);
        }),
    );
    ov.querySelectorAll("[data-rufweg]").forEach(
      (b) =>
        (b.onclick = () => {
          const [art, t, h] = b.dataset.rufweg.split("|");
          const e = entries[key(t, +h)];
          if (!e) return;
          if (art === "happy") e.happyErledigt = dk(new Date());
          else e.bestaetigt = dk(new Date());
          ov.hidden = true;
          renderAll();
        }),
    );
  };
  document.getElementById("hNb").onclick = () => {
    if (!offen.length) return;
    const ov = hFenster(
      "Nachbereitung offen",
      `${offen.length} ${offen.length === 1 ? "Termin" : "Termine"}`,
      offen
        .map((o) => {
          const l = label(o.e);
          const halb = o.e.nb && Object.keys(o.e.nb).length;
          return `<button class="hfzeile knopf" data-nbauf="${o.tag}|${o.h}">
          <div class="hfin"><b>${o.e.nachname || l.t1 || "Termin"}</b>
            <span>${DAYS_S[(fromDk(o.tag).getDay() + 6) % 7]} ${fmtShort(fromDk(o.tag))} · ${pad(o.h)}–${pad(o.h + 2)} Uhr</span></div>
          <span class="hst ${halb ? "halb" : "offen"}">${halb ? "halb" : "leer"}</span>
        </button>`;
        })
        .join(""),
    );
    ov.querySelectorAll("[data-nbauf]").forEach(
      (b) =>
        (b.onclick = () => {
          const [t, h] = b.dataset.nbauf.split("|");
          hOeffne(t, h);
        }),
    );
  };
}
