/**
 * Wochenraster
 *
 * Grundraster des Planers: Antippen, Halten, Verschieben.
 */
const grid = document.getElementById("grid");
let weekDays = [];
function render() {
  weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const { week, year } = isoWeek(monday);
  const vw = vertriebswoche(week, year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  document.getElementById("kwText").textContent = `KW ${week}`;
  document.getElementById("rangeText").textContent = `${fmt(weekDays[0])} – ${fmt(weekDays[6])}`;
  document.getElementById("todayBtn").hidden = +monday === +mondayOf(new Date());

  let h = `<div class="cell corner" data-col="0"><span class="lbl"><span class="klang">Vertriebswoche</span><span class="kkurz">VW</span></span><span class="vw">${vw.n}/${vw.of}</span></div>`;
  weekDays.forEach((d, i) => {
    h += `<div class="cell dayhead${+d === +today ? " is-today" : ""}" data-col="${i + 1}">${DAYS_S[i]}<small>${fmtShort(d)}</small></div>`;
  });

  const blocked = weekDays.map((d) => blockedSet(dk(d)));
  START_HOURS.forEach((hr, idx) => {
    const alt = idx % 2 ? " row-alt" : "";
    h += `<div class="cell timelbl${alt}" data-col="0"><b>${pad(hr)}:00</b><span>${pad(hr + 2)}:00</span></div>`;
    weekDays.forEach((d, i) => {
      const day = dk(d),
        e = entries[key(day, hr)];
      if (!e && blocked[i].has(hr)) {
        const bk = blocked[i].get(hr);
        h += bk.soft
          ? `<button class="cell slot blocked soft${alt}" style="--bc:${bk.c}" data-col="${i + 1}" data-day="${day}" data-hour="${hr}" title="privat belegt – Termin trotzdem möglich"></button>`
          : `<div class="cell slot blocked${alt}" style="--bc:${bk.c}" data-col="${i + 1}" title="durch einen laufenden Termin belegt"></div>`;
      } else if (e) {
        const l = label(e),
          done = e.status ? " done" : e.nb && Object.keys(e.nb).length ? " halb" : "",
          c = colorOf(e);
        const qc = quelleFarbe(e, true);
        const stil =
          (c ? `background:${c};border-color:${c};color:${textOn(c)};` : "") + (qc ? `--qc:${qc}` : "");
        const st = stil ? ` style="${stil}"` : "";
        h += `<button class="slot filled col${done}${alt}${qc ? " hatq" : ""}"${st} data-col="${i + 1}" data-day="${day}" data-hour="${hr}" title="${l.t1}${e.quelle ? " · " + e.quelle : ""}"><span class="t1">${l.t1}</span>${l.t2 ? `<span class="t2">${l.t2}</span>` : ""}</button>`;
      } else {
        h += `<button class="slot${alt}${archivMark(day, hr) ? " hatarchiv" : ""}" data-col="${i + 1}" data-day="${day}" data-hour="${hr}" aria-label="${DAYS_L[i]} ${pad(hr)}–${pad(hr + 2)} Uhr, frei">${archivMark(day, hr)}</button>`;
      }
    });
  });
  h +=
    `<div class="spacer" data-col="0"></div>` +
    weekDays.map((d, i) => `<div class="spacer" data-col="${i + 1}"></div>`).join("");
  const totals = weekDays.map((d) => dayTotals(dk(d)));
  const soll = sollWerte();
  const vmA = vertriebsmonat(monday);
  const istM = umsatz(vmA.fromK, vmA.toK);
  const zielM = monatsZiel(vmA);
  METRICS.forEach((m) => {
    const txt = `<span class="klang">${m.n}</span><span class="kkurz">${m.kurz || m.n}</span>`;
    const lbl = m.click ? `<button class="mlbl" data-mclick="${m.click}">${txt}</button>` : txt;
    const ampel = m.k === "fg" || m.k === "wg" ? ampelPunkt(istM[m.k], zielM[m.k], vmA) : "";
    h += `<div class="cell metriclbl" data-col="0">${lbl}${ampel}<small>${m.noSoll ? "ist" : "ist / soll"}</small></div>`;
    weekDays.forEach((d, i) => {
      h += m.noSoll
        ? `<div class="cell metric one" data-col="${i + 1}"><span class="ist">${eur(totals[i][m.k])}</span></div>`
        : `<div class="cell metric" data-col="${i + 1}"><span class="ist">${eur(totals[i][m.k])}</span><span class="sep">/</span><span class="soll">${eur(soll[m.k])}</span></div>`;
    });
  });
  grid.innerHTML = h;
  tagesleiste();
}
/* Handyansicht: Leiste Mo–So über dem Raster */
function tagesleiste() {
  const bar = document.getElementById("tagbar");
  if (!bar) return;
  const today = dk(new Date());
  bar.innerHTML = weekDays
    .map((d, i) => {
      const tag = dk(d);
      const voll = START_HOURS.some((hr) => entries[key(tag, hr)]);
      return `<button type="button" data-tag="${i}" aria-pressed="${i === tagWahl}" class="${tag === today ? "ist-heute" : ""}">
      ${DAYS_S[i]}<small>${String(d.getDate()).padStart(2, "0")}.</small>
      <span class="tpunkt${voll ? "" : " leer"}"></span></button>`;
    })
    .join("");
  bar.querySelectorAll("[data-tag]").forEach(
    (b) =>
      (b.onclick = () => {
        tagWahl = +b.dataset.tag;
        setzeTagWahl();
      }),
  );
  setzeTagWahl();
}
function setzeTagWahl() {
  document.body.dataset.tagwahl = tagWahl;
  document
    .querySelectorAll("#tagbar [data-tag]")
    .forEach((b) => b.setAttribute("aria-pressed", +b.dataset.tag === tagWahl));
}
/* Termin gedrückt halten, dann Zielfeld antippen */
let schiebe = null,
  halteTimer = null;
function schiebeAn(day, hour) {
  schiebe = { day, hour };
  document.body.classList.add("schiebt");
  grid.querySelector(`[data-day="${day}"][data-hour="${hour}"]`)?.classList.add("quelle");
  zeigeSchiebeleiste();
}
function schiebeAus() {
  schiebe = null;
  document.body.classList.remove("schiebt");
  grid.querySelectorAll(".quelle").forEach((el) => el.classList.remove("quelle"));
  document.getElementById("schiebeleiste")?.remove();
}
function zeigeSchiebeleiste() {
  document.getElementById("schiebeleiste")?.remove();
  const bar = document.createElement("div");
  bar.id = "schiebeleiste";
  bar.innerHTML = `<span>Zielfeld antippen</span><button class="mini" id="schiebeStop">Abbrechen</button>`;
  document.body.appendChild(bar);
  document.getElementById("schiebeStop").onclick = schiebeAus;
}
let halteStart = null;
grid.addEventListener("pointerdown", (ev) => {
  const s = ev.target.closest(".slot.filled");
  if (!s || schiebe) return;
  halteStart = { x: ev.clientX, y: ev.clientY };
  clearTimeout(halteTimer);
  halteTimer = setTimeout(() => {
    schiebeAn(s.dataset.day, +s.dataset.hour);
    if (navigator.vibrate) navigator.vibrate(15);
  }, 420);
});
grid.addEventListener(
  "pointermove",
  (ev) => {
    if (!halteStart) return;
    if (Math.abs(ev.clientX - halteStart.x) > 8 || Math.abs(ev.clientY - halteStart.y) > 8) {
      clearTimeout(halteTimer);
      halteStart = null; // es wird gescrollt, nicht gehalten
    }
  },
  { passive: true },
);
["pointerup", "pointercancel"].forEach((t) =>
  grid.addEventListener(
    t,
    () => {
      clearTimeout(halteTimer);
      halteStart = null;
    },
    { passive: true },
  ),
);
grid.addEventListener("contextmenu", (ev) => {
  if (ev.target.closest(".slot")) ev.preventDefault();
});

grid.addEventListener("click", (ev) => {
  const ml = ev.target.closest("[data-mclick]");
  if (ml) {
    ml.dataset.mclick === "einkauf" ? dlgEinkauf() : dlgRahmen();
    return;
  }
  const mark = ev.target.closest(".amark");
  if (mark) {
    ev.stopPropagation();
    archivZeigen(mark.dataset.tag, +mark.dataset.h);
    return;
  }
  const s = ev.target.closest(".slot");
  if (!s) return;
  if (s.classList.contains("blocked") && !s.classList.contains("soft")) return;
  if (schiebe) {
    const ziel = { day: s.dataset.day, hour: +s.dataset.hour };
    if (ziel.day === schiebe.day && ziel.hour === schiebe.hour) {
      schiebeAus();
      return;
    }
    if (entries[key(ziel.day, ziel.hour)]) {
      schiebeAus();
      return;
    }
    entries[key(ziel.day, ziel.hour)] = entries[key(schiebe.day, schiebe.hour)];
    delete entries[key(schiebe.day, schiebe.hour)];
    schiebeAus();
    renderAll();
    return;
  }
  openSlot(s.dataset.day, +s.dataset.hour);
});

/* Einfache Dialoge ohne Schrittkette */
function simpleDialog(title, sub, body, onSave, saveLabel = "Speichern") {
  draft = { nb: {} };
  step = "simple";
  error = "";
  modal.classList.add("open");
  sheet.innerHTML = `<header><div><h3>${title}</h3>${sub ? `<div class="when">${sub}</div>` : ""}</div>
      <button class="x" data-close aria-label="Schließen">✕</button></header>${body}
    <div class="actions"><button class="btn" data-close>Abbrechen</button><button class="btn primary" id="okBtn">${saveLabel}</button></div>`;
  sheetNormalisieren();
  document.getElementById("okBtn").onclick = onSave;
}
function dlgEinkauf() {
  const liste = einkaeufe
    .slice()
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 6);
  simpleDialog(
    "K70 Einkauf erfassen",
    "Bestellungen zählen als Festgebietsumsatz",
    `<div class="grp">
       ${fld("ekDatum", "Wann wurde bestellt?", dk(new Date()), "date")}
       ${fld("ekBetrag", "Bestellt für (Brutto €)", "", "text", 'inputmode="decimal"')}
     </div>
     ${
       liste.length
         ? `<div class="h4">Zuletzt erfasst</div><div class="grp">${liste
             .map(
               (e, i) => `<div class="aline"><span class="nm">${fmt(fromDk(e.datum))}</span>
         <span class="vl">${eur(num(e.brutto))} €</span>
         <button class="mini" data-del="${einkaeufe.indexOf(e)}">✕</button></div>`,
             )
             .join("")}</div>`
         : ""
     }`,
    () => {
      const d = document.getElementById("ekDatum").value;
      const b = num(document.getElementById("ekBetrag").value);
      if (!d || b <= 0) {
        return;
      }
      einkaeufe.push({ datum: d, brutto: String(b) });
      closeModal();
      renderAll();
    },
    "Einkauf speichern",
  );
  sheet.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        einkaeufe.splice(+b.dataset.del, 1);
        closeModal();
        renderAll();
      }),
  );
}
function dlgRahmen() {
  simpleDialog(
    "K70 Bestellrahmen",
    "Grundlage für das Soll bei K70 Verkauf und Einkauf",
    `<div class="grp">${fld("rhBetrag", "Bestellrahmen im Vertriebsmonat (Brutto €)", settings.bestellrahmen || "", "text", 'inputmode="decimal"')}</div>`,
    () => {
      settings.bestellrahmen = num(document.getElementById("rhBetrag").value);
      closeModal();
      renderAll();
    },
  );
}
