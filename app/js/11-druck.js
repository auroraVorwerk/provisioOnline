/**
 * Druck
 *
 * Statistik und Potenzialliste werden über ein eigenes, festes Druckblatt
 * ausgegeben, das sich während der Druckvorschau nicht verändert.
 */

/*
 * Der eigene Stand bleibt unangetastet: Woche kurz umstellen, Tabelle
 * abholen, alles wieder zurücksetzen.
 */
function statTabelleFuer(mo) {
  const altM = new Date(monday),
    altT = weekDays.slice();
  let html = "";
  try {
    monday = mondayOf(new Date(mo));
    weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
    renderStat();
    html = document.getElementById("statTable").innerHTML;
  } catch (e) {
    console.error("Statistik f\u00fcr den Druck:", e);
  } finally {
    monday = altM;
    weekDays = altT;
    try {
      render();
      renderStat();
    } catch (e) {
      console.error(e);
    }
  }
  return html.replace(/<button[^>]*class="pdfbtn"[\s\S]*?<\/button>/, "");
}
/* Dasselbe für ein Teammitglied – die eigenen Daten kommen danach zurück */
function statTabelleFremd(blob, mo) {
  const sicherung = fremdStart();
  const altM = new Date(monday),
    altT = weekDays.slice();
  let html = "";
  try {
    applyData(blob);
    monday = mondayOf(new Date(mo));
    weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
    renderStat();
    html = document.getElementById("statTable").innerHTML;
  } catch (e) {
    console.error("Statistik des Mitglieds:", e);
  } finally {
    monday = altM;
    weekDays = altT;
    fremdEnde(sicherung);
  }
  return html.replace(/<button[^>]*class="pdfbtn"[\s\S]*?<\/button>/, "");
}
function druckBlattBauen(tabelle, mo, wer) {
  const start = mondayOf(new Date(mo));
  const ende = new Date(start);
  ende.setDate(ende.getDate() + 6);
  const name = wer || (me ? `${me.vorname} ${me.nachname}` : "");
  document.getElementById("druckStat").innerHTML = `
    <div class="dsblatt"><div class="dsinner">
      <div class="dskopf">${name}<small>${fmt(start)} – ${fmt(ende)}</small></div>
      <div class="dsflaeche"><table class="stat">${tabelle}</table></div>
    </div></div>`;
  druckTitel = name; /* der Name wird zum Dateinamen des PDFs */
}
/*
 * Zwei Maßstäbe: einer fürs Quer-, einer fürs Hochformat. So passt das
 * Blatt auf eine Seite, egal was im Druckfenster eingestellt wird.
 */
/*
 * Gemessen wird nur die natürliche Tabellengröße; die Skalierung
 * übernimmt das Druckblatt selbst (siehe --u im Stylesheet).
 */
function druckSkalieren() {
  const box = document.getElementById("druckStat");
  document.body.classList.add("druck-messen");
  const inner = box.querySelector(".dsinner");
  const t = box.querySelector("table.stat");
  const dw = Math.max(t ? t.scrollWidth : 0, inner ? inner.scrollWidth : 0, 400);
  const dh = Math.max(inner ? inner.scrollHeight : 0, 200);
  document.body.classList.remove("druck-messen");
  if (inner) {
    inner.style.setProperty("--dw", Math.ceil(dw * 1.01));
    inner.style.setProperty("--dh", Math.ceil(dh * 1.06)); /* etwas Luft nach unten */
  }
}
/*
 * Das Blatt bleibt bis zur nächsten Eingabe stehen. afterprint feuert auf
 * manchen Geräten bereits beim Öffnen der Vorschau und dient daher nicht als Auslöser.
 */
let druckKlasse = "",
  druckTitel = "";
const TITEL_NORMAL = document.title;
function druckModus(klasse, selbstDrucken) {
  if (druckKlasse) document.body.classList.remove(druckKlasse);
  druckKlasse = klasse;
  document.body.classList.add(klasse);
  if (druckTitel) document.title = druckTitel; /* bestimmt den Dateinamen */
  function aufraeumen() {
    if (!druckKlasse) return;
    document.body.classList.remove(druckKlasse);
    druckKlasse = "";
    document.title = TITEL_NORMAL;
    document.removeEventListener("pointerdown", beiTipp, true);
  }
  function beiTipp() {
    setTimeout(aufraeumen, 60);
  }
  setTimeout(() => document.addEventListener("pointerdown", beiTipp, true), 1500);
  setTimeout(aufraeumen, 300000);
  if (selbstDrucken)
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error(e);
      }
    }, 150);
}
function druckStarten(klasse) {
  druckModus(klasse, true);
}
/*
 * Wird stattdessen über den Browser gedruckt (Strg+P, Teilen → Drucken),
 * bekommt die Statistikseite dasselbe Blatt – sonst käme nur ein Ausschnitt.
 */
addEventListener("beforeprint", () => {
  if (druckKlasse) return;
  const seite = document.getElementById("page-statistik");
  if (!seite || !seite.classList.contains("active")) return;
  try {
    druckBlattBauen(statTabelleFuer(monday), monday, "");
    druckSkalieren();
    druckModus("drucke-stat", false);
  } catch (e) {
    console.error(e);
  }
});
/* Vor dem Download wird gefragt, welche Woche gedruckt werden soll */
function kwDialog(titel, startMo, cb) {
  const basis = mondayOf(new Date());
  const wochen = []; /* die letzten 26 Wochen – weiter reicht die Einsicht nicht */
  for (let i = 0; i >= -25; i--) {
    const m = new Date(basis);
    m.setDate(m.getDate() + i * 7);
    wochen.push(m);
  }
  const start = dk(mondayOf(new Date(startMo || basis)));
  simpleDialog(
    titel,
    "Welche Woche soll ins PDF?",
    `<div class="grp"><div class="field"><label for="kwSel">Kalenderwoche</label>
       <select id="kwSel">${wochen
         .map((m) => {
           const e = new Date(m);
           e.setDate(e.getDate() + 6);
           return `<option value="${dk(m)}"${dk(m) === start ? " selected" : ""}>KW ${isoWeek(m).week} · ${fmtShort(m)} – ${fmt(e)}</option>`;
         })
         .join("")}</select></div></div>
     <p class="hinweis">Das PDF zeigt ausschließlich die Statistik dieser Woche.
       A4 quer ist voreingestellt – Ausrichtung und Größe lassen sich im Druckfenster
       trotzdem umstellen, die Vorlage bleibt dabei stehen.</p>`,
    () => {
      const wert = document.getElementById("kwSel").value;
      closeModal();
      setTimeout(() => cb(mondayOf(fromDk(wert))), 80);
    },
    "PDF erstellen",
  );
}
function statPdf() {
  kwDialog("Statistik als PDF", monday, (mo) => {
    druckBlattBauen(statTabelleFuer(mo), mo, "");
    druckSkalieren();
    druckStarten("drucke-stat");
  });
}
document.addEventListener("click", (ev) => {
  if (ev.target.closest && ev.target.closest("#pdfBtn")) statPdf();
});
