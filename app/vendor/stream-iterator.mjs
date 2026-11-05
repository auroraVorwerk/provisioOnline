/* Safari (iOS) kennt ReadableStream[Symbol.asyncIterator] noch nicht; pdf.js 6 braucht es für
   getTextContent() und beim Entpacken. Kleine Nachrüstung nach WHATWG-Streams-Spezifikation. */
const RS = globalThis.ReadableStream;
if (RS && !RS.prototype[Symbol.asyncIterator]) {
  const werte = function ({ preventCancel = false } = {}) {
    const leser = this.getReader();
    return {
      async next() {
        const r = await leser.read();
        if (r.done) leser.releaseLock();
        return r;
      },
      async return(wert) {
        if (!preventCancel) {
          const c = leser.cancel(wert);
          leser.releaseLock();
          await c;
        } else leser.releaseLock();
        return { done: true, value: wert };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
  Object.defineProperty(RS.prototype, Symbol.asyncIterator, { value: werte, writable: true, configurable: true });
  if (!RS.prototype.values) Object.defineProperty(RS.prototype, "values", { value: werte, writable: true, configurable: true });
}
