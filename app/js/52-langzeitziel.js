/**
 * Langzeitziel
 *
 * Frei gesetztes Ziel ("X € Provision bis TT.MM.JJJJ"). Fortschritt aus der
 * verdienten Provision ab Startdatum. Gespeichert in settings.langziel.
 */
(function () {
  "use strict";
  const sicher = (f) => {
    try {
      return f();
    } catch (e) {
      console.warn("Langziel:", e);
    }
  };
  const ganz = (v) => Math.round(v).toLocaleString("de-DE");
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[<>&"']/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const TAG = 864e5;

  function ziel() {
    const z = typeof settings !== "undefined" && settings ? settings.langziel : null;
    return z && +z.betrag > 0 && z.bis ? z : null;
  }

  /* Verdiente Provision je Vertriebsmonat ab Start bis heute */
  function stand(z) {
    const heute = dk(new Date());
    const ab = z.ab || heute;
    let vm = vertriebsmonat(fromDk(ab)),
      summe = 0,
      schutz = 0;
    const monate = [];
    while (vm.fromK <= heute && schutz++ < 60) {
      const p = provision(umsatz(vm.fromK, vm.toK), vm.weeks);
      const wert = (p.prov || 0) + (p.vers || 0);
      summe += wert;
      monate.push({ name: `${vm.quartal}Q${vm.idx}`, wert });
      const n = fromDk(vm.toK);
      n.setDate(n.getDate() + 1);
      vm = vertriebsmonat(n);
    }
    const start = fromDk(vertriebsmonat(fromDk(ab)).fromK);
    const ende = fromDk(z.bis);
    const jetzt = new Date();
    jetzt.setHours(0, 0, 0, 0);
    const gesamtTage = Math.max(1, Math.round((ende - start) / TAG) + 1);
    const vorbei = Math.max(1, Math.round((jetzt - start) / TAG) + 1);
    const rest = Math.max(0, Math.round((ende - jetzt) / TAG));
    const betrag = +z.betrag;
    const fehlt = Math.max(0, betrag - summe);
    /* eingetragener Urlaub zählt nicht als Arbeitszeit */
    const frei =
      typeof window.urlaubWerktage === "function" && rest > 0 ? window.urlaubWerktage(dk(jetzt), z.bis) : 0;
    const wochen = Math.max(1, rest / 7 - frei / 5);
    const prognose = (summe / vorbei) * gesamtTage;
    return {
      summe,
      betrag,
      fehlt,
      rest,
      monate,
      pct: Math.min(100, (summe / betrag) * 100),
      zeitPct: Math.min(100, (vorbei / gesamtTage) * 100),
      proWoche: fehlt / wochen,
      prognose,
      imPlan: prognose >= betrag,
      erreicht: summe >= betrag,
      abgelaufen: rest === 0 && summe < betrag,
    };
  }

  function satz(s) {
    if (s.erreicht) return "Geschafft – du hast dein Ziel erreicht.";
    if (s.abgelaufen) return "Der Zeitraum ist vorbei. Setz dir ein neues Ziel.";
    return s.imPlan
      ? `Im aktuellen Tempo landest du bei rund ${ganz(s.prognose)} € – du bist auf Kurs.`
      : `Im aktuellen Tempo landest du bei rund ${ganz(s.prognose)} €. Mit ${ganz(s.proWoche)} € pro Woche schaffst du es.`;
  }

  /* ---------------- Dialog ---------------- */
  function dialog() {
    const z = ziel() || {};
    const vmStart = vertriebsmonat(new Date()).fromK;
    const inJahr = new Date();
    inJahr.setMonth(inJahr.getMonth() + 6);
    simpleDialog(
      z.betrag ? "Langzeitziel ändern" : "Langzeitziel festlegen",
      "Wofür arbeitest du?",
      `<div class="grp">
         ${fld("lzTitel", "Wofür (optional)", z.titel || "", "text", 'placeholder="z. B. Urlaub, neues Auto"')}
         ${fld("lzBetrag", "Provision in €", z.betrag ? String(z.betrag) : "", "text", 'inputmode="decimal" placeholder="10000"')}
         ${fld("lzBis", "Bis wann", z.bis || dk(inJahr), "date")}
         ${fld("lzAb", "Ab wann zählt es", z.ab || vmStart, "date")}
       </div>
       <p class="err" id="lzErr" hidden></p>
       ${z.betrag ? `<div class="actions"><button class="btn danger" id="lzWeg">Ziel löschen</button></div>` : ""}`,
      () => {
        const betrag = num(document.getElementById("lzBetrag").value);
        const bis = document.getElementById("lzBis").value;
        const ab = document.getElementById("lzAb").value || vmStart;
        const err = document.getElementById("lzErr");
        const zeig = (t) => {
          err.textContent = t;
          err.hidden = !t;
        };
        if (!(betrag > 0)) return zeig("Bitte einen Betrag eintragen.");
        if (!bis || bis <= ab) return zeig("Das Enddatum muss nach dem Start liegen.");
        settings.langziel = { titel: document.getElementById("lzTitel").value.trim(), betrag, bis, ab };
        saveData();
        closeModal();
        renderAll();
      },
    );
    const weg = document.getElementById("lzWeg");
    if (weg)
      weg.onclick = () => {
        delete settings.langziel;
        saveData();
        closeModal();
        renderAll();
      };
  }
  window.langzielDialog = dialog;

  /* ---------------- Seite Ziele: groß ---------------- */
  function zieleBlock() {
    const box = document.getElementById("ziele");
    if (!box) return;
    let el = box.querySelector(".mlangziel");
    if (!el) {
      el = document.createElement("div");
      el.className = "mlangziel";
    }
    /* Das eigene Hauptziel steht ganz unten auf der Ziele-Seite */
    if (el !== box.lastElementChild) box.appendChild(el);
    const z = ziel();
    if (!z) {
      el.innerHTML = `<button class="mlz-leer" id="lzNeu">
          <span class="mlz-plus">+</span>
          <span><b>Eigenes Langzeitziel</b><small>z. B. 10.000 € Provision bis zum Sommer</small></span></button>`;
      el.querySelector("#lzNeu").onclick = dialog;
      return;
    }
    const s = stand(z);
    const marken = [25, 50, 75]
      .map((m) => `<i class="mlz-marke${s.pct >= m ? " an" : ""}" style="left:${m}%"></i>`)
      .join("");
    el.innerHTML = `
      <div class="mlz-kopf">
        <div><span class="mlz-ueber">Mein Langzeitziel</span><b class="mlz-titel">${esc(z.titel || "Provision")}</b></div>
        <button class="mlz-edit" id="lzEdit" aria-label="Ziel bearbeiten">Bearbeiten</button>
      </div>
      <div class="mlz-zahl"><b>${ganz(s.summe)} €</b><span>von ${ganz(s.betrag)} €</span></div>
      <div class="mlz-weg${s.erreicht ? " fertig" : ""}" style="--p:${s.pct.toFixed(1)}%;--z:${s.zeitPct.toFixed(1)}%">
        <div class="mlz-fuell"></div>${marken}<div class="mlz-heute" title="Heute im Zeitplan"></div>
      </div>
      <div class="mlz-fakten">
        <div><b data-keinzaehlen>${s.rest}</b><span>Tage übrig</span></div>
        <div><b>${ganz(s.fehlt)} €</b><span>fehlen noch</span></div>
        <div><b>${ganz(s.proWoche)} €</b><span>pro Woche nötig</span></div>
      </div>
      <p class="mlz-satz${s.imPlan || s.erreicht ? " gut" : ""}">${satz(s)}</p>
      <p class="mlz-bis">bis ${fmt(fromDk(z.bis))}</p>`;
    el.querySelector("#lzEdit").onclick = dialog;
  }

  /* ---------------- Heute: kompakt ---------------- */
  function heuteBlock() {
    const box = document.getElementById("heute");
    if (!box) return;
    let el = box.querySelector(".mlz-heutebalken");
    const alt = box.querySelector(".mlz-heutekarte");
    if (alt) alt.remove();
    const z = ziel();
    if (!z) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("button");
      el.type = "button";
      el.className = "mlz-heutebalken";
      el.onclick = () => {
        location.hash = "#ziele";
      };
    }
    /* Ganz unten auf der Heute-Seite */
    if (el !== box.lastElementChild) box.appendChild(el);
    const s = stand(z);
    el.innerHTML = `
      <span class="lzh-kopf"><b>${esc(z.titel || "Mein Langzeitziel")}</b>
        <span>${ganz(s.summe)} € von ${ganz(s.betrag)} €</span></span>
      <span class="lzh-bahn"><i style="--p:${Math.max(2, s.pct).toFixed(1)}%"></i></span>
      <span class="lzh-fuss"><b data-keinzaehlen>${Math.floor(s.pct)} % schon erreicht</b>
        <span>${s.erreicht ? "geschafft" : s.abgelaufen ? "Zeitraum vorbei" : "noch " + s.rest + " Tage"}</span></span>`;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const i = el.querySelector(".lzh-bahn i");
        if (i) i.classList.add("an");
      }),
    );
  }

  /* ---------------- Einhängen ---------------- */
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
  haken("renderZiele", zieleBlock);
  haken("renderHeute", heuteBlock);
  haken("renderAll", () => {
    heuteBlock();
    zieleBlock();
  });
  window.mLangziel = { stand, ziel };
})();
