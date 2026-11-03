/**
 * K70-Inventur
 *
 * Bestand im Fahrzeug nach Kategorien, mit Suche und Katalogpflege.
 */
const artKey = (n) => n.replace(/[.#$\[\]\/]/g, "_").slice(0, 120);
/* Ältere Bestände ohne Kategorie im Schlüssel übernehmen */
function bestandUmstellen() {
  if (!katalog.liste || !katalog.liste.length) return;
  let geaendert = false;
  katalog.liste.forEach((k) =>
    (k.artikel || []).forEach((a) => {
      const alt = artKey(a.n),
        neu = artKey(k.kat + "|" + a.n);
      if (inventur[alt] !== undefined && inventur[neu] === undefined) {
        inventur[neu] = inventur[alt];
        delete inventur[alt];
        geaendert = true;
      }
    }),
  );
  if (geaendert) saveData();
}
function bestandWert() {
  let summe = 0;
  (katalog.liste || []).forEach((k) =>
    (k.artikel || []).forEach((a) => {
      summe += (+inventur[artKey(k.kat + "|" + a.n)] || 0) * (+a.p || 0);
    }),
  );
  return summe;
}
function katalogParsen(text) {
  const kats = [];
  let aktuell = null;
  text.split(/\r?\n/).forEach((z) => {
    const zeile = z.trim();
    if (!zeile) return;
    if (zeile.startsWith("#")) {
      aktuell = { kat: zeile.replace(/^#+\s*/, ""), artikel: [] };
      kats.push(aktuell);
      return;
    }
    const teile = zeile.split(/\s*[|;\t]\s*/);
    if (teile.length < 2) return;
    if (!aktuell) {
      aktuell = { kat: "Ohne Kategorie", artikel: [] };
      kats.push(aktuell);
    }
    const eintrag = { n: teile[0].trim(), p: num(teile[1]) };
    teile.slice(2).forEach((t) => {
      if (/^top$/i.test(t.trim())) eintrag.top = 1;
      else if (/nicht/i.test(t)) eintrag.hw = t.trim();
    });
    aktuell.artikel.push(eintrag);
  });
  return kats;
}
let invSuche = "";
let katBearbeiten = false; // Katalogpflege des Admins
function invSummeZeigen() {
  const el = document.querySelector(".invsumme b");
  if (el) el.textContent = preis(bestandWert()) + " €";
}
/* Filtert die bestehenden Zeilen ohne Neuaufbau – die Tastatur bleibt offen. */
function invFiltern() {
  const q = invSuche.trim().toLowerCase().replace(".", ",");
  const box = document.getElementById("invliste");
  if (!box) return;
  const zu = settings.invZu || {};
  let sichtbar = 0;
  box.querySelectorAll(".invgruppe").forEach((gr) => {
    const kid = gr.dataset.gruppe;
    let treffer = 0;
    gr.querySelectorAll(".invzeile").forEach((el) => {
      const passt = !q || el.dataset.such.includes(q);
      el.hidden = !passt;
      if (passt) treffer++;
    });
    sichtbar += treffer;
    const kopf = box.querySelector(`[data-katzu="${kid}"]`);
    /* Bei einer Suche zählt nur der Treffer, sonst der gespeicherte Zustand */
    const auf = q ? treffer > 0 : !zu[kid];
    gr.classList.toggle("zu", !auf);
    gr.hidden = q ? treffer === 0 : false;
    if (kopf) {
      kopf.hidden = q ? treffer === 0 : false;
      kopf.classList.toggle("auf", auf);
      const p = kopf.querySelector(".kp");
      if (p) p.textContent = auf ? "–" : "+";
      const z = kopf.querySelector(".kz");
      if (z && q) z.textContent = treffer;
    }
  });
  if (!q)
    box.querySelectorAll(".invkat .kz").forEach((z, i) => {
      const k = (katalog.liste || [])[i];
      if (k) z.textContent = (k.artikel || []).length;
    });
  const info = document.getElementById("invTreffer");
  if (info) {
    info.textContent = q ? `${sichtbar} Treffer` : "";
    info.hidden = !q;
  }
}
function renderInventur() {
  const box = document.getElementById("inventur");
  if (!box || !me) return;
  let liste = "";
  const pflege = istTeamleiter() && katBearbeiten;
  const zu = settings.invZu || {};
  (katalog.liste || []).forEach((k) => {
    const kid = artKey(k.kat);
    const auf = !zu[kid];
    liste += `<button type="button" class="invkat${auf ? " auf" : ""}" data-katzu="${kid}">
      <span class="kn">${k.kat}</span><span class="kz">${(k.artikel || []).length}</span><span class="kp">${auf ? "–" : "+"}</span></button>`;
    liste += `<div class="invgruppe${auf ? "" : " zu"}" data-gruppe="${kid}">`;
    const anz = (k.artikel || []).length;
    liste += (k.artikel || [])
      .map((a, idx) => {
        const id = artKey(k.kat + "|" + a.n);
        const ref = `${k.kat}|${a.n}`;
        const such = (a.n + " " + preis(a.p) + " " + (a.hw || "")).toLowerCase();
        return `<div class="invzeile${a.top ? " top" : ""}${a.hw ? " nichtda" : ""}" data-such="${such}">
        ${istTeamleiter() ? `<button type="button" class="markbox${a.top ? " an" : ""}" data-mark="${ref}" title="Verkaufsschlager">✓</button>` : ""}
        <span class="nm">${a.n}${a.hw ? `<em class="hw">${a.hw}</em>` : ""}</span>
        <span class="pr" data-keinzaehlen>${preis(a.p)} €</span>
        <span class="stepper">
          <button type="button" data-minus="${id}" aria-label="weniger">−</button>
          <b data-menge="${id}" data-zedit="${a.n.replace(/"/g, "&quot;")}" role="button" tabindex="0">${inventur[id] || 0}</b>
          <button type="button" data-plus="${id}" aria-label="mehr">+</button>
        </span>
        ${
          pflege
            ? `<div class="invadmin">
          <label class="posreg"><span>Platz ${idx + 1} von ${anz}</span>
            <input type="range" min="1" max="${anz}" step="1" value="${idx + 1}" data-pos="${ref}" aria-label="Platz in der Kategorie">
          </label>
          <div class="invwerk">
            <button type="button" class="mini" data-artedit="${ref}">Bearbeiten</button>
            <button type="button" class="mini${a.hw ? " an" : ""}" data-arthw="${ref}">nicht verfügbar</button>
            <button type="button" class="mini gefahr" data-artdel="${ref}">Löschen</button>
          </div>
        </div>`
            : ""
        }
      </div>`;
      })
      .join("");
    if (pflege)
      liste += `<div class="invneu"><button type="button" class="mini" data-artneu="${k.kat}">+ Artikel in „${k.kat}“</button></div>`;
    liste += `</div>`;
  });

  box.innerHTML = `
    <div class="asec">
      <h3>K70 Inventur</h3>
      <div class="invsumme"><span>Warenbestand gesamt</span><b>${preis(bestandWert())} €</b></div>
      <p class="sub erkl">Warenbestand nach Kategorien des Shops — Reihenfolge wie im Original.</p>
      <div class="field vorschlagfeld">
        <input id="invSuche" value="${invSuche}" placeholder="Artikel oder Preis suchen" autocomplete="off" inputmode="search">
        <div class="vorschlaege" id="invVorschlaege" hidden></div>
      </div>
      <p class="hinweis" id="invTreffer" hidden></p>
      <div class="actions"><button type="button" class="btn" id="invAlle">Alle Kategorien auf- oder zuklappen</button></div>
      ${
        istTeamleiter()
          ? `<div class="actions"><button type="button" class="btn${pflege ? " primary" : ""}" id="invPflege">${pflege ? "Bearbeiten beenden" : "Katalog bearbeiten"}</button></div>
        ${
          pflege
            ? `<p class="hinweis">Reihenfolge über den Schieberegler, Preis und Hinweis über „Bearbeiten“.
          Änderungen am Katalog gelten sofort für alle Berater.</p>`
            : ""
        }`
          : ""
      }
    </div>
    <div class="asec invliste${pflege ? " bearbeiten" : ""}" id="invliste">${liste}</div>
    <div class="asec">
      <div class="actions"><button class="btn" id="invBestand">Bestand einfügen oder sichern</button></div>
      ${istTeamleiter() ? `<div class="actions"><button class="btn" id="invImport">Katalog einfügen oder aktualisieren</button></div>` : ""}
    </div>`;

  box.querySelectorAll("[data-katzu]").forEach(
    (b) =>
      (b.onclick = () => {
        if (invSuche.trim()) {
          invSuche = "";
          const f0 = document.getElementById("invSuche");
          if (f0) f0.value = "";
        }
        settings.invZu = settings.invZu || {};
        const kid = b.dataset.katzu;
        if (settings.invZu[kid]) delete settings.invZu[kid];
        else settings.invZu[kid] = 1;
        saveData();
        invFiltern();
      }),
  );
  const alleAuf = document.getElementById("invAlle");
  if (alleAuf)
    alleAuf.onclick = () => {
      const zu = settings.invZu || {};
      const irgendAuf = (katalog.liste || []).some((k) => !zu[artKey(k.kat)]);
      settings.invZu = {};
      if (irgendAuf) (katalog.liste || []).forEach((k) => (settings.invZu[artKey(k.kat)] = 1));
      saveData();
      renderInventur();
    };
  const feld = document.getElementById("invSuche");
  feld.oninput = () => {
    invSuche = feld.value;
    invFiltern();
    invVorschlaege(feld.value);
  };
  feld.onkeydown = (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      feld.blur();
      invVorschlagZu();
    }
  };
  box.querySelectorAll("[data-plus],[data-minus]").forEach(
    (b) =>
      (b.onclick = () => {
        stups(8, b.parentElement && b.parentElement.querySelector(".zahl"));
        const id = b.dataset.plus || b.dataset.minus;
        const neu = Math.max(0, (+inventur[id] || 0) + (b.dataset.plus ? 1 : -1));
        if (neu > 0) inventur[id] = neu;
        else delete inventur[id];
        const anzeige = box.querySelector(`[data-menge="${id}"]`);
        if (anzeige) {
          anzeige.textContent = neu;
          anzeige.parentElement.classList.toggle("hat", neu > 0);
        }
        invSummeZeigen();
        saveData();
        renderProv();
      }),
  );
  box.querySelectorAll("[data-menge]").forEach((el) => {
    el.parentElement.classList.toggle("hat", (+el.textContent || 0) > 0);
    el.onclick = () =>
      zahlEingabe(el.dataset.zedit || "Bestand", inventur[el.dataset.menge], (v) => {
        const id = el.dataset.menge;
        if (v > 0) inventur[id] = v;
        else delete inventur[id];
        el.textContent = v;
        el.parentElement.classList.toggle("hat", v > 0);
        invSummeZeigen();
        saveData();
        renderProv();
      });
  });
  box.querySelectorAll("[data-mark]").forEach(
    (b) =>
      (b.onclick = async () => {
        const [kat, name] = b.dataset.mark.split("|");
        const k = (katalog.liste || []).find((x) => x.kat === kat);
        const a = k && k.artikel.find((x) => x.n === name);
        if (!a) return;
        if (a.top) delete a.top;
        else a.top = 1;
        b.classList.toggle("an", !!a.top);
        b.closest(".invzeile").classList.toggle("top", !!a.top);
        try {
          store.set("bw-katalog", katalog.liste);
          saveState("gespeichert");
        } catch (e) {
          saveState("Markierung nicht gespeichert", true);
        }
      }),
  );
  const imp = document.getElementById("invImport");
  if (imp) imp.onclick = katalogDialog;
  document.getElementById("invBestand").onclick = bestandDialog;
  const pflegeBtn = document.getElementById("invPflege");
  if (pflegeBtn)
    pflegeBtn.onclick = () => {
      katBearbeiten = !katBearbeiten;
      invNeuZeichnen();
    };

  /* Reihenfolge: der Regler sagt, an welchen Platz der Artikel soll */
  box.querySelectorAll("[data-pos]").forEach((r) => {
    const lbl = r.parentElement.querySelector("span");
    const max = +r.max || 1;
    r.oninput = () => {
      if (lbl) lbl.textContent = `Platz ${r.value} von ${max}`;
    };
    r.onchange = async () => {
      const { k, i } = artikelSuchen(r.dataset.pos);
      if (!k || i < 0) {
        invNeuZeichnen();
        return;
      }
      const ziel = Math.max(0, Math.min(k.artikel.length - 1, (+r.value || 1) - 1));
      if (ziel === i) {
        invNeuZeichnen();
        return;
      }
      const [art] = k.artikel.splice(i, 1);
      k.artikel.splice(ziel, 0, art);
      invNeuZeichnen();
      await katSpeichern();
    };
  });
  box.querySelectorAll("[data-artedit]").forEach(
    (b) =>
      (b.onclick = () => {
        const [kat, ...rest] = b.dataset.artedit.split("|");
        artikelDialog(kat, rest.join("|"));
      }),
  );
  box
    .querySelectorAll("[data-artneu]")
    .forEach((b) => (b.onclick = () => artikelDialog(b.dataset.artneu, null)));
  box.querySelectorAll("[data-arthw]").forEach(
    (b) =>
      (b.onclick = async () => {
        const { a } = artikelSuchen(b.dataset.arthw);
        if (!a) return;
        if (a.hw) delete a.hw;
        else a.hw = "zur Zeit nicht verfügbar";
        invNeuZeichnen();
        await katSpeichern();
      }),
  );
  box.querySelectorAll("[data-artdel]").forEach(
    (b) =>
      (b.onclick = () => {
        const ref = b.dataset.artdel;
        const [kat, ...rest] = ref.split("|");
        const name = rest.join("|");
        simpleDialog(
          "Artikel löschen",
          kat,
          `<p class="hinweis">„${name}“ wird für alle Berater aus dem Katalog entfernt.
        Der erfasste Bestand dieses Artikels geht dabei verloren.</p>`,
          async () => {
            const { k, i } = artikelSuchen(ref);
            if (k && i >= 0) k.artikel.splice(i, 1);
            delete inventur[artKey(kat + "|" + name)];
            closeModal();
            saveData();
            invNeuZeichnen();
            renderProv();
            await katSpeichern();
          },
          "Endgültig löschen",
        );
      }),
  );
  invFiltern();
}
/* Zeichnet die Inventur neu, ohne dass die Seite nach oben springt */
function invNeuZeichnen() {
  const y = window.scrollY || 0;
  renderInventur();
  requestAnimationFrame(() => window.scrollTo(0, y));
}
function artikelSuchen(ref) {
  const [kat, ...rest] = String(ref || "").split("|");
  const name = rest.join("|");
  const k = (katalog.liste || []).find((x) => x.kat === kat);
  const i = k ? (k.artikel || []).findIndex((x) => x.n === name) : -1;
  return { k, a: k && i >= 0 ? k.artikel[i] : null, i, kat, name };
}
async function katSpeichern() {
  try {
    store.set("bw-katalog", katalog.liste);
    saveState("Katalog gespeichert");
    return true;
  } catch (e) {
    saveState("Katalog nicht gespeichert", true);
    return false;
  }
}
/* Artikel anlegen oder ändern – Name, Preis, Hinweis und Verkaufsschlager */
function artikelDialog(kat, name) {
  const k = (katalog.liste || []).find((x) => x.kat === kat);
  if (!k) return;
  const a = name ? (k.artikel || []).find((x) => x.n === name) : null;
  const neu = !a;
  const cur = a || { n: "", p: 0 };
  const hw = cur.hw || "";
  const hinweise = ["", "zur Zeit nicht verfügbar", "zur Zeit nicht lieferbar", "nicht verfügbar"];
  if (hw && !hinweise.includes(hw)) hinweise.push(hw);
  simpleDialog(
    neu ? "Artikel hinzufügen" : "Artikel bearbeiten",
    kat,
    `<div class="grp">
       ${fld("artName", "Artikelname", cur.n, "text", 'autocomplete="off" spellcheck="false"')}
       ${fld("artPreis", "Preis €", neu ? "" : preis(cur.p), "text", 'inputmode="decimal"')}
       <div class="field"><label for="artHw">Hinweis</label>
         <select id="artHw">${hinweise
           .map((h) => `<option value="${h}"${h === hw ? " selected" : ""}>${h || "kein Hinweis"}</option>`)
           .join("")}</select></div>
       <div class="field"><label for="artTop">Verkaufsschlager</label>
         <select id="artTop">
           <option value="0"${cur.top ? "" : " selected"}>nein</option>
           <option value="1"${cur.top ? " selected" : ""}>ja</option></select></div>
     </div>
     ${
       neu
         ? `<p class="hinweis">Der Artikel wird unten in „${kat}“ angehängt –
       den Platz stellst du danach mit dem Schieberegler ein.</p>`
         : `<p class="hinweis">Wird der Name geändert, fängt der Bestand dieses Artikels
       bei den anderen Beratern wieder bei 0 an.</p>`
     }
     <p class="err" id="artErr" hidden></p>`,
    async () => {
      const err = document.getElementById("artErr");
      const zeig = (m) => {
        err.textContent = m;
        err.hidden = false;
      };
      const nn = document.getElementById("artName").value.trim();
      const pp = num(document.getElementById("artPreis").value);
      if (!nn) return zeig("Bitte einen Artikelnamen eintragen.");
      if (nn.includes("|")) return zeig("Im Namen darf kein senkrechter Strich stehen.");
      if ((k.artikel || []).some((x) => x !== a && x.n.toLowerCase() === nn.toLowerCase()))
        return zeig("Diesen Artikel gibt es in dieser Kategorie schon.");
      if (pp <= 0) return zeig("Bitte einen Preis eintragen.");
      const hwNeu = document.getElementById("artHw").value;
      const topNeu = document.getElementById("artTop").value === "1";
      if (neu) {
        const eintrag = { n: nn, p: pp };
        if (topNeu) eintrag.top = 1;
        if (hwNeu) eintrag.hw = hwNeu;
        k.artikel = k.artikel || [];
        k.artikel.push(eintrag);
      } else {
        const altId = artKey(kat + "|" + a.n),
          neuId = artKey(kat + "|" + nn);
        if (altId !== neuId && inventur[altId] !== undefined) {
          inventur[neuId] = inventur[altId];
          delete inventur[altId];
          saveData();
        }
        a.n = nn;
        a.p = pp;
        if (hwNeu) a.hw = hwNeu;
        else delete a.hw;
        if (topNeu) a.top = 1;
        else delete a.top;
      }
      closeModal();
      invNeuZeichnen();
      renderProv();
      await katSpeichern();
    },
    neu ? "Artikel anlegen" : "Änderung speichern",
  );
}
/* Vorschläge beim Tippen, wie bei den Adressen */
function invVorschlagZu() {
  const v = document.getElementById("invVorschlaege");
  if (v) {
    v.hidden = true;
    v.innerHTML = "";
  }
}
function invVorschlaege(text) {
  const box = document.getElementById("invVorschlaege");
  if (!box) return;
  const q = text.trim().toLowerCase().replace(".", ",");
  if (q.length < 2) {
    invVorschlagZu();
    return;
  }
  const treffer = [];
  (katalog.liste || []).forEach((k) =>
    (k.artikel || []).forEach((a) => {
      if (treffer.length < 8 && (a.n + " " + preis(a.p)).toLowerCase().includes(q))
        treffer.push({ n: a.n, p: a.p, kat: k.kat });
    }),
  );
  if (!treffer.length) {
    invVorschlagZu();
    return;
  }
  box.innerHTML = treffer
    .map(
      (t) =>
        `<button type="button" class="vorschlag" data-inv="${t.n.replace(/"/g, "&quot;")}">
       <b>${t.n}</b><span data-keinzaehlen>${t.kat} · ${preis(t.p)} €</span></button>`,
    )
    .join("");
  box.hidden = false;
}
document.addEventListener("click", (ev) => {
  const v = ev.target.closest("[data-inv]");
  if (v) {
    const feld = document.getElementById("invSuche");
    feld.value = v.dataset.inv;
    invSuche = v.dataset.inv;
    invVorschlagZu();
    invFiltern();
    return;
  }
  if (!ev.target.closest("#invVorschlaege") && !ev.target.closest("#invSuche")) invVorschlagZu();
});
/* Bestand als Liste einfügen – dient zugleich als Sicherung zum Herauskopieren */
function bestandDialog() {
  const jetzt = [];
  (katalog.liste || []).forEach((k) =>
    (k.artikel || []).forEach((a) => {
      const m = +inventur[artKey(k.kat + "|" + a.n)] || 0;
      if (m > 0) jetzt.push(`${a.n} = ${m}`);
    }),
  );
  simpleDialog(
    "Bestand einfügen oder sichern",
    "Je Zeile: Artikelname = Anzahl",
    `<div class="grp"><div class="field"><label for="bestText">Bestand</label>
       <textarea id="bestText" style="min-height:220px;font-family:'JetBrains Mono',monospace;font-size:.78rem"
         placeholder="KOBOLD SB7 Flexschlauch = 5">${jetzt.join("\n")}</textarea></div></div>
     <p class="hinweis">Zum Sichern einfach den Text herauskopieren. Zum Einfügen die Liste ersetzen —
       Artikel ohne Zeile bleiben unverändert, eine Null löscht den Bestand.</p>
     <p class="err" id="bestErr" hidden></p>`,
    () => {
      const err = document.getElementById("bestErr");
      const zeilen = document.getElementById("bestText").value.split(/\r?\n/);
      const nachName = new Map();
      (katalog.liste || []).forEach((k) =>
        (k.artikel || []).forEach((a) => nachName.set(a.n.trim().toLowerCase(), artKey(k.kat + "|" + a.n))),
      );
      let gesetzt = 0;
      const unbekannt = [];
      zeilen.forEach((z) => {
        const t = z.trim();
        if (!t) return;
        const m = t.match(/^(.*?)\s*[=|;\t]\s*(\d+)$/);
        if (!m) {
          unbekannt.push(t.slice(0, 40));
          return;
        }
        const id = nachName.get(m[1].trim().toLowerCase());
        if (!id) {
          unbekannt.push(m[1].slice(0, 40));
          return;
        }
        const anzahl = +m[2];
        if (anzahl > 0) inventur[id] = anzahl;
        else delete inventur[id];
        gesetzt++;
      });
      if (unbekannt.length && !gesetzt) {
        err.textContent = "Keine Zeile erkannt. Format: Artikelname = Anzahl";
        err.hidden = false;
        return;
      }
      closeModal();
      saveData();
      renderInventur();
      renderProv();
      if (unbekannt.length)
        setTimeout(
          () =>
            simpleDialog(
              "Nicht zugeordnet",
              `${gesetzt} Zeilen übernommen`,
              `<div class="summary">${unbekannt.map((u) => `• ${u}`).join("<br>")}</div>
         <p class="hinweis">Diese Namen stehen nicht im Katalog — bitte Schreibweise prüfen.</p>`,
              () => closeModal(),
              "Verstanden",
            ),
          200,
        );
    },
    "Übernehmen",
  );
}
function katalogDialog() {
  const jetzt = (katalog.liste || [])
    .map(
      (k) =>
        "# " +
        k.kat +
        "\n" +
        (k.artikel || [])
          .map((a) => `${a.n} | ${preis(a.p)}${a.top ? " | top" : ""}${a.hw ? " | " + a.hw : ""}`)
          .join("\n"),
    )
    .join("\n\n");
  simpleDialog(
    "Katalog einfügen",
    "Kategorien mit #, dann Artikel | Preis | top",
    `<div class="grp"><div class="field"><label for="katText">Katalog</label>
       <textarea id="katText" style="min-height:240px;font-family:'JetBrains Mono',monospace;font-size:.78rem">${jetzt}</textarea></div></div>
     <p class="hinweis">Beispiel:<br># airumo<br>airumo happy place Set | 69,00<br>KOBOLD airumo Mix Set | 11,90 | top</p>
     <p class="err" id="katErr" hidden></p>`,
    async () => {
      const err = document.getElementById("katErr");
      const neu = katalogParsen(document.getElementById("katText").value);
      if (!neu.length) {
        err.textContent = "Es wurde keine Zeile erkannt.";
        err.hidden = false;
        return;
      }
      katalog.liste = neu;
      try {
        store.set("bw-katalog", neu);
      } catch (e) {
        err.textContent = "Nicht gespeichert: " + (e.message || "");
        err.hidden = false;
        return;
      }
      closeModal();
      renderInventur();
      renderProv();
    },
    "Katalog speichern",
  );
}
