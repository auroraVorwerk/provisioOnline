/**
 * App-Rahmen
 *
 * Navigation, Menü, Seitenwechsel und Start der App.
 */
document.getElementById("chips").innerHTML = CATS.map(
  (c) => `<span class="chip"><i style="--c:${c.c}"></i>${c.t}</span>`,
).join("");
/*
 * ---------- Umsatz- und Provisionsüberblick ----------
 * Zeigt auf Heute und im Planer die Zahlen des laufenden Vertriebsmonats
 * aus dem Provisionsrechner.
 */
function renderUeberblick() {
  const ziele = [document.getElementById("uebPlaner")].filter(Boolean);
  if (!ziele.length || !me) return;
  const vm = vertriebsmonat(new Date());
  const u = umsatz(vm.fromK, vm.toK);
  const p = provision(u, vm.weeks);
  const html = `
    <div class="asec ueberblick">
      <h3>Vertriebsmonat ${vm.idx}</h3>
      <p class="sub">${vm.quartal}. Quartal · KW ${vm.startW}–${vm.endW} · ${vm.weeks} Wochen</p>
      <div class="kpis">
        ${kpi("Festgebietsumsatz", eur(u.fg) + " \u20AC", "brutto")}
        ${kpi("Weißgebietsumsatz", eur(u.wg) + " \u20AC", "brutto")}
        ${kpi("K70 Einkauf", eur(u.k70ein) + " \u20AC", "Warenkredit brutto")}
        ${kpi(
          "Provision inkl. Bonus",
          eur(p.prov + p.vers) + " \u20AC",
          p.next ? `noch ${eur(p.next.fehlt)} \u20AC netto bis ${p.next.pct} %` : "höchste Stufe erreicht",
          "hero",
        )}
      </div>
    </div>`;
  ziele.forEach((z) => (z.innerHTML = html));
}

/* Sicherheitsnetz: überall dort, wo Zahlen erwartet werden, die Zahlentastatur öffnen */
const ZAHLENFELD =
  /(umsatz|betrag|einheiten|anzahl|auftraege|km|preis|menge|plz|einkommen|quote|rahmen|tage|zahl|ziel|team|einsteiger|minus|bestand)/i;
function zahlenTastatur() {
  document
    .querySelectorAll(
      "input:not([inputmode]):not([type=date]):not([type=month]):not([type=time]):not([type=file]):not([type=range]):not([type=checkbox])",
    )
    .forEach((el) => {
      const kenn =
        (el.id || "") + " " + (el.getAttribute("data-wf") || "") + " " + (el.getAttribute("data-tu") || "");
      if (el.type === "number") {
        el.setAttribute("inputmode", "numeric");
        return;
      }
      if (ZAHLENFELD.test(kenn)) el.setAttribute("inputmode", "decimal");
    });
}
function renderAll() {
  /* Jede Seite einzeln zeichnen: stolpert eine, bleiben die anderen trotzdem gefüllt */
  [
    render,
    renderHeute,
    renderUeberblick,
    renderFaq,
    renderPapierkorb,
    renderJahr,
    renderStat,
    renderPotenzial,
    renderEmpfehlung,
    renderAusw,
    renderProv,
    renderWunsch,
    renderTeam,
    renderProfil,
    renderInventur,
    renderZiele,
    renderJobtickets,
    renderTeamumsatz,
    renderFahrten,
    renderKunden,
    renderWiedervorlage,
  ].forEach((f) => {
    try {
      f();
    } catch (e) {
      console.error("Fehler beim Zeichnen von " + (f.name || "?") + ":", e);
    }
  });
  try {
    zahlenTastatur();
  } catch (e) {}
  saveData();
}
const shiftWeek = (n) => {
  monday.setDate(monday.getDate() + n);
  renderAll();
};
document.getElementById("prev").onclick = () => shiftWeek(-7);
document.getElementById("next").onclick = () => shiftWeek(7);
document.getElementById("prev2").onclick = () => shiftWeek(-7);
document.getElementById("next2").onclick = () => shiftWeek(7);
document.getElementById("todayBtn").onclick = () => {
  monday = mondayOf(new Date());
  renderAll();
};
document.getElementById("kopierBtn").onclick = () => wocheKopieren();
function wocheKopieren() {
  const arten = [
    ["terminieren", "Terminierungen"],
    ["meeting", "Meetings"],
    ["privat", "Privat"],
    ["individuell", "Individuell"],
  ];
  const ziel = new Date(monday);
  ziel.setDate(ziel.getDate() + 7);
  simpleDialog(
    "Woche kopieren",
    `aus KW ${isoWeek(monday).week}`,
    `<div class="grp">
       <div class="sect"><span class="lb">Was übernehmen?</span>
         <div class="checks stack">${arten
           .map(([k, t]) => `<button type="button" data-wk="${k}" aria-pressed="true">${t}</button>`)
           .join("")}</div></div>
       ${fld("wkZiel", "In die Woche ab", dk(ziel), "date")}
     </div>
     <p class="hinweis">Kundentermine und Premium CheckIns werden nie kopiert. Belegte Plätze bleiben unberührt.</p>
     <p class="err" id="wkErr" hidden></p>`,
    () => {
      const gewaehlt = [...document.querySelectorAll('[data-wk][aria-pressed="true"]')].map(
        (b) => b.dataset.wk,
      );
      const zielMontag = mondayOf(fromDk(document.getElementById("wkZiel").value));
      const err = document.getElementById("wkErr");
      if (!gewaehlt.length) {
        err.textContent = "Bitte mindestens eine Art wählen.";
        err.hidden = false;
        return;
      }
      let n = 0;
      weekDays.forEach((d, i) => {
        const von = dk(d);
        const zt = new Date(zielMontag);
        zt.setDate(zt.getDate() + i);
        const nach = dk(zt);
        HOURS_ASC.forEach((h) => {
          const e = entries[key(von, h)];
          if (!e || !gewaehlt.includes(e.kind)) return;
          if (entries[key(nach, h)]) return;
          const kopie = { ...e };
          delete kopie.nb;
          delete kopie.status;
          delete kopie.bisTag;
          entries[key(nach, h)] = kopie;
          n++;
        });
      });
      closeModal();
      monday = zielMontag;
      renderAll();
    },
    "Kopieren",
  );
  sheet
    .querySelectorAll("[data-wk]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true")),
    );
}
document.getElementById("todayBtn2").onclick = () => {
  monday = mondayOf(new Date());
  renderAll();
};

const burger = document.getElementById("burger"),
  drawer = document.getElementById("drawer"),
  scrim = document.getElementById("scrim");
function setMenu(open) {
  drawer.classList.toggle("open", open);
  scrim.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
  burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
}
burger.onclick = () => setMenu(!drawer.classList.contains("open"));
scrim.onclick = () => setMenu(false);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

function show(k) {
  if (!PAGES[k]) k = "heute";
  if ((k === "team" || k === "teamumsatz" || k === "teammeldung") && !istTeamleiter()) k = "planer";
  if (k === "kbdelete") k = "planer"; // Seite entfernt (war Admin-Funktion)
  document.getElementById("pagetitle").textContent = PAGES[k];
  document.title = "Provisio – " + PAGES[k];
  /*
   * B7 + B8: die Kopfleiste am Handy trägt den Seitennamen, der Body
   * merkt sich die Seite - daran hängt die Größe des Kopfbereichs.
   */
  document.body.dataset.page = k;
  const mk = document.getElementById("markText");
  if (mk) mk.dataset.seite = PAGES[k];
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + k));
  document
    .querySelectorAll(".navlink")
    .forEach((a) =>
      a.dataset.page === k ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"),
    );
  setMenu(false);
  if (scrollY) scrollTo({ top: 0 });
}
/* Menü schließt per Kreuz und per Wischen nach oben */
const mz = document.getElementById("menueZu");
if (mz) mz.onclick = () => setMenu(false);
(function () {
  const dr = document.getElementById("drawer");
  if (!dr) return;
  let y0 = null;
  dr.addEventListener(
    "touchstart",
    (e) => {
      y0 = e.touches[0].clientY;
    },
    { passive: true },
  );
  dr.addEventListener(
    "touchend",
    (e) => {
      if (y0 === null) return;
      const weg = y0 - e.changedTouches[0].clientY;
      if (weg > 70 && dr.scrollTop <= 0) setMenu(false);
      y0 = null;
    },
    { passive: true },
  );
})();
/* Hell/Dunkel direkt aus der Kopfleiste */
const tk = document.getElementById("themaKnopf");
if (tk)
  tk.onclick = () => {
    themaSetzen(themaJetzt() === "Hell" ? "Dunkel" : "Hell", true);
    renderProfil();
  };
/* Schaltfläche im Leerzustand führt zur passenden Seite */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-leerziel]");
  if (b) location.hash = "#" + b.dataset.leerziel;
});
addEventListener("hashchange", () => show(location.hash.slice(1)));
{
  const tb = document.getElementById("topbar");
  let zu = null;
  addEventListener(
    "scroll",
    () => {
      const z = scrollY > 40;
      if (z !== zu) {
        zu = z;
        tb.classList.toggle("scrolled", z);
      }
    },
    { passive: true },
  );
}

renderAll();
show(location.hash.slice(1) || "heute");
