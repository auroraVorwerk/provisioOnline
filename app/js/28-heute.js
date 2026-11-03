/**
 * Heute
 *
 * Tagesübersicht mit Vorbereitung der kommenden Woche.
 */
const telLink = (t) => `tel:${String(t).replace(/[^\d+]/g, "")}`;
const mapsLink = (a) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`;
const adresseVon = (e) => [e.strasse, [e.plz, e.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/* Termine, die vorbei sind und noch keine Nachbereitung haben */
function offeneNachbereitung() {
  const heute = dk(new Date()),
    stunde = new Date().getHours();
  const offen = [];
  Object.keys(entries).forEach((k) => {
    const [tag, h] = k.split("|");
    const e = entries[k];
    if (!["kunde", "premium", "terminieren"].includes(e.kind)) return;
    if (e.status) return; // nur abgeschlossene verschwinden
    if (tag > heute || (tag === heute && +h + 2 > stunde)) return;
    offen.push({ tag, h: +h, e });
  });
  return offen.sort((a, b) => (a.tag === b.tag ? a.h - b.h : a.tag.localeCompare(b.tag)));
}
/* Anrufe, die heute anstehen: Happy Call und Terminbestätigung */
const ANRUF_VORLAUF = 5; // Tage vor dem Premium CheckIn
function offeneAnrufe() {
  const heute = dk(new Date());
  const liste = [];
  Object.keys(entries).forEach((k) => {
    const [tag, h] = k.split("|");
    const e = entries[k],
      n = e.nb || {};
    /* Happy Call: 21 Tage nach der Lieferung */
    if (n.verkauft === "Ja" && e.status === "stattgefunden" && !e.happyErledigt) {
      const basis = n.datiert === "Ja" && n.lieferdatum ? n.lieferdatum : tag;
      const faellig = plusTage(basis, 21);
      if (faellig <= heute)
        liste.push({
          art: "happy",
          tag,
          h: +h,
          e,
          faellig,
          titel: `Happy Call · ${e.vorname || ""} ${e.nachname || ""}`.trim(),
          sub: `gekauft am ${fmt(fromDk(basis))} · zufrieden? Empfehlungen holen`,
        });
    }
    /* Terminbestätigung: 5 Tage vor einem Premium CheckIn */
    if (e.kind === "premium" && !e.status && !e.bestaetigt) {
      const ab = plusTage(tag, -ANRUF_VORLAUF);
      if (ab <= heute && tag >= heute)
        liste.push({
          art: "reminder",
          tag,
          h: +h,
          e,
          titel: `Termin bestätigen · ${e.vorname || ""} ${e.nachname || ""}`.trim(),
          sub: `Premium CheckIn am ${fmt(fromDk(tag))} um ${e.start || pad(+h)} Uhr`,
        });
    }
  });
  return liste.sort((a, b) => a.tag.localeCompare(b.tag));
}
/*
 * Was demnächst fällig wird - damit sichtbar ist, dass die Erinnerung
 * vorgemerkt ist, auch wenn sie erst in ein paar Tagen aufpoppt
 */
function kommendeAnrufe() {
  const heute = dk(new Date());
  const liste = [];
  Object.keys(entries).forEach((k) => {
    const [tag, h] = k.split("|");
    const e = entries[k];
    if (e.kind !== "premium" || e.status || e.bestaetigt) return;
    const ab = plusTage(tag, -ANRUF_VORLAUF);
    if (ab > heute)
      liste.push({
        tag,
        h: +h,
        ab,
        e,
        titel: `Termin bestätigen · ${e.vorname || ""} ${e.nachname || ""}`.trim(),
        sub: `Premium CheckIn am ${fmt(fromDk(tag))} · Erinnerung ab ${fmt(fromDk(ab))}`,
      });
  });
  return liste.sort((a, b) => a.ab.localeCompare(b.ab));
}
/*
 * ---------- Vorbereitung auf die kommende Woche ----------
 * Wochenziel an Kundenterminen aus dem Provisionswunsch; die nötigen
 * Terminierungsblöcke ergeben sich aus den eigenen Quoten.
 */
const PROMO_KONTAKT_QUOTE = 0.65;
function vorbereitung() {
  /*
   * Bewusst zwei Zeiträume: Kundentermine zählen für die kommende Woche (Ziel),
   * Terminierung für die laufende Woche (Mittel zum Ziel).
   */
  const spanne = (ab) => {
    const d0 = new Date(monday);
    d0.setDate(d0.getDate() + ab);
    const d6 = new Date(d0);
    d6.setDate(d6.getDate() + 6);
    return [dk(d0), dk(d6)];
  };
  const [von, bis] = spanne(7); // kommende Woche
  const [tvon, tbis] = spanne(0); // laufende Woche

  let termine = 0,
    promos = 0,
    bloecke = 0;
  Object.keys(entries).forEach((k) => {
    const [tag] = k.split("|");
    const e = entries[k];
    if (e.kind === "kunde") {
      if (tag >= von && tag <= bis) termine++;
    } else if (e.kind === "terminieren") {
      if (tag >= tvon && tag <= tbis) {
        e.quelle === "Promotion" ? promos++ : bloecke++;
      }
    }
  });

  const zielTermine = Math.round(wunschWerte().tWoche || 0);
  const q = quoten(rangeWeeks);
  const proFGB = q.fgb.n ? q.fgb.termine / q.fgb.n : 0;
  /* Promotion: Termine plus Kontakte – rund 65 % der Kontakte werden später zum Termin */
  const promoErtrag = q.promo.termine + PROMO_KONTAKT_QUOTE * (q.promo.kontakte || 0);
  const proPromo = q.promo.n ? promoErtrag / q.promo.n : 0;
  const luecke = Math.max(0, zielTermine - termine);

  /* Die Lücke verteilt sich nach der tatsächlichen Herkunft bisheriger Termine. */
  const summe = q.fgb.termine + promoErtrag;
  const anteilFGB = summe ? q.fgb.termine / summe : 1;

  const zielFGB = proFGB ? Math.ceil((luecke * anteilFGB) / proFGB) : null;
  const zielPromo = proPromo ? Math.ceil((luecke * (1 - anteilFGB)) / proPromo) : null;

  return {
    von,
    bis,
    tvon,
    tbis,
    termine,
    promos,
    bloecke,
    zielTermine,
    luecke,
    zielFGB,
    zielPromo,
    proFGB,
    proPromo,
  };
}
function vorbZeile(titel, ist, ziel, fuss) {
  const pct = ziel > 0 ? Math.min(100, Math.round((ist / ziel) * 1000) / 10) : 0;
  const fertig = ziel > 0 && ist >= ziel;
  return `<div class="vzeile${fertig ? " erreicht" : ""}">
    <div class="vkopf"><span>${titel}</span>
      <b><span class="vzahl" data-bis="${ist}">${ist}</span> / ${ziel > 0 ? ziel : "–"}</b></div>
    <div class="zbalken"><i style="--soll:${pct}%"></i></div>
    <div class="vfuss">${fertig ? "steht ✓" : fuss}</div>
  </div>`;
}
function vorbereitungHTML() {
  const v = vorbereitung();
  if (!v.zielTermine) {
    return `<div class="asec vorb">
      <h3>Vorbereitung für nächste Woche</h3>
      <p class="aempty">Sobald im Provisionswunsch Einkommen und Abschlussquote stehen,
      erscheint hier dein Wochenziel.
      <br><button class="mini" data-leerziel="wunsch">Zum Provisionswunsch</button></p></div>`;
  }
  const rest = v.zielTermine - v.termine;
  const zeilen = [
    vorbZeile(
      "Kundentermine nächste Woche",
      v.termine,
      v.zielTermine,
      rest > 0 ? `noch ${rest} ${rest === 1 ? "Termin" : "Termine"} bis zum Wochenziel` : "Wochenziel steht",
    ),
    v.zielFGB !== null
      ? vorbZeile(
          "Festgebiet · Blöcke diese Woche",
          v.bloecke,
          v.zielFGB,
          `bei ${dec(v.proFGB, 1)} Terminen je Block`,
        )
      : `<div class="vzeile stumm"><div class="vkopf"><span>Festgebiet · Blöcke diese Woche</span><b>${v.bloecke}</b></div>
         <div class="vfuss">Noch keine Quote — nach ein paar Blöcken steht hier ein Ziel.</div></div>`,
    v.zielPromo !== null
      ? vorbZeile(
          "Promotion · Einsätze diese Woche",
          v.promos,
          v.zielPromo,
          `bei ${dec(v.proPromo, 1)} Terminen je Einsatz`,
        )
      : `<div class="vzeile stumm"><div class="vkopf"><span>Promotion · Einsätze diese Woche</span><b>${v.promos}</b></div>
         <div class="vfuss">Noch keine Quote — nach ein paar Einsätzen steht hier ein Ziel.</div></div>`,
  ].join("");
  return `<div class="asec vorb">
    <h3>Vorbereitung für nächste Woche</h3>
    <p class="sub">Termine für ${fmt(fromDk(v.von))} – ${fmt(fromDk(v.bis))} ·
      terminiert wird in dieser Woche</p>
    ${zeilen}
    <div class="actions einzeln"><button class="btn" data-leerziel="planer">Woche planen</button></div>
  </div>`;
}
/* Die Zahlen laufen einmal hoch, wenn der Block erscheint */
function vorbZahlen(box) {
  box.querySelectorAll(".vzahl").forEach((el) => {
    const bis = +el.dataset.bis || 0;
    if (bis <= 0 || bis > 60) return;
    let n = 0;
    const takt = Math.max(28, Math.round(520 / bis));
    el.textContent = "0";
    const t = setInterval(() => {
      n++;
      el.textContent = n;
      if (n >= bis) clearInterval(t);
    }, takt);
  });
}
function renderHeute() {
  const box = document.getElementById("heute");
  if (!box || !me) return;
  const heute = dk(new Date());
  const liste = HOURS_ASC.map((h) => ({ h, e: entries[key(heute, h)] })).filter((x) => x.e);
  const offen = offeneNachbereitung();
  const d = new Date();

  const jetztH = d.getHours();
  const karte = ({ h, e }) => {
    const l = label(e),
      c = colorOf(e) || "var(--accent)";
    const adr = adresseVon(e);
    const laeuft = jetztH >= h && jetztH < h + 2; // D22
    return `<div class="tkarte${laeuft ? " laeuft" : ""}" style="--c:${c}">
      ${laeuft ? `<span class="laeuftband">läuft gerade</span>` : ""}
      <div class="tzeit">${e.start ? e.start : pad(h)}<span>${e.start ? " Uhr" : "–" + pad(h + 2)}</span></div>
      <div class="tinfo">
        <div class="tname">${e.anrede ? e.anrede + " " : ""}${e.vorname || ""} ${e.nachname || l.t1}</div>
        ${l.t2 ? `<div class="tsub">${l.t2}</div>` : ""}
        ${adr ? `<div class="tsub">${adr}</div>` : ""}
        ${e.notiz ? `<div class="tnotiz">${e.notiz}</div>` : ""}
        <div class="taktion">
          ${e.telefon ? `<a class="mini" href="${telLink(e.telefon)}">Anrufen</a>` : ""}
          ${adr ? `<a class="mini" href="${mapsLink(adr)}" target="_blank" rel="noopener">Route</a>` : ""}
          <button class="mini" data-oeffne="${heute}|${h}">Öffnen</button>
        </div>
        ${
          e.status
            ? `<span class="tstatus">✓ ${e.status === "nachbereitet" ? "Nachbereitet" : "Erfasst"}</span>`
            : ""
        }
      </div>
    </div>`;
  };

  const anrufe = offeneAnrufe();
  const bald = kommendeAnrufe();
  box.innerHTML = `
    ${vorbereitungHTML()}
    ${
      anrufe.length
        ? `<div class="rufbox">
      <b>${anrufe.length} ${anrufe.length === 1 ? "Anruf steht an" : "Anrufe stehen an"}</b>
      ${anrufe
        .map(
          (a) => `<div class="rufzeile ${a.art}">
        <div class="rinfo"><span class="rtitel">${a.titel}</span><span class="rsub">${a.sub}</span></div>
        <div class="raktion">
          ${a.e.telefon ? `<a class="mini" href="${telLink(a.e.telefon)}">Anrufen</a>` : ""}
          <button class="mini" data-rufauf="${a.tag}|${a.h}">Öffnen</button>
          <button class="mini" data-rufweg="${a.art}|${a.tag}|${a.h}">Erledigt</button>
        </div></div>`,
        )
        .join("")}
      ${
        bald.length
          ? `<p class="rufbald">Vorgemerkt: ${bald[0].sub}${
              bald.length > 1 ? ` · und ${bald.length - 1} weitere` : ""
            }</p>`
          : ""
      }
    </div>`
        : bald.length
          ? `<div class="rufbox stumm">
      <b>Kein Anruf offen</b>
      <p class="rufbald">Vorgemerkt: ${bald[0].sub}${bald.length > 1 ? ` · und ${bald.length - 1} weitere` : ""}</p>
    </div>`
          : ""
    }
    ${
      offen.length
        ? `<div class="warnbox">
      <b>${offen.length} ${offen.length === 1 ? "Termin wartet" : "Termine warten"} auf Nachbereitung</b>
      <div class="woffen">${offen
        .slice(0, 6)
        .map(
          (o) =>
            `<button class="mini" data-oeffne="${o.tag}|${o.h}">${fmtShort(fromDk(o.tag))} · ${pad(o.h)} Uhr · ${
              o.e.nachname || label(o.e).t1 || "Termin"
            }</button>`,
        )
        .join("")}
        ${offen.length > 6 ? `<span class="mehr">und ${offen.length - 6} weitere</span>` : ""}</div>
    </div>`
        : ""
    }
    <div class="asec">
      <h3>${DAYS_L[(d.getDay() + 6) % 7]}, ${fmt(d)}</h3>
      <p class="sub">${liste.length ? `${liste.length} ${liste.length === 1 ? "Eintrag" : "Einträge"}` : "Heute ist nichts eingetragen."}</p>
      ${liste.map(karte).join("")}
    </div>`;

  vorbZahlen(box);
  box.querySelectorAll("[data-rufauf]").forEach(
    (b) =>
      (b.onclick = () => {
        const [tag, h] = b.dataset.rufauf.split("|");
        monday = mondayOf(fromDk(tag));
        render();
        openSlot(tag, +h);
      }),
  );
  box.querySelectorAll("[data-rufweg]").forEach(
    (b) =>
      (b.onclick = () => {
        const [art, tag, h] = b.dataset.rufweg.split("|");
        const e = entries[key(tag, +h)];
        if (!e) return;
        if (art === "happy") e.happyErledigt = dk(new Date());
        else e.bestaetigt = dk(new Date());
        renderAll();
      }),
  );
  box.querySelectorAll("[data-oeffne]").forEach(
    (b) =>
      (b.onclick = () => {
        const [tag, h] = b.dataset.oeffne.split("|");
        monday = mondayOf(fromDk(tag));
        render();
        openSlot(tag, +h);
      }),
  );
}

/* Offlinebetrieb – die App bleibt ohne Netz bedienbar */
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

/*
 * "system" folgt der Einstellung des Telefons, "an" überstimmt sie,
 * "aus" schaltet die Bewegung unabhängig davon ab.
 */
function bewegungJetzt() {
  return settings.bewegung || "an";
}
function bewegungSetzen() {
  document.body.dataset.bewegung = bewegungJetzt();
}
function themaJetzt() {
  return (me && me.thema) || store.get("bw-thema") || "Dunkel";
}
function themaSetzen(t, sichern) {
  bewegungSetzen();
  store.set("bw-thema", t);
  if (sichern && me) {
    me.thema = t;
    userSet(me).catch(() => {});
  }
  document.body.classList.toggle("hell", t === "Hell");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "Hell" ? "#EDF0EB" : "#15191A");
}
themaSetzen(store.get("bw-thema") || "Dunkel");
