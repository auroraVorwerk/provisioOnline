/**
 * Eingabeschutz
 *
 * Entschärft  <  >  "  '  schon beim Tippen und Einfügen in allen Textfeldern
 * (‹ › ” ’). So kann eingegebener Text nie als Markup im Bildschirm landen –
 * auch nicht vor dem nächsten Laden. Die Content-Security-Policy blockiert
 * Skripte zusätzlich; das hier ist die zweite Verteidigungslinie.
 * Passwortfelder bleiben unverändert (werden nie angezeigt).
 */
(function () {
  const ERSATZ = { "<": "‹", ">": "›", '"': "”", "'": "’" };
  const TEXT = /^(text|search|email|tel|url|)$/;
  function entschaerfeFeld(el) {
    if (!el || !el.tagName) return;
    const tag = el.tagName;
    if (tag !== "TEXTAREA" && !(tag === "INPUT" && TEXT.test((el.getAttribute("type") || "").toLowerCase()))) return;
    const v = el.value;
    if (!v || !/[<>"']/.test(v)) return;
    let pos = null;
    try {
      pos = el.selectionStart;
    } catch (e) {}
    el.value = v.replace(/[<>"']/g, (z) => ERSATZ[z]);
    try {
      if (pos != null) el.setSelectionRange(pos, pos);
    } catch (e) {}
  }
  document.addEventListener("input", (ev) => entschaerfeFeld(ev.target), true);
  document.addEventListener("change", (ev) => entschaerfeFeld(ev.target), true);
  window.entschaerfeFeld = entschaerfeFeld;
})();
