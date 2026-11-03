/**
 * KW-Übersicht (Beta 1.5.3)
 *
 * Ein Tipp auf „KW …“ im Planer oder in der Statistik öffnet Monatskalender
 * wie bei Apple – mit Kalenderwochen am Rand. Die aktuelle Woche ist
 * umrandet, die gerade angezeigte Woche gefüllt; heute hat einen Punkt.
 * Tage mit Einträgen tragen einen kleinen Strich. Ein Tipp auf eine Woche
 * springt dorthin – so geht es schnell über lange Abstände.
 */
(function () {
  "use strict";
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const VOR = 6,
    NACH = 12; // Monate zurück und voraus

  function belegteTage() {
    const s = new Set();
    Object.keys(entries).forEach((k) => s.add(k.split("|")[0]));
    return s;
  }

  function monat(jahr, m, jetztMo, zeigMo, heute, belegt) {
    const erster = new Date(jahr, m, 1);
    const letzter = new Date(jahr, m + 1, 0);
    let zeilen = "";
    for (let mo = mondayOf(erster); +mo <= +letzter; mo = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() + 7)) {
      const { week } = isoWeek(mo);
      let tage = "";
      for (let i = 0; i < 7; i++) {
        const d = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() + i);
        const key = dk(d);
        const fremd = d.getMonth() !== m;
        const weg = !fremd && typeof tagAbwesend === "function" ? tagAbwesend(key) : null;
        const st = !fremd && !weg && typeof fuellStufe === "function" ? fuellStufe(key) : 0;
        const pp = !fremd && !weg && typeof privatStufe === "function" ? privatStufe(key) : 0;
        tage += `<span data-keinzaehlen class="kwtag${fremd ? " fremd" : ""}${key === heute && !fremd ? " heute" : ""}${weg ? " abw" : st ? " f" + st : ""}">${fremd ? "" : d.getDate()}${pp ? punkteHTML(pp) : ""}</span>`;
      }
      const klasse = (+mo === +zeigMo ? " gezeigt" : "") + (+mo === +jetztMo ? " jetzt" : "");
      zeilen += `<button type="button" class="kwzeile${klasse}" data-kwmo="${dk(mo)}" aria-label="KW ${week}">
        <span class="kwnr" data-keinzaehlen>${week}</span>${tage}</button>`;
    }
    return `<section class="kwmonat">
      <h4>${MONATE[m]}${jahr !== new Date().getFullYear() ? " " + jahr : ""}</h4>
      <div class="kwkopf"><span>KW</span><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
      ${zeilen}</section>`;
  }

  function oeffnen() {
    if (typeof monday === "undefined") return;
    const jetztMo = mondayOf(new Date());
    const zeigMo = new Date(monday);
    const heute = dk(new Date());
    const belegt = belegteTage();
    const basis = new Date();
    let html = "";
    for (let i = -VOR; i <= NACH; i++) {
      const d = new Date(basis.getFullYear(), basis.getMonth() + i, 1);
      html += monat(d.getFullYear(), d.getMonth(), jetztMo, zeigMo, heute, belegt);
    }
    draft = { nb: {} };
    step = "kwwahl";
    error = "";
    modal.classList.add("open");
    sheet.innerHTML = `<header><div><h3>Woche wählen</h3><div class="when">KW ${isoWeek(zeigMo).week} · ${fmt(zeigMo)}</div></div>
        <button class="x" data-close aria-label="Schließen">✕</button></header>
      <div class="kwliste" data-keinzaehlen>${html}</div>
      <div class="actions"><button class="btn primary" id="kwHeute">Diese Woche</button></div>`;
    sheetNormalisieren();
    const springen = (mo) => {
      monday = mondayOf(fromDk(mo));
      closeModal();
      renderAll();
    };
    sheet.querySelectorAll("[data-kwmo]").forEach((b) => (b.onclick = () => springen(b.dataset.kwmo)));
    document.getElementById("kwHeute").onclick = () => springen(dk(jetztMo));
    /* gezeigte Woche in die Mitte holen */
    requestAnimationFrame(() => {
      const g = sheet.querySelector(".kwzeile.gezeigt") || sheet.querySelector(".kwzeile.jetzt");
      const box = sheet.querySelector(".sheetkoerper") || sheet;
      if (g && box) box.scrollTop = g.offsetTop - box.clientHeight / 2 + g.offsetHeight / 2;
    });
  }
  window.kwUebersicht = oeffnen;

  document.addEventListener("click", (ev) => {
    const l = ev.target.closest && ev.target.closest(".weekbar .weeklabel");
    if (l) oeffnen();
  });
})();
