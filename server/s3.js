/**
 * Minimaler S3-Zugriff (Scaleway Object Storage, fr-par) mit AWS Signature V4.
 * Keine Fremdbibliotheken – nur Node-Bordmittel.
 */
"use strict";
const crypto = require("crypto");

const REGION = "fr-par";
const sha = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();

function s3(bucket, access, secret) {
  const host = bucket ? `${bucket}.s3.${REGION}.scw.cloud` : `s3.${REGION}.scw.cloud`;
  async function einmal(method, key, body, extra) {
    const payload = body == null ? "" : body;
    const amz = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const tag = amz.slice(0, 8);
    const pfad = "/" + (key || "").split("/").map(encodeURIComponent).join("/");
    const h = { host, "x-amz-content-sha256": sha(payload), "x-amz-date": amz };
    Object.keys(extra || {}).forEach((k) => (h[k.toLowerCase()] = extra[k]));
    const namen = Object.keys(h).sort();
    const kanon = [method, pfad, "", namen.map((k) => `${k}:${String(h[k]).trim()}\n`).join(""), namen.join(";"), h["x-amz-content-sha256"]].join("\n");
    const bereich = `${tag}/${REGION}/s3/aws4_request`;
    const zuSign = ["AWS4-HMAC-SHA256", amz, bereich, sha(kanon)].join("\n");
    const k = hmac(hmac(hmac(hmac("AWS4" + secret, tag), REGION), "s3"), "aws4_request");
    const sig = crypto.createHmac("sha256", k).update(zuSign).digest("hex");
    h.authorization = `AWS4-HMAC-SHA256 Credential=${access}/${bereich}, SignedHeaders=${namen.join(";")}, Signature=${sig}`;
    delete h.host;
    return fetch(`https://${host}${pfad}`, { method, headers: h, body: method === "GET" || method === "HEAD" ? undefined : payload });
  }
  /* Kurze Störungen des Speichers (5xx, Netz) bis zu dreimal abfangen */
  async function req(method, key, body, extra) {
    for (let n = 0; ; n++) {
      try {
        const r = await einmal(method, key, body, extra);
        if (r.status < 500 || n >= 2) return r;
      } catch (e) {
        if (n >= 2) throw e;
      }
      await new Promise((ok) => setTimeout(ok, 150 * (n + 1)));
    }
  }
  return {
    req,
    /* JSON lesen → {daten, etag} oder null */
    async lesen(key) {
      const r = await req("GET", key);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("S3 GET " + r.status);
      return { daten: JSON.parse(await r.text()), etag: r.headers.get("etag") };
    },
    /* JSON schreiben; bedingung: {etag} (nur wenn unverändert) oder {neu:true} (nur wenn nicht vorhanden) */
    async schreiben(key, obj, bedingung) {
      const extra = { "content-type": "application/json" };
      if (bedingung && bedingung.etag) extra["if-match"] = bedingung.etag;
      if (bedingung && bedingung.neu) extra["if-none-match"] = "*";
      const r = await req("PUT", key, JSON.stringify(obj), extra);
      if (r.status === 412 || r.status === 409) return false;
      if (!r.ok) throw new Error("S3 PUT " + r.status + " " + (await r.text()).slice(0, 200));
      return true;
    },
    async loeschen(key) {
      const r = await req("DELETE", key);
      if (!r.ok && r.status !== 404) throw new Error("S3 DELETE " + r.status);
    },
  };
}
module.exports = { s3 };
