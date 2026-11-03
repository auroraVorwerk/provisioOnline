/**
 * Heute, Provision, Planer
 *
 * Heute: Tagesbogen, "Als Nächstes", Tagesabschluss.
 * Provision: Münzturm, Was-wäre-wenn-Rechnung (Schnitt der letzten 26 Wochen),
 * Kennzahl im Kopf aufklappbarer Bereiche.
 * Planer: Zielmarkierung beim Verschieben, Hinweis "Ortswechsel".
 */
(function () {
  "use strict";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      console.warn("Umbau:", e);
    }
  };
  const voll = () => (document.documentElement.dataset.anim || "voll") === "voll";
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[<>&"']/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const ganz = (v) => Math.round(v || 0).toLocaleString("de-DE");
  const KUNDE = ["kunde", "premium", "abholen"];

  /* ---------- Heute ---------- */
  const BOGEN_VON = 7,
    BOGEN_BIS = 21;
  function startDez(e, h) {
    if (e.start && /^\d{1,2}:\d{2}$/.test(e.start)) return toDec(e.start);
    if (["meeting", "privat", "individuell"].includes(e.kind) && e.von) return toDec(e.von);
    return h;
  }
  function endeDez(e, h) {
    if (e.bis && /^\d{1,2}:\d{2}$/.test(e.bis)) return toDec(e.bis) || 24;
    return h + 2;
  }
  function bogenPunkt(t) {
    const q = Math.max(0, Math.min(1, (t - BOGEN_VON) / (BOGEN_BIS - BOGEN_VON)));
    const w = Math.PI * (1 - q);
    return { x: 195 + 160 * Math.cos(w), y: 176 - 136 * Math.sin(w), q };
  }
  function zeitText(t) {
    const h = Math.floor(t),
      m = Math.round((t - h) * 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  function tagesEintraege(tag) {
    return HOURS_ASC.map((h) => ({ h, e: entries[key(tag, h)] }))
      .filter((x) => x.e)
      .map((x) => Object.assign(x, { von: startDez(x.e, x.h), bis: endeDez(x.e, x.h) }));
  }
  function erledigt(x, jetzt) {
    if (x.e.status) return true;
    if (["kunde", "premium", "terminieren", "abholen"].includes(x.e.kind)) return false;
    return x.bis <= jetzt;
  }

  /* Serie: Wochen in Folge, in denen das Wochenziel an Kundenterminen gehalten wurde */
  function serie(ziel) {
    if (!ziel) return 0;
    let n = 0;
    const m = mondayOf(new Date());
    for (let w = 0; w < 30; w++) {
      const von = new Date(m);
      von.setDate(von.getDate() - 7 * w);
      const bis = new Date(von);
      bis.setDate(bis.getDate() + 6);
      const a = dk(von),
        b = dk(bis);
      let gehalten = 0;
      Object.keys(entries).forEach((k) => {
        const t = k.split("|")[0];
        if (t < a || t > b) return;
        const e = entries[k];
        if (e.kind === "kunde" && e.status === "stattgefunden") gehalten++;
      });
      if (gehalten >= ziel) n++;
      else if (w > 0) break; // laufende Woche darf noch offen sein
    }
    return n;
  }

  function heldHTML(heute, liste, jetzt, urlaub) {
    const fertig = liste.filter((x) => erledigt(x, jetzt)).length;
    const sonne = bogenPunkt(jetzt);
    const zuSehen = jetzt >= BOGEN_VON - 1 && jetzt <= BOGEN_BIS + 1;
    const punkte = liste
      .map((x) => {
        const p = bogenPunkt(x.von);
        const c = quelleFarbe(x.e, true) || colorOf(x.e) || "#3b9bf0";
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6.5" fill="${c}" stroke="var(--bg)" stroke-width="2.5"${erledigt(x, jetzt) ? "" : ' class="ubpunkt"'}></circle>`;
      })
      .join("");
    const laenge = 470; // ungefähre Bogenlänge für die Strichanimation
    const rest = (laenge * (1 - sonne.q)).toFixed(0);
    const gross = urlaub ? "Urlaub" : liste.length ? `${fertig} von ${liste.length}` : "Frei";
    const klein = urlaub
      ? urlaub.grund || "Genieß den Tag"
      : liste.length
        ? liste.length === 1
          ? "Eintrag erledigt"
          : "Einträgen erledigt"
        : "nichts eingetragen";
    return `<div class="ubogen" role="img" aria-label="Tagesbogen: ${gross} ${klein}">
      <svg viewBox="0 0 390 206" aria-hidden="true">
        <defs><radialGradient id="ubGlut"><stop offset="0" stop-color="#FFC24A" stop-opacity=".55"></stop><stop offset="1" stop-color="#FFC24A" stop-opacity="0"></stop></radialGradient></defs>
        <path d="M 35 176 A 160 136 0 0 1 355 176" fill="none" stroke="var(--line)" stroke-width="3" stroke-linecap="round"></path>
        <path class="ubspur" d="M 35 176 A 160 136 0 0 1 355 176" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"
          style="stroke-dasharray:${laenge};stroke-dashoffset:${rest};--rest:${rest}"></path>
        <line x1="18" y1="176" x2="372" y2="176" stroke="var(--line)" stroke-width="1"></line>
        <text x="35" y="198" class="ubachse" text-anchor="middle">7</text>
        <text x="195" y="198" class="ubachse" text-anchor="middle">14</text>
        <text x="355" y="198" class="ubachse" text-anchor="middle">21 Uhr</text>
        ${punkte}
        ${
          zuSehen
            ? `<circle class="ubglut" cx="${sonne.x.toFixed(1)}" cy="${sonne.y.toFixed(1)}" r="30" fill="url(#ubGlut)"></circle>
        <circle class="ubsonne" cx="${sonne.x.toFixed(1)}" cy="${sonne.y.toFixed(1)}" r="11"></circle>`
            : ""
        }
        <text x="195" y="128" class="ubgross" text-anchor="middle" data-keinzaehlen>${gross}</text>
        <text x="195" y="152" class="ubklein" text-anchor="middle">${klein}</text>
      </svg>
    </div>`;
  }

  function naechsterHTML(heute, liste, jetzt) {
    const laeuft = liste.find((x) => x.von <= jetzt && x.bis > jetzt);
    const naechst = laeuft || liste.find((x) => x.von > jetzt);
    if (!naechst) return "";
    const e = naechst.e,
      l = label(e);
    const name = e.nachname ? `${e.vorname ? e.vorname.charAt(0) + ". " : ""}${e.nachname}` : l.t1;
    const c = quelleFarbe(e, true) || colorOf(e) || "var(--accent)";
    const adr = adresseVon(e);
    const bisDa = naechst.von - jetzt;
    const wann = laeuft
      ? "läuft"
      : bisDa < 1
        ? `in ${Math.max(1, Math.round(bisDa * 60))} Min.`
        : `um ${zeitText(naechst.von)}`;
    const modus = laeuft && KUNDE.includes(e.kind) && typeof window.terminModus === "function";
    return `<div class="usek unaechst">
      <div class="uue">${laeuft ? "Gerade" : "Als Nächstes"}</div>
      <button type="button" class="uzeile" data-oeffne="${heute}|${naechst.h}">
        <i class="ustrich" style="background:${c}"></i>
        <span class="utext"><b>${esc(name)}</b><span>${zeitText(naechst.von)}–${zeitText(naechst.bis)}${l.t2 && l.t2 !== name ? " · " + esc(l.t2) : ""}${adr ? " · " + esc(adr) : ""}</span></span>
        <span class="uwann${laeuft ? " jetzt" : ""}">${wann}</span>
      </button>

    </div>`;
  }

  function abschlussHTML(heute, liste, jetzt) {
    if (!liste.length) return "";
    const letzte = Math.max(...liste.map((x) => x.bis));
    if (jetzt < 18 && jetzt < letzte) return "";
    const kt = liste.filter((x) => x.e.kind === "kunde");
    const gehalten = kt.filter((x) => x.e.status === "stattgefunden").length;
    let verk = 0,
      um = 0;
    liste.forEach((x) => {
      const n = x.e.nb || {};
      if (n.verkauft === "Ja" && n.fremd !== "Ja") {
        verk++;
        um += num(n.umsatz) + num(n.umsatzFG) + num(n.umsatzWG);
      }
    });
    const offen = offeneNachbereitung().filter((o) => o.tag === heute);
    const alleOffen = offeneNachbereitung();
    const v = vorbereitung();
    const s = serie(v.zielTermine);
    const zu = settings.abschluss && settings.abschluss[heute];
    return `<section class="usek uabschluss${zu ? " zu" : ""}">
      <div class="uue warm">Feierabend</div>
      <h3 class="uh">${zu ? "Tag abgeschlossen" : "Dein Tagesabschluss"}</h3>
      <div class="uliste">
        ${kt.length ? `<div class="ureihe"><span>Kundentermine gehalten</span><b>${gehalten} von ${kt.length}</b></div>` : ""}
        <div class="ureihe"><span>Verkauft</span><b class="${verk ? "gruen" : ""}">${verk ? `${verk} · ${ganz(um)} €` : "–"}</b></div>
        <div class="ureihe"><span>Nachbereitung offen</span><b class="${alleOffen.length ? "warm" : "gruen"}">${alleOffen.length || "keine"}</b></div>
        ${s ? `<div class="ureihe"><span>Serie</span><b>${s} ${s === 1 ? "Woche" : "Wochen"} Wochenziel in Folge</b></div>` : ""}
      </div>
      ${
        zu
          ? `<p class="ufertig">Gut gemacht. Bis morgen.</p>`
          : alleOffen.length
            ? `<button type="button" class="ubtn primaer" data-nbstart="${alleOffen[0].tag}|${alleOffen[0].h}">Nachbereiten${alleOffen.length > 1 ? ` · ${alleOffen.length} offen` : ""}</button>`
            : `<button type="button" class="ubtn primaer" data-abschluss="${heute}">Tag abschließen</button>`
      }
    </section>`;
  }

  function uHeute() {
    const box = document.getElementById("heute");
    if (!box || !me || box.querySelector(".ubogen")) return;
    const d = new Date(),
      heute = dk(d),
      jetzt = d.getHours() + d.getMinutes() / 60;
    const liste = tagesEintraege(heute);
    const urlaub = typeof window.urlaubAm === "function" ? window.urlaubAm(heute) : null;

    const oben = document.createElement("div");
    oben.className = "uoben";
    oben.innerHTML =
      abschlussHTML(heute, liste, jetzt) +
      heldHTML(heute, liste, jetzt, urlaub) +
      naechsterHTML(heute, liste, jetzt);
    box.prepend(oben);

    /* „Nächste Woche vorbereiten“ nach unten */
    const vorb =
      box.querySelector(".mheute") || box.querySelector(".hkompass") || box.querySelector(".hleer");
    if (vorb) {
      const sek = document.createElement("section");
      sek.className = "usek uvorb";
      sek.innerHTML = `<h3 class="uh">Nächste Woche vorbereiten</h3>`;
      sek.appendChild(vorb);
      const hinweis = box.querySelector(".hkhinweis");
      if (hinweis) sek.appendChild(hinweis);
      vorb.classList.add("uklein");
      box.appendChild(sek);
    }
    const lz = box.querySelector(".mlz-heutekarte");
    if (lz) oben.after(lz);

    /* Zwei Spalten für das iPad: links der Tag im Überblick, rechts Ablauf und Vorbereitung */
    const links = document.createElement("div"),
      rechts = document.createElement("div");
    links.className = "uspalte ul";
    rechts.className = "uspalte ur";
    [...box.children].forEach((el) => {
      if (el.matches(".htl, .htag, .uvorb")) rechts.appendChild(el);
      else links.appendChild(el);
    });
    box.append(links, rechts);

    oben.querySelectorAll("[data-oeffne]").forEach(
      (b) =>
        (b.onclick = () => {
          const [t, h] = b.dataset.oeffne.split("|");
          hOeffne(t, h);
        }),
    );
    oben.querySelectorAll("[data-nbstart]").forEach(
      (b) =>
        (b.onclick = () => {
          const [t, h] = b.dataset.nbstart.split("|");
          hOeffne(t, h);
        }),
    );
    oben.querySelectorAll("[data-tmodus]").forEach(
      (b) =>
        (b.onclick = () => {
          const [t, h] = b.dataset.tmodus.split("|");
          window.terminModus(t, +h);
        }),
    );
    oben.querySelectorAll("[data-abschluss]").forEach(
      (b) =>
        (b.onclick = () => {
          settings.abschluss = settings.abschluss || {};
          settings.abschluss[b.dataset.abschluss] = 1;
          /* nur die letzten 60 Tage aufheben */
          const grenze = dk(new Date(Date.now() - 60 * 864e5));
          Object.keys(settings.abschluss).forEach((t) => {
            if (t < grenze) delete settings.abschluss[t];
          });
          saveData();
          renderHeute();
        }),
    );
  }

  /* ---------- Provision ---------- */
  const WENN = { extra: 0 };
  function eigenerSchnitt() {
    const grenze = dk(new Date(Date.now() - 182 * 864e5));
    let n = 0,
      summe = 0,
      fg = 0;
    Object.keys(entries).forEach((k) => {
      const t = k.split("|")[0];
      if (t < grenze) return;
      const e = entries[k],
        nb = e.nb;
      if (
        !nb ||
        nb.verkauft !== "Ja" ||
        nb.fremd === "Ja" ||
        !["kunde", "premium", "abholen"].includes(e.kind)
      )
        return;
      const u = num(nb.umsatz);
      if (u <= 0) return;
      n++;
      summe += u;
      if (nb.gebiet !== "Weißgebiet") fg++;
    });
    return n >= 2 ? { brutto: summe / n, fgAnteil: fg / n, n } : { brutto: 1400, fgAnteil: 0.75, n };
  }
  function muenzenHTML(anzahl, neuAb) {
    return Array.from(
      { length: anzahl },
      (_, i) =>
        `<i class="umuenze" style="bottom:${i * 12}px;animation-delay:${i < neuAb ? i * 45 : (i - neuAb) * 90}ms"></i>`,
    ).join("");
  }
  const muenzZahl = (betrag) => Math.max(2, Math.min(15, Math.round(betrag / 320)));

  function uProv() {
    const box = document.getElementById("prov");
    if (!box) return;
    const held = box.querySelector(".mprov");
    if (!held || held.querySelector(".umuenzen")) return;
    const vm = vertriebsmonat(new Date());
    const u = umsatz(vm.fromK, vm.toK);
    const p0 = provision(u, vm.weeks);
    const schnitt = eigenerSchnitt();

    const turm = document.createElement("div");
    turm.className = "umuenzen";
    turm.setAttribute("aria-hidden", "true");
    const n0 = muenzZahl(p0.gesamt);
    turm.innerHTML = `<div class="umboden"></div><div class="umstapel">${muenzenHTML(n0, n0)}</div>`;
    const ml = held.querySelector(".ml");
    held.insertBefore(turm, ml || held.firstChild);

    const wenn = document.createElement("div");
    wenn.className = "uwenn";
    wenn.innerHTML = `<button type="button" class="urund" data-wenn="-1" aria-label="Ein Verkauf weniger">−</button>
      <div class="uwmitte"><span>Was wäre, wenn …</span><b data-keinzaehlen>so wie jetzt</b></div>
      <button type="button" class="urund" data-wenn="1" aria-label="Ein Verkauf mehr">+</button>`;
    const tipp = document.createElement("p");
    tipp.className = "uwtipp";
    const formel = held.querySelector(".mformel");
    (formel || held).after(wenn);
    wenn.after(tipp);

    const nettoFG = netto(schnitt.brutto) * schnitt.fgAnteil;
    function setzen() {
      const e = WENN.extra;
      const u2 = Object.assign({}, u, {
        fg: u.fg + e * schnitt.brutto * schnitt.fgAnteil,
        wg: u.wg + e * schnitt.brutto * (1 - schnitt.fgAnteil),
      });
      const p = provision(u2, vm.weeks);
      const gross = held.querySelector(".mgross");
      if (gross) gross.textContent = euroText(p.gesamt);
      const l = held.querySelector(".mvonL b"),
        b = held.querySelector(".mvonU b");
      if (l) l.textContent = euroText(p.prov);
      if (b) b.textContent = "+ " + euroText(p.vers);
      const kopf = held.querySelector(".mlkopf");
      if (kopf)
        kopf.innerHTML = `<b>${euroText(p.basis)} netto im Festgebiet</b><span>${p.next ? "noch " + euroText(p.next.fehlt) + " bis " + p.next.pct + " %" : "höchste Stufe"}</span>`;
      const f = vm.weeks / 4,
        max = TIERS[TIERS.length - 1].u * f;
      const fuell = held.querySelector(".mfuell2");
      if (fuell) fuell.style.width = Math.min(100, (p.basis / max) * 100).toFixed(1) + "%";
      held.querySelectorAll(".mstufe").forEach((s, i) => s.classList.toggle("an", p.basis >= TIERS[i].u * f));
      held
        .querySelectorAll(".mmarken span")
        .forEach((s, i) => s.classList.toggle("an", p.basis >= TIERS[i].u * f));
      wenn.querySelector("b").textContent = e
        ? `+${e} ${e === 1 ? "Verkauf" : "Verkäufe"} · +${euroText(p.gesamt - p0.gesamt)}`
        : "so wie jetzt";
      const stapel = turm.querySelector(".umstapel");
      const alt = stapel.children.length,
        neu = muenzZahl(p.gesamt);
      if (neu !== alt) stapel.innerHTML = muenzenHTML(neu, Math.min(alt, neu));
      if (p.next && nettoFG > 0) {
        const noch = Math.ceil(p.next.fehlt / nettoFG);
        tipp.innerHTML = `${noch} ${noch === 1 ? "Verkauf" : "Verkäufe"} mehr im Festgebiet und du springst auf <b>${p.next.pct} % Bonus</b>.`;
        tipp.classList.toggle("nah", noch <= 1);
      } else tipp.textContent = "Höchste Bonusstufe – jeder weitere Verkauf zählt voll.";
      tipp.title = `Gerechnet mit ${euroText(schnitt.brutto)} brutto je Verkauf${schnitt.n >= 2 ? " (dein Schnitt der letzten 26 Wochen)" : ""}.`;
    }
    wenn.querySelectorAll("[data-wenn]").forEach(
      (btn) =>
        (btn.onclick = () => {
          WENN.extra = Math.max(0, Math.min(10, WENN.extra + +btn.dataset.wenn));
          setzen();
        }),
    );
    setzen();

    /* Kennzahl im Kopf jedes Bereichs */
    const std = arbeitsStunden(vm.fromK, vm.toK);
    const kurz = {
      rechnung: euroText(p0.prov),
      stufen: p0.stufe === "keine" ? "noch keine" : p0.stufe + " erreicht",
      zeit: std ? euroText((p0.prov + p0.vers) / std) + " / h" : "–",
      k70: typeof bestandWert === "function" ? euroText(bestandWert()) : "",
      ausgleich: "",
    };
    box.querySelectorAll(".klappkopf[data-klapp]").forEach((k) => {
      if (k.querySelector(".ksum")) return;
      const t = kurz[k.dataset.klapp];
      if (!t) return;
      const s = document.createElement("span");
      s.className = "ksum";
      s.textContent = t;
      s.dataset.keinzaehlen = "";
      k.insertBefore(s, k.querySelector(".kp"));
    });
  }
  const euroText = (v) => ganz(v) + " €";

  /* ---------- Planer ---------- */
  function ortVon(e) {
    return ((e.ort || "") + "|" + (e.plz || "")).toLowerCase();
  }
  function uPlaner() {
    const g = document.getElementById("grid");
    if (!g) return;
    g.querySelectorAll(".uwechsel").forEach((x) => x.remove());
    const tage = (typeof weekDays !== "undefined" ? weekDays : []).map(dk);
    tage.forEach((t) => {
      HOURS_ASC.forEach((h) => {
        const a = entries[key(t, h)],
          b = entries[key(t, h + 2)];
        if (!a || !b || !KUNDE.includes(a.kind) || !KUNDE.includes(b.kind)) return;
        if (!(a.ort || a.plz) || !(b.ort || b.plz) || ortVon(a) === ortVon(b)) return;
        if (a.bis && toDec(a.bis) < h + 2) return;
        const slot = g.querySelector(`.slot[data-day="${t}"][data-hour="${h + 2}"]`);
        if (!slot) return;
        const s = document.createElement("span");
        s.className = "uwechsel";
        s.title = `Direkt nach ${a.ort || a.plz} – keine Fahrzeit eingeplant`;
        s.textContent = "Ortswechsel";
        slot.appendChild(s);
      });
    });
  }

  /* Verschieben: Ziele zeigen, belegte Felder nicht still abbrechen */
  function toast(text) {
    let t = document.getElementById("uToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "uToast";
      t.className = "utoast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.remove("da");
    void t.offsetWidth;
    t.classList.add("da");
    clearTimeout(t._z);
    t._z = setTimeout(() => t.classList.remove("da"), 2600);
  }
  window.uToast = toast;
  function schiebeKlassen() {
    const g = document.getElementById("grid");
    if (!g) return;
    const an = document.body.classList.contains("schiebt");
    g.querySelectorAll(".slot").forEach((s) => {
      const belegt =
        s.classList.contains("filled") || (s.classList.contains("blocked") && !s.classList.contains("soft"));
      s.classList.toggle("uzielfrei", an && !belegt && !s.classList.contains("quelle"));
      s.classList.toggle("uzielbelegt", an && belegt && !s.classList.contains("quelle"));
    });
    if (an && typeof schiebe !== "undefined" && schiebe) {
      const e = entries[key(schiebe.day, schiebe.hour)];
      const l = e ? label(e) : null;
      g.dataset.vorschau = l ? e.nachname || l.t1 || "Termin" : "Termin";
    }
  }
  if (typeof window.schiebeAn === "function") {
    const an = window.schiebeAn;
    window.schiebeAn = function () {
      const r = an.apply(this, arguments);
      sicher(schiebeKlassen);
      return r;
    };
    const aus = window.schiebeAus;
    window.schiebeAus = function () {
      const r = aus.apply(this, arguments);
      sicher(schiebeKlassen);
      return r;
    };
  }
  const gridEl = document.getElementById("grid");
  if (gridEl) {
    gridEl.addEventListener(
      "click",
      (ev) => {
        if (typeof schiebe === "undefined" || !schiebe) return;
        const s = ev.target.closest(".slot");
        if (!s) return;
        const gleich = s.dataset.day === schiebe.day && +s.dataset.hour === schiebe.hour;
        const belegt = !!entries[key(s.dataset.day, +s.dataset.hour)];
        const gesperrt = s.classList.contains("blocked") && !s.classList.contains("soft");
        if (!gleich && (belegt || gesperrt)) {
          ev.stopImmediatePropagation();
          ev.preventDefault();
          if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
          toast("Hier ist schon etwas eingetragen – such dir ein freies Feld.");
          s.classList.remove("uwackeln");
          void s.offsetWidth;
          s.classList.add("uwackeln");
        }
      },
      true,
    );
    gridEl.addEventListener(
      "pointerover",
      (ev) => {
        if (typeof schiebe === "undefined" || !schiebe) return;
        gridEl.querySelectorAll(".uhier").forEach((x) => x.classList.remove("uhier"));
        const s = ev.target.closest(".slot.uzielfrei");
        if (s) {
          s.classList.add("uhier");
          s.dataset.vorschau = gridEl.dataset.vorschau || "Termin";
        }
      },
      { passive: true },
    );
  }

  /* ---------- Einhängen ---------- */
  function haken(name, f) {
    if (typeof window[name] !== "function") return;
    const vor = window[name];
    window[name] = function () {
      const r = vor.apply(this, arguments);
      if (r && typeof r.then === "function") r.then(() => sicher(f));
      else sicher(f);
      return r;
    };
  }
  haken("renderHeute", uHeute);
  haken("renderProv", uProv);
  haken("render", () => {
    uPlaner();
    schiebeKlassen();
  });
  window.mUmbau = { uHeute, uProv, uPlaner, serie, tagesEintraege };
})();
