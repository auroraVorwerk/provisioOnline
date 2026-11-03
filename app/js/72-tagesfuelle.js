/**
 * Wie voll ist der Tag? (Beta 1.6)
 *
 * Grün eingefärbt = Arbeit. 100 % = Arbeitstag von 8 bis 22 Uhr (14 Stunden).
 *   Es zählen Termine, Terminieren, Meetings, Büro, Individuell und Messe –
 *   nicht: Privat, Urlaub, abgesagte/verschobene Termine und Verkäufe ohne
 *   Uhrzeit (Distanz, Lead, Leervorführung, Eigenkauf).
 *   Stufen: 1 = es gibt Termine, 2 = ab 30 %, 3 = ab 60 %, 4 = ab 85 %.
 * Orange Punkte = private Zeit am Tag (1 · 2 · 3 Punkte ab 1 · 30 · 60 %).
 * Ganzer Tag orange = abwesend (Urlaub, Krank, Schulung, Frei oder ein
 *   privater Termin über mehrere Tage).
 */
(function () {
  "use strict";
  const TAG_VON = 8,
    TAG_BIS = 22,
    LAENGE = TAG_BIS - TAG_VON;
  const ARBEIT = new Set(["kunde", "premium", "terminieren", "abholen", "meeting", "buero", "individuell", "messe", "d2d"]);
  const FREI = new Set(["abgesagt", "verschoben"]);

  const dez = (t) => {
    if (!t) return null;
    const [h, m] = String(t).split(":").map(Number);
    return h + (m || 0) / 60;
  };
  function stunden(tag, passt) {
    const stuecke = [];
    for (let h = 0; h < 24; h++) {
      const e = entries[key(tag, h)];
      if (!e || !passt(e) || FREI.has(e.status)) continue;
      const von = dez(e.start) ?? dez(e.von) ?? h;
      let bis = dez(e.bis);
      if (bis === null || bis <= von) bis = bis === 0 ? 24 : von + 2;
      const a = Math.max(von, TAG_VON),
        b = Math.min(bis, TAG_BIS);
      if (b > a) stuecke.push([a, b]);
    }
    if (!stuecke.length) return null;
    stuecke.sort((x, y) => x[0] - y[0]);
    let summe = 0,
      [a, b] = stuecke[0];
    for (const [x, y] of stuecke.slice(1)) {
      if (x <= b) b = Math.max(b, y);
      else {
        summe += b - a;
        [a, b] = [x, y];
      }
    }
    return (summe + (b - a)) / LAENGE;
  }

  /* Abwesende Tage: Urlaub & Co. sowie private Termine mit „bis einschließlich Tag“ */
  function abwesend(tag) {
    const u = (Array.isArray(settings.urlaub) ? settings.urlaub : []).find((x) => x.von <= tag && tag <= x.bis);
    if (u) return u.grund || "Urlaub";
    for (const k of Object.keys(entries)) {
      const e = entries[k];
      if (e && e.kind === "privat" && e.bisTag) {
        const start = k.split("|")[0];
        if (start <= tag && tag <= e.bisTag) return "Privat";
      }
    }
    return null;
  }

  function tagesFuelle(tag) {
    return stunden(tag, (e) => ARBEIT.has(e.kind));
  }
  function fuellStufe(tag) {
    const f = tagesFuelle(tag);
    if (f === null) return 0;
    return f >= 0.85 ? 4 : f >= 0.6 ? 3 : f >= 0.3 ? 2 : 1;
  }
  function privatStufe(tag) {
    const f = stunden(tag, (e) => e.kind === "privat" && !e.bisTag);
    if (f === null) return 0;
    return f >= 0.6 ? 3 : f >= 0.3 ? 2 : 1;
  }
  window.tagesFuelle = tagesFuelle;
  window.fuellStufe = fuellStufe;
  window.privatStufe = privatStufe;
  window.tagAbwesend = abwesend;
  window.punkteHTML = (n) => (n ? `<span class="ppunkte">${'<span class="pp"></span>'.repeat(n)}</span>` : "");

  /* Planer: Tagesleiste */
  function leisteFaerben() {
    const bar = document.getElementById("tagbar");
    if (!bar || typeof weekDays === "undefined") return;
    bar.querySelectorAll("[data-tag]").forEach((b) => {
      const d = weekDays[+b.dataset.tag];
      if (!d) return;
      const tag = dk(d);
      const weg = abwesend(tag);
      const f = tagesFuelle(tag);
      b.dataset.fuell = weg ? 0 : fuellStufe(tag);
      b.classList.toggle("abwesend", !!weg);
      const alt = b.querySelector(".ppunkte");
      if (alt) alt.remove();
      const p = weg ? 0 : privatStufe(tag);
      if (p) b.insertAdjacentHTML("beforeend", punkteHTML(p));
      b.title = weg ? weg : f === null ? "frei" : `${Math.round(f * 100)} % belegt`;
    });
  }
  if (typeof tagesleiste === "function") {
    const leisteOhne = tagesleiste;
    tagesleiste = function () {
      const r = leisteOhne.apply(this, arguments);
      leisteFaerben();
      return r;
    };
  }
  window.leisteFaerben = leisteFaerben;
})();
