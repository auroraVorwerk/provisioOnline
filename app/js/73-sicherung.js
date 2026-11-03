/**
 * Sicherungen (Beta 1.6)
 *
 * 1 · Tageskopie: Einmal am Tag – beim ersten Öffnen und um 23:59, falls die
 *     App offen ist – legt Provisio still eine verschlüsselte Kopie aller
 *     Daten an. Sieben Plätze (Mo–So) ersetzen sich wöchentlich selbst.
 *     Sie liegen in der App (IndexedDB) und lassen sich in den Einstellungen
 *     zurückholen. Wird die App gelöscht, sind sie mit weg.
 * 2 · Sicherungsdatei: „Daten sichern“ und der tägliche Hinweis auf „Heute“
 *     erzeugen „Provisio-Sicherung.json“ – immer derselbe Name, damit die
 *     Datei in „Dateien“ die vorige ersetzt.
 * 3 · Die Datei ist verschlüsselt (AES-256 mit dem Schlüssel des Kontos);
 *     beim Einspielen öffnet sie dein Passwort oder dein Wiederherstellungs-Code.
 */
(function () {
  "use strict";
  const DATEINAME = "Provisio-Sicherung.json";
  const demo = () => !!window.DEMO_AKTIV;
  const inEinfuehrung = () => !!(window.einfuehrungZustand && einfuehrungZustand.aktiv);
  const heute = () => dk(new Date());

  /* ---------- kleine IndexedDB-Ablage ---------- */
  function db() {
    return new Promise((ok, fehl) => {
      const r = indexedDB.open("provisio-online-sicherungen", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kopien");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fehl(r.error);
    });
  }
  async function ablegen(k, wert) {
    const d = await db();
    return new Promise((ok, fehl) => {
      const t = d.transaction("kopien", "readwrite");
      t.objectStore("kopien").put(wert, k);
      t.oncomplete = () => ok();
      t.onerror = () => fehl(t.error);
    });
  }
  async function alleKopien(dkNr) {
    const d = await db();
    return new Promise((ok, fehl) => {
      const t = d.transaction("kopien", "readonly");
      const st = t.objectStore("kopien");
      const r = st.getAll();
      const rk = st.getAllKeys();
      t.oncomplete = () =>
        ok(
          rk.result
            .map((k, i) => ({ k, v: r.result[i] }))
            .filter((x) => String(x.k).startsWith(dkNr + "|"))
            .map((x) => x.v)
            .sort((a, b) => b.stand.localeCompare(a.stand)),
        );
      t.onerror = () => fehl(t.error);
    });
  }

  /* ---------- 1 · Tageskopie ---------- */
  async function tageskopie(erzwingen) {
    if (!me || !dataReady || demo() || inEinfuehrung() || !masterKey || !CRYPTO_OK || !window.indexedDB) return;
    const merker = "pv-tageskopie-" + me.dk;
    if (!erzwingen && store.get(merker) === heute()) return;
    const blob = clean(dataBlob());
    if (!Object.keys(blob.entries || {}).length && !(blob.potenzial || []).length) return;
    try {
      const env = await _aesEnc(masterKey, JSON.stringify(blob));
      const tag = new Date();
      const platz = (tag.getDay() + 6) % 7; // Mo = 0
      await ablegen(`${me.dk}|${platz}`, { stand: tag.toISOString(), tag: heute(), anzahl: Object.keys(blob.entries).length, env });
      store.set(merker, heute());
    } catch (e) {
      console.warn("Tageskopie:", e);
    }
  }
  window.tageskopie = tageskopie;

  /* um 23:59 – solange die App offen ist */
  let uhr = 0;
  function bis2359() {
    clearTimeout(uhr);
    const jetzt = new Date();
    const ziel = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate(), 23, 59, 0);
    if (ziel <= jetzt) ziel.setDate(ziel.getDate() + 1);
    uhr = setTimeout(async () => {
      await tageskopie(true);
      bis2359();
    }, ziel - jetzt);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      tageskopie(false);
      bis2359();
    }
  });
  if (typeof window.starteSitzung === "function") {
    const sitzungOhne = window.starteSitzung;
    window.starteSitzung = async function () {
      const r = await sitzungOhne.apply(this, arguments);
      setTimeout(() => {
        tageskopie(false);
        bis2359();
      }, 2500);
      return r;
    };
  }

  /* ---------- 3 · verschlüsselte Sicherungsdatei ---------- */
  async function paketBauen() {
    const blob = clean(dataBlob());
    const kopf = { provisio: "sicherung", v: 2, dk: me.dk, stand: new Date().toISOString(), termine: Object.keys(blob.entries || {}).length };
    if (masterKey && CRYPTO_OK && me.mkByPw) {
      return { ...kopf, enc: 1, mkByPw: me.mkByPw, mkByCode: me.mkByCode || null, daten: await _aesEnc(masterKey, JSON.stringify(blob)) };
    }
    return { ...kopf, daten: blob }; // nur ohne Verschlüsselung (Demo, sehr alte Geräte)
  }

  /* ---------- 2 · Datei mit festem Namen speichern ---------- */
  datenSichern = async function () {
    if (!me) return false;
    const paket = await paketBauen();
    const datei = new File([JSON.stringify(paket)], DATEINAME, { type: "application/json" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [datei] })) {
        await navigator.share({ files: [datei], title: "Provisio-Sicherung" });
        store.set("bw-last-backup", Date.now());
        return true;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return false; // im Teilen-Menü abgebrochen
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(datei);
    a.download = DATEINAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    store.set("bw-last-backup", Date.now());
    return true;
  };

  /* ---------- Einspielen: alte und neue Dateien ---------- */
  function uebernehmen(blob, wann) {
    if (!blob || typeof blob !== "object" || !("entries" in blob)) {
      alert("Das sieht nicht nach einer Sicherung aus.");
      return;
    }
    const anzahl = Object.keys(blob.entries || {}).length;
    if (!confirm(`Sicherung vom ${wann} mit ${anzahl} Terminen einspielen?\n\nAlle jetzigen Einträge werden ersetzt.`)) return;
    const vorher = clean(dataBlob());
    applyData(blob);
    shadow = JSON.parse(JSON.stringify(vorher));
    dataReady = true;
    clearTimeout(saveTimer);
    flushSave();
    renderAll();
    alert("Sicherung eingespielt.");
  }
  function entsperren(paket) {
    simpleDialog(
      "Sicherung öffnen",
      "Die Datei ist verschlüsselt",
      `<div class="grp">${fld("sgPw", "Passwort oder Wiederherstellungs-Code", "", "password", 'autocomplete="current-password"')}</div>
       <p class="err" id="sgErr" hidden></p>`,
      async () => {
        const geheim = document.getElementById("sgPw").value;
        const err = document.getElementById("sgErr");
        let mk = await mkOeffnen(paket.mkByPw, geheim);
        if (!mk && paket.mkByCode && typeof codeNorm === "function") mk = await mkOeffnen(paket.mkByCode, codeNorm(geheim));
        if (!mk) {
          err.textContent = "Passwort oder Code passt nicht zu dieser Sicherung.";
          err.hidden = false;
          return;
        }
        try {
          const blob = JSON.parse(await _aesDec(mk, paket.daten));
          closeModal();
          setTimeout(() => uebernehmen(blob, new Date(paket.stand).toLocaleString("de-DE")), 300);
        } catch (e) {
          err.textContent = "Die Datei ist beschädigt.";
          err.hidden = false;
        }
      },
      "Öffnen",
    );
  }
  sicherungEinspielen = function (datei) {
    const f = datei.files && datei.files[0];
    if (!f) return;
    const leser = new FileReader();
    leser.onload = () => {
      let paket;
      try {
        paket = JSON.parse(leser.result);
      } catch (e) {
        alert("Diese Datei lässt sich nicht lesen.");
        return;
      }
      datei.value = "";
      if (paket && paket.enc === 1) return entsperren(paket);
      const blob = paket && paket.daten ? paket.daten : paket;
      uebernehmen(blob, paket && paket.stand ? new Date(paket.stand).toLocaleString("de-DE") : "unbekannt");
    };
    leser.readAsText(f);
  };

  /* Die alte 14-Tage-Erinnerung entfällt – es gibt den täglichen Hinweis */
  sicherungErinnerung = function () {};

  /* ---------- täglicher Hinweis auf „Heute“ ---------- */
  function hinweisNoetig() {
    if (!me || demo() || inEinfuehrung()) return false;
    const hatDaten = Object.keys(entries).length || potenzial.length;
    if (!hatDaten) return false;
    const letzte = store.get("bw-last-backup") || 0;
    if (letzte && dk(new Date(letzte)) === heute()) return false;
    return store.get("pv-sicherung-spaeter") !== heute();
  }
  function hinweisZeigen() {
    const box = document.getElementById("heute");
    if (!box) return;
    let h = document.getElementById("sgHinweis");
    if (!hinweisNoetig()) {
      if (h) h.remove();
      return;
    }
    if (!h) {
      h = document.createElement("div");
      h.id = "sgHinweis";
      h.className = "sghinweis";
      h.innerHTML = `<div class="sgtext"><b>Heutige Sicherung</b><span>In „Dateien“ speichern – ersetzt die von gestern</span></div>
        <button type="button" class="sgjetzt">Sichern</button><button type="button" class="sgspaeter" aria-label="Heute nicht mehr">✕</button>`;
      h.querySelector(".sgjetzt").onclick = async () => {
        if (await datenSichern()) h.remove();
      };
      h.querySelector(".sgspaeter").onclick = () => {
        store.set("pv-sicherung-spaeter", heute());
        h.remove();
      };
    }
    if (box.firstChild !== h) box.prepend(h);
  }
  if (typeof renderHeute === "function") {
    const heuteOhne = renderHeute;
    renderHeute = function () {
      const r = heuteOhne.apply(this, arguments);
      try {
        hinweisZeigen();
      } catch (e) {}
      return r;
    };
  }

  /* ---------- Einstellungen: Tageskopien zurückholen ---------- */
  function wannText(k) {
    const d = new Date(k.stand);
    return `${DAYS_L[(d.getDay() + 6) % 7]}, ${fmt(d)} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} Uhr`;
  }
  async function kopienUnterseite() {
    let liste = [];
    try {
      liste = await alleKopien(me.dk);
    } catch (e) {}
    unterseiteOeffnen(
      "Tageskopien",
      "Einstellungen",
      liste.length
        ? `<div class="esgrp">${liste
            .map(
              (k, i) => `<button type="button" class="esz eszhoch" data-kopie="${i}">
            <span class="eszt">${wannText(k)}<small>${k.anzahl} Termine</small></span><em>Einspielen</em>${CHEV}</button>`,
            )
            .join("")}</div>`
        : `<div class="esgrp"><div class="esz"><span class="eszt">Noch keine Tageskopie</span></div></div>`,
      (ebene) =>
        ebene.querySelectorAll("[data-kopie]").forEach(
          (b) =>
            (b.onclick = async () => {
              const k = liste[+b.dataset.kopie];
              try {
                const blob = JSON.parse(await _aesDec(masterKey, k.env));
                uebernehmen(blob, wannText(k));
              } catch (e) {
                alert("Diese Kopie lässt sich mit dem aktuellen Schlüssel nicht öffnen.");
              }
            }),
        ),
    );
  }
  if (typeof renderProfil === "function") {
    const profilOhne = renderProfil;
    renderProfil = async function () {
      const r = await profilOhne.apply(this, arguments);
      const ein = document.getElementById("esEinspielen");
      if (ein && !document.getElementById("esKopien")) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = ein.className;
        b.id = "esKopien";
        const zuletzt = me && store.get("pv-tageskopie-" + me.dk);
        b.innerHTML = `<span class="eszt">Tageskopien</span><em>${zuletzt ? (zuletzt === heute() ? "heute" : fmt(fromDk(zuletzt))) : "noch keine"}</em>${CHEV}`;
        b.onclick = kopienUnterseite;
        ein.after(b);
      }
      return r;
    };
  }
})();
