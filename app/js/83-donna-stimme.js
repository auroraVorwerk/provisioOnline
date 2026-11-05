/**
 * Donna – Sprachmodus (Beta 1.10)
 *
 * Gesprochen wird mit Donna wie mit einem Sprachassistenten:
 *  1. Mikrofon antippen und sprechen – nach einer kurzen Pause hört Donna auf
 *     zuzuhören (oder nochmal tippen).
 *  2. Die Sprache wird AUF DEM GERÄT in Text umgewandelt: Whisper (OpenAI,
 *     MIT-Lizenz), Größe „base“, über transformers.js und ONNX Runtime
 *     (WebAssembly). Nichts wird verschickt – kein Apple, kein Server.
 *  3. Donna antwortet laut und hört danach automatisch wieder zu, bis du
 *     „Danke Donna“ sagst, eine Weile nichts sagst oder das Fenster schließt.
 *
 * Das Sprachmodell (~80 MB) und die Laufzeit (~28 MB) werden beim ersten Mal
 * aus der App selbst geladen (gleiche Adresse, keine fremden Server) und im
 * Speicher „transformers-cache“ abgelegt – danach geht alles offline.
 * Safari erlaubt die eingebaute Spracherkennung in Home-Bildschirm-Apps nicht;
 * deshalb dieser Weg.
 */
(function () {
  "use strict";
  if (!window.fragProvisio) return;

  const MODELL = "whisper-small"; // ~250 MB; große Dateien liegen in Teilen (GitHub erlaubt höchstens 100 MB je Datei)
  const STILLE_MS = 1300; // so lange Pause beendet einen Satz
  const WARTEN_MS = 7000; // so lange wartet Donna im Gespräch auf eine Antwort
  const MAX_MS = 20000; // längste Aufnahme
  const ENDE = /^(danke( dir| schoen)?( donna)?|tschuess|stopp|stop|ende|das wars|das war es|fertig|ciao)\b/;

  let erkenner = null; // Whisper-Pipeline
  let laden = null;
  let strom = null; // Mikrofon
  let aktx = null;
  let zustand = "aus"; // aus | hoert | denkt | spricht
  let gespraech = false;
  let aufnahme = null;

  const normal = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  /* ---------- Modell laden ---------- */
  async function istGeladen() {
    try {
      const c = await caches.open("transformers-cache");
      const k = await c.keys();
      return k.some((r) => r.url.indexOf("/" + MODELL + "/onnx/decoder_model_merged_quantized") > -1);
    } catch (e) {
      return false;
    }
  }
  /*
   * Lädt die geteilten Modelldateien (…onnx.teil0, teil1 …), setzt sie zusammen und legt sie
   * unter ihrer normalen Adresse in „transformers-cache“ ab. transformers.js findet sie dort
   * und lädt nichts mehr nach.
   */
  async function teileHolen(basis, fortschritt) {
    const ordner = new URL("modell/" + MODELL + "/", basis).href;
    const plan = await (await fetch(ordner + "teile.json", { cache: "no-cache" })).json();
    const cache = await caches.open("transformers-cache");
    const dateien = Object.entries(plan.dateien);
    const gesamt = dateien.reduce((s, [, d]) => s + d.groesse, 0);
    let fertig = 0;
    const melden = (zusatz) => fortschritt && fortschritt(Math.min(0.97, ((fertig + zusatz) / gesamt) * 0.97), fertig + zusatz);
    for (const [name, d] of dateien) {
      const url = ordner + name;
      if (await cache.match(url)) {
        fertig += d.groesse;
        melden(0);
        continue;
      }
      const stuecke = [];
      for (let i = 0; i < d.teile; i++) {
        let blob = null;
        for (let versuch = 0; versuch < 3 && !blob; versuch++) {
          try {
            const r = await fetch(url + ".teil" + i, { cache: "no-store" });
            if (!r.ok) throw new Error("HTTP " + r.status);
            const leser = r.body.getReader();
            const teil = [];
            let n = 0;
            for (;;) {
              const { done, value } = await leser.read();
              if (done) break;
              teil.push(value);
              n += value.byteLength;
              melden(stuecke.reduce((s, b) => s + b.size, 0) + n);
            }
            blob = new Blob(teil);
          } catch (e) {
            if (versuch === 2) throw new Error("Das Sprachmodell konnte nicht geladen werden. Bitte im WLAN noch einmal versuchen.");
          }
        }
        stuecke.push(blob);
      }
      const ganz = new Blob(stuecke, { type: "application/octet-stream" });
      if (ganz.size !== d.groesse) throw new Error("Das Sprachmodell kam unvollständig an. Bitte noch einmal versuchen.");
      await cache.put(url, new Response(ganz, { headers: { "Content-Type": "application/octet-stream", "Content-Length": String(ganz.size) } }));
      fertig += d.groesse;
      melden(0);
    }
    return gesamt;
  }
  /* Älteres Modell (whisper-base) aus dem Speicher werfen, sobald das neue läuft */
  async function altesModellLoeschen() {
    try {
      const c = await caches.open("transformers-cache");
      for (const r of await c.keys()) if (r.url.indexOf("/modell/") > -1 && r.url.indexOf("/modell/" + MODELL + "/") < 0) await c.delete(r);
    } catch (e) {}
  }
  function modellLaden(fortschritt) {
    if (erkenner) return Promise.resolve(erkenner);
    if (laden) return laden;
    laden = (async () => {
      const basis = new URL(".", document.baseURI).href;
      const T = await import(new URL("vendor/transformers.min.js", basis).href);
      T.env.allowRemoteModels = false;
      T.env.allowLocalModels = true;
      T.env.localModelPath = new URL("modell/", basis).pathname; // Pfad, keine volle URL (sonst gilt es als „entfernt“)
      T.env.useBrowserCache = true;
      T.env.backends.onnx.wasm.wasmPaths = new URL("vendor/ort/", basis).href;
      /* Mehrere Kerne nur mit Cross-Origin-Isolation (setzt der Service Worker) – sonst einer */
      T.env.backends.onnx.wasm.numThreads = window.crossOriginIsolated ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2)) : 1;
      T.env.backends.onnx.wasm.proxy = false;
      const gesamt = await teileHolen(basis, fortschritt);
      erkenner = await T.pipeline("automatic-speech-recognition", MODELL, {
        dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
        device: "wasm",
      });
      if (fortschritt) fortschritt(1, gesamt);
      altesModellLoeschen();
      return erkenner;
    })().catch((e) => {
      laden = null;
      throw e;
    });
    return laden;
  }

  /* ---------- Aufnahme ---------- */
  async function mikrofon() {
    if (strom && strom.active) return strom;
    strom = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    return strom;
  }
  function mikrofonAus() {
    try {
      if (strom) strom.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    strom = null;
  }
  /* Nimmt auf, bis nach dem Sprechen eine Pause kommt; liefert 16-kHz-Mono-Samples */
  function aufnehmen(wartenMs) {
    return new Promise(async (fertig, fehler) => {
      try {
        const s = await mikrofon();
        aktx = aktx || new (window.AudioContext || window.webkitAudioContext)();
        if (aktx.state === "suspended") await aktx.resume();
        const quelle = aktx.createMediaStreamSource(s);
        const analyse = aktx.createAnalyser();
        analyse.fftSize = 1024;
        quelle.connect(analyse);
        const puffer = new Float32Array(analyse.fftSize);
        const typ = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
        const rec = new MediaRecorder(s, typ ? { mimeType: typ } : undefined);
        const teile = [];
        let gesprochen = false,
          leiseSeit = performance.now();
        const start = performance.now();
        let laut = 0.012; // Schwelle passt sich dem Raum an
        let grund = [];
        rec.ondataavailable = (e) => e.data && e.data.size && teile.push(e.data);
        rec.onstop = async () => {
          quelle.disconnect();
          if (!gesprochen) return fertig(null);
          try {
            const blob = new Blob(teile, { type: rec.mimeType || typ || "audio/mp4" });
            const roh = await blob.arrayBuffer();
            const dec = await new Promise((ok, nein) => aktx.decodeAudioData(roh, ok, nein));
            fertig(await auf16k(dec));
          } catch (e) {
            fehler(e);
          }
        };
        aufnahme = { stopp: () => rec.state !== "inactive" && rec.stop() };
        rec.start(250);
        const pruefen = () => {
          if (rec.state === "inactive") return;
          analyse.getFloatTimeDomainData(puffer);
          let q = 0;
          for (let i = 0; i < puffer.length; i++) q += puffer[i] * puffer[i];
          const rms = Math.sqrt(q / puffer.length);
          const jetzt = performance.now();
          if (!gesprochen && jetzt - start < 600) {
            grund.push(rms);
            laut = Math.max(0.012, (grund.reduce((a, b) => a + b, 0) / grund.length) * 2.5);
          }
          pegel(rms / (laut * 3));
          if (rms > laut) {
            if (!gesprochen && jetzt - start > 150) gesprochen = true;
            leiseSeit = jetzt;
          }
          if (gesprochen && jetzt - leiseSeit > STILLE_MS) return rec.stop();
          if (!gesprochen && jetzt - start > wartenMs) return rec.stop();
          if (jetzt - start > MAX_MS) return rec.stop();
          requestAnimationFrame(pruefen);
        };
        requestAnimationFrame(pruefen);
      } catch (e) {
        fehler(e);
      }
    });
  }
  async function auf16k(buf) {
    const ziel = 16000;
    const len = Math.ceil((buf.duration || buf.length / buf.sampleRate) * ziel);
    const off = new OfflineAudioContext(1, len, ziel);
    const q = off.createBufferSource();
    q.buffer = buf;
    q.connect(off.destination);
    q.start();
    const r = await off.startRendering();
    return r.getChannelData(0);
  }

  /*
   * ---------- Fachbegriffe aus gesprochener Sprache ----------
   * Whisper schreibt Modellnamen oft so, wie sie klingen: „fau kar 140“,
   * „Vau Ka hundertvierzig“, „E B sieben“, „VK 140“. Hier wird daraus wieder
   * VK140, EB7, VR300, K70, VG100+ usw. Auch Zahlwörter werden zu Ziffern.
   */
  const BUCHSTABE = {
    a: "A", ah: "A", be: "B", beh: "B", ce: "C", ze: "C", zeh: "C", de: "D", deh: "D", e: "E", eh: "E", ee: "E",
    ef: "F", eff: "F", ge: "G", geh: "G", ha: "H", hah: "H", i: "I", ih: "I", jot: "J", ka: "K", kah: "K", kar: "K",
    kaa: "K", ca: "K", el: "L", ell: "L", em: "M", emm: "M", en: "N", enn: "N", o: "O", oh: "O", pe: "P", peh: "P",
    ku: "Q", kuh: "Q", er: "R", err: "R", es: "S", ess: "S", te: "T", teh: "T", tee: "T", u: "U", uh: "U",
    vau: "V", fau: "V", vauh: "V", fauh: "V", wau: "V", we: "W", weh: "W", ix: "X", ypsilon: "Y", zett: "Z", zet: "Z",
  };
  const MODELLE = /^(VK|VB|VR|VT|EB|EBB|SP|SPB|PB|PBB|VG|VC|VM|RB|MR|MP|FK|HD|AC|SC|CA|FD|VF|K|PCI)$/;
  const EINER = { null: 0, ein: 1, eins: 1, eine: 1, einen: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fuenf: 5, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
  const ZEHNER = { zwanzig: 20, dreissig: 30, dreißig: 30, vierzig: 40, fuenfzig: 50, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
  const TEEN = { zehn: 10, elf: 11, zwoelf: 12, zwölf: 12, dreizehn: 13, vierzehn: 14, fuenfzehn: 15, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
  /* „hundertvierzig“, „dreihundert“, „einhundertzwanzig“, „siebenundvierzig“ → Zahl (bis 9999) */
  function zahlwort(w) {
    w = w.toLowerCase();
    if (!/^[a-zäöüß]+$/.test(w)) return null;
    let rest = w,
      n = 0;
    const tausend = /^(.*?)tausend(.*)$/.exec(rest);
    if (tausend) {
      const v = tausend[1] ? klein(tausend[1]) : 1;
      if (v === null) return null;
      n += v * 1000;
      rest = tausend[2];
    }
    const hundert = /^(.*?)hundert(.*)$/.exec(rest);
    if (hundert) {
      const v = hundert[1] ? klein(hundert[1]) : 1;
      if (v === null) return null;
      n += v * 100;
      rest = hundert[2];
    }
    if (rest) {
      const v = klein(rest.replace(/^und/, ""));
      if (v === null) return null;
      n += v;
    }
    return tausend || hundert || rest ? n : null;
  }
  function klein(w) {
    if (w in EINER) return EINER[w];
    if (w in TEEN) return TEEN[w];
    if (w in ZEHNER) return ZEHNER[w];
    const m = /^(.+?)und(.+)$/.exec(w);
    if (m && m[1] in EINER && m[2] in ZEHNER) return EINER[m[1]] + ZEHNER[m[2]];
    return null;
  }
  function fachbegriffe(text) {
    let t = " " + String(text || "").replace(/[„“"]/g, " ") + " ";
    /* Zahlwörter → Ziffern (nicht „ein Termin“, „eine Notiz“) */
    t = t.replace(/(?<=[\s,.(])([A-Za-zÄÖÜäöüß]+)(?=[\s,.!?)])/g, (w) => {
      if (/^(ein|eine|einen|einem|einer|eins)$/i.test(w)) return w;
      const n = zahlwort(w);
      return n === null ? w : String(n);
    });
    /* Buchstaben-Folgen („fau kar“, „E B“, „V-K“) vor einer Zahl zu einem Modellnamen */
    const tok = t.split(/(\s+)/);
    const raus = [];
    for (let i = 0; i < tok.length; i++) {
      const roh = tok[i];
      if (/^\s+$/.test(roh) || !roh) {
        raus.push(roh);
        continue;
      }
      /* Folge von Buchstaben-Wörtern einsammeln */
      let j = i,
        buchst = "";
      const teile = [];
      while (j < tok.length) {
        const w = tok[j];
        if (/^\s+$/.test(w)) {
          j++;
          continue;
        }
        const k = w.replace(/[.,-]/g, "").toLowerCase();
        const b = BUCHSTABE[k] || (/^[a-z]$/.test(k) ? k.toUpperCase() : null) || (/^[a-z]{1,3}$/i.test(w.replace(/[.-]/g, "")) && MODELLE.test(w.replace(/[.-]/g, "").toUpperCase()) ? w.replace(/[.-]/g, "").toUpperCase() : null);
        if (!b) break;
        buchst += b;
        teile.push(j);
        j++;
      }
      let k = j;
      while (k < tok.length && /^\s+$/.test(tok[k])) k++;
      const zahl = k < tok.length ? /^(\d{1,4})(\+?)([.,!?]?)$/.exec(tok[k]) : null;
      if (buchst && zahl && MODELLE.test(buchst) && (teile.length > 1 || buchst.length > 1 || buchst === "K")) {
        let plus = zahl[2];
        let ende = k;
        let m = k + 1;
        while (m < tok.length && /^\s+$/.test(tok[m])) m++;
        if (!plus && m < tok.length && /^plus[.,!?]?$/i.test(tok[m])) {
          plus = "+";
          ende = m;
        }
        raus.push(buchst + zahl[1] + plus + zahl[3]);
        i = ende;
        continue;
      }
      raus.push(roh);
    }
    t = raus.join("");
    /* „VK 140“, „Vk140“, „v k 140“ → VK140 */
    t = t.replace(/\b(vk|vb|vr|vt|ebb|eb|spb|sp|pbb|pb|vg|vc|vm|rb|mr|mp|fk|hd|k)[\s-]?(\d{1,3})(\s?plus|\+)?\b/gi, (_, a, b, c) => a.toUpperCase() + b + (c ? "+" : ""));
    /* Fehlercodes: „Error elf“ ist oben schon zur Ziffer geworden; „Fehler Nummer 14“ bleibt verständlich */
    return t.replace(/\s+/g, " ").trim();
  }
  window.donnaFachbegriffe = fachbegriffe;

  /* ---------- Sprechen ---------- */
  let stimme = null;
  function stimmeWaehlen() {
    if (!("speechSynthesis" in window)) return null;
    const v = speechSynthesis.getVoices().filter((x) => /^de/i.test(x.lang));
    stimme =
      v.find((x) => /anna|helena|petra|marlene|vicki|katja|sandy|shelley|flo/i.test(x.name) && !/martin|markus|yannick|hans/i.test(x.name)) ||
      v.find((x) => /premium|enhanced|verbessert/i.test(x.name)) ||
      v[0] ||
      null;
    return stimme;
  }
  if ("speechSynthesis" in window) {
    stimmeWaehlen();
    speechSynthesis.onvoiceschanged = stimmeWaehlen;
  }
  /* Antwort-HTML in gut sprechbaren Text verwandeln */
  function sprechText(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    d.querySelectorAll(".fpklein").forEach((x) => x.remove());
    d.querySelectorAll("li").forEach((li, i) => {
      if (i >= 5) li.remove();
      else li.append(". ");
    });
    let t = d.textContent
      .replace(/\s+/g, " ")
      .replace(/€/g, " Euro")
      .replace(/(\d)\.(\d{3})/g, "$1$2")
      .replace(/ · /g, ", ")
      .replace(/–/g, " bis ")
      .replace(/\bTel\. /g, "Telefon ")
      .replace(/\bz\. B\./g, "zum Beispiel")
      .trim();
    if (t.length > 420) t = t.slice(0, 420).replace(/[^.!?]*$/, "") || t.slice(0, 420);
    return t;
  }
  function sprechen(text) {
    return new Promise((ok) => {
      if (!("speechSynthesis" in window) || !text) return ok();
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "de-DE";
        if (stimme || stimmeWaehlen()) u.voice = stimme;
        u.rate = 1.05;
        let fertig = false;
        const ende = () => !fertig && ((fertig = true), ok());
        u.onend = ende;
        u.onerror = ende;
        setTimeout(ende, 1500 + text.length * 90); // Sicherheitsnetz, falls onend ausbleibt
        speechSynthesis.speak(u);
      } catch (e) {
        ok();
      }
    });
  }
  /* iOS: Sprachausgabe muss einmal innerhalb eines Tipps freigeschaltet werden */
  function sprachausgabeFreischalten() {
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------- Oberfläche ---------- */
  function fenster() {
    return document.querySelector(".fragpv");
  }
  function status(art, text) {
    zustand = art;
    const f = fenster();
    if (!f) return;
    f.classList.toggle("fphoert", art === "hoert");
    f.classList.toggle("fpdenkt", art === "denkt" || art === "laedt");
    f.classList.toggle("fpspricht", art === "spricht");
    const m = f.querySelector(".fpmikro");
    if (m) {
      m.setAttribute("aria-pressed", String(art !== "aus"));
      m.setAttribute("aria-label", art === "aus" ? "Mit Donna sprechen" : "Gespräch beenden");
    }
    const s = f.querySelector(".fptipp");
    if (s)
      s.textContent =
        text ||
        (art === "hoert"
          ? "Ich höre zu …"
          : art === "denkt"
            ? "Einen Moment …"
            : art === "spricht"
              ? "Donna spricht – danach hört sie wieder zu"
              : "Tippe aufs Mikrofon und sprich – oder schreib.");
  }
  function pegel(w) {
    const f = fenster();
    if (f) f.style.setProperty("--pegel", Math.min(1, Math.max(0, w)).toFixed(2));
  }

  async function ladeDialog() {
    const schon = await istGeladen();
    if (schon) return true;
    return new Promise((ok) => {
      const f = fenster();
      const box = document.createElement("div");
      box.className = "fpladen";
      box.innerHTML = `<b>Sprachmodell laden</b>
        <p>Damit Donna dich versteht, lädt sie einmalig ihr Sprachmodell (etwa 250 MB) – am besten im WLAN. Danach funktioniert es offline. Die Sprache wird nur auf deinem iPhone erkannt, nichts wird verschickt.</p>
        <div class="fpbalken"><i></i></div><span class="fpproz"></span>
        <div class="fpladeknoepfe"><button type="button" class="btn" data-l="nein">Später</button><button type="button" class="btn primary" data-l="ja">Jetzt laden</button></div>`;
      f.querySelector(".fplog").appendChild(box);
      box.scrollIntoView({ block: "end" });
      box.querySelector('[data-l="nein"]').onclick = () => {
        box.remove();
        ok(false);
      };
      box.querySelector('[data-l="ja"]').onclick = async () => {
        box.querySelector(".fpladeknoepfe").remove();
        const bal = box.querySelector(".fpbalken i"),
          pz = box.querySelector(".fpproz");
        status("laedt", "Sprachmodell wird geladen …");
        try {
          try {
            if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
          } catch (e) {}
          await modellLaden((anteil, bytes) => {
            bal.style.width = Math.round(anteil * 100) + "%";
            pz.textContent = `${Math.round(anteil * 100)} % · ${Math.round(bytes / 1e6)} MB`;
          });
          box.innerHTML = `<b>Fertig!</b><p>Das Sprachmodell ist geladen. Sprich einfach – Donna hört zu.</p>`;
          status("aus");
          ok(true);
        } catch (e) {
          box.innerHTML = `<b>Das hat nicht geklappt.</b><p>${entschaerfeText(e.message || String(e))}</p><p>Prüfe die Internetverbindung und versuche es nochmal.</p>`;
          status("aus");
          ok(false);
        }
      };
    });
  }

  async function gespraechStarten() {
    sprachausgabeFreischalten();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder)
      return fehlerZeigen("Dieses Gerät erlaubt hier keine Mikrofon-Aufnahme. Bitte iOS aktualisieren.");
    try {
      await mikrofon(); // Erlaubnis im Tipp anfragen
    } catch (e) {
      return fehlerZeigen("Ohne Mikrofon-Erlaubnis kann Donna nicht zuhören. Erlauben unter Einstellungen → Apps → Safari → Mikrofon.");
    }
    if (!(await ladeDialog())) {
      mikrofonAus();
      return;
    }
    status("denkt", "Sprachmodell wird gestartet …");
    try {
      await modellLaden();
    } catch (e) {
      mikrofonAus();
      return fehlerZeigen("Das Sprachmodell konnte nicht starten: " + (e.message || e));
    }
    gespraech = true;
    runde(WARTEN_MS * 2);
  }
  function gespraechBeenden() {
    gespraech = false;
    if (aufnahme) aufnahme.stopp();
    try {
      speechSynthesis.cancel();
    } catch (e) {}
    mikrofonAus();
    status("aus");
    pegel(0);
  }
  async function runde(wartenMs) {
    if (!gespraech || !fenster()) return gespraechBeenden();
    status("hoert");
    let samples;
    try {
      samples = await aufnehmen(wartenMs || WARTEN_MS);
    } catch (e) {
      gespraechBeenden();
      return fehlerZeigen("Aufnahme fehlgeschlagen: " + (e.message || e));
    }
    pegel(0);
    if (!gespraech) return;
    if (!samples || samples.length < 16000 * 0.3) {
      /* niemand hat etwas gesagt → Gespräch leise beenden */
      return gespraechBeenden();
    }
    status("denkt");
    let text = "";
    try {
      const r = await erkenner(samples, { language: "german", task: "transcribe", chunk_length_s: 30 });
      text = fachbegriffe(String((r && r.text) || "").replace(/\s+/g, " ").trim());
    } catch (e) {
      gespraechBeenden();
      return fehlerZeigen("Ich konnte das nicht umwandeln: " + (e.message || e));
    }
    /* typische Whisper-Füllsel bei Stille */
    if (!text || /^(\[.*\]|\(.*\)|untertitel.*|vielen dank\.?|danke\.?)$/i.test(text) && samples.length < 16000 * 1.2) return runde();
    if (ENDE.test(normal(text))) {
      window.fragProvisio.fragen(text, { still: true });
      await sprechen("Gern. Bis gleich!");
      return gespraechBeenden();
    }
    const a = window.fragProvisio.fragen(text, { still: true });
    if (!gespraech) return;
    if (a && a.text) {
      status("spricht");
      await sprechen(sprechText(a.text));
    }
    if (gespraech) runde();
  }
  function fehlerZeigen(t) {
    const f = fenster();
    status("aus");
    if (!f) return;
    const b = document.createElement("div");
    b.className = "fpb pv fpfehler";
    b.textContent = t;
    f.querySelector(".fplog").appendChild(b);
    b.scrollIntoView({ block: "end" });
  }

  /* Mikrofon-Knopf in Donnas Fenster einbauen */
  window.fragProvisio._nachOeffnen = function (f, opts) {
    if (!f || f.querySelector(".fpmikro")) return;
    const form = f.querySelector(".fpeingabe");
    const m = document.createElement("button");
    m.type = "button";
    m.className = "fpmikro";
    m.setAttribute("aria-pressed", "false");
    m.setAttribute("aria-label", "Mit Donna sprechen");
    m.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
    m.onclick = () => (zustand === "aus" ? gespraechStarten() : zustand === "hoert" && aufnahme ? aufnahme.stopp() : gespraechBeenden());
    form.prepend(m);
    setTimeout(() => status("aus"), 0);
    /* Tippen ins Textfeld beendet das Gespräch */
    f.querySelector("#fpFrage").addEventListener("focus", () => gespraech && gespraechBeenden());
    if (opts && opts.sprechen) setTimeout(() => m.click(), 350);
  };
  window.fragProvisio._vorSchliessen = gespraechBeenden;
  window.donnaStimme = { modellLaden, istGeladen, sprechText, gespraechStarten, gespraechBeenden, zustand: () => zustand };
})();
