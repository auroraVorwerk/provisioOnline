/**
 * Vertriebsmonat und Provision
 *
 * Vertriebskalender (4-4-5), Umsatz, Provisionsstufen und Ziele.
 */
const MWST = 1.19;
const BUILD = "Provisio Online 1.2.1 (Beta 1.10.1) · 05.11.2026"; // steht unten im Profil – zum Prüfen, welcher Stand geladen ist
const TIERS = [
  { u: 3000, b: 0.04 },
  { u: 5000, b: 0.08 },
  { u: 7000, b: 0.1 },
  { u: 12000, b: 0.12 },
];
const settings = { bestellrahmen: 0 };
const RESET_PFEIL = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>`;
const wunsch = { einkommen: 0, tage: 5, proAuftrag: 270, quote: 0 }; // 270 € je Auftrag ist fest
const einkaeufe = []; // K70-Einkauf: {datum, brutto}
const inventur = {}; // Artikelnummer -> Stückzahl
const K70_KATALOG = [
  {
    kat: "airumo",
    artikel: [
      { n: "airumo happy place Set", p: 69, hw: "nicht verfügbar" },
      { n: "airumo summer delight Set", p: 69 },
      { n: "airumo wild heart Set", p: 69, hw: "nicht verfügbar" },
      { n: "airumo dovina classic 2x3 Stk.", p: 11.9, top: 1 },
      { n: "airumo Duftkerze golden hour (360 g)", p: 29.9 },
      { n: "airumo Duftkerze happy (360 g)", p: 29.9 },
      { n: "airumo Duftkerze summer delight (360 g)", p: 29.9 },
      { n: "airumo golden hour 2x3 Stk.", p: 11.9, top: 1 },
      { n: "airumo happy (220 ml)", p: 34.9, hw: "nicht verfügbar" },
      { n: "airumo happy place 2x3 Stk.", p: 11.9, top: 1 },
      { n: "airumo Mix Set", p: 11.9, top: 1 },
      { n: "airumo mystic woods 2x3 Stk.", p: 11.9, top: 1 },
      { n: "airumo Raumduft mystic woods (220 ml)", p: 34.9 },
      { n: "airumo Raumduft summer (220 ml)", p: 34.9 },
      { n: "airumo Raumduft wild heart (220 ml)", p: 34.9, hw: "nicht verfügbar" },
      { n: "airumo summer delight 2x3 Stk.", p: 11.9, top: 1 },
      { n: "airumo wild heart 2x3 Stk.", p: 11.9, top: 1 },
    ],
  },
  {
    kat: "Elektro-Saugschläuche / -Saugrohre",
    artikel: [
      { n: "Elektrosaugrohr VT260/265", p: 79 },
      { n: "ESR300 Elektrosaugrohr", p: 79 },
      { n: "ESS 260/265 CC", p: 99 },
      { n: "ESS140 Elektrosaugschlauch (1 Stück)", p: 58 },
      { n: "ESS150/200 Elektrosaugschlauch", p: 59 },
      { n: "ESS270 Elektrosaugschlauch (1 Stück)", p: 99 },
      { n: "ESS300 Elektrosaugschlauch", p: 99 },
      { n: "ESR270 Elektrosaugrohr (1 Stück)", p: 79 },
    ],
  },
  {
    kat: "Fensterreinigung",
    artikel: [
      { n: "GD15 Glasdüse (1 Stück)", p: 28 },
      { n: "GT15 Glastuch (1 Stück)", p: 12 },
      { n: "Koboclear Glasreiniger, 750ml (1 Stück)", p: 9.9 },
    ],
  },
  { kat: "MP100", artikel: [{ n: "MP100 Matratzen-Frischeraufsatz", p: 59 }] },
  {
    kat: "PB420 / 430 Polsterboy",
    artikel: [
      { n: "PB420 Ersatzschuh inkl. Bürsten (1 Stück)", p: 39, hw: "nicht lieferbar" },
      { n: "PB430 Ersatzschuh inkl. Bürsten (1 Stück)", p: 35 },
    ],
  },
  {
    kat: "PBB100",
    artikel: [
      { n: "MP Noppenscheibe", p: 15 },
      { n: "MR100 Matratzen-Saugaufsatz", p: 39 },
      { n: "PB(B) Ersatzschuh inkl. Bürsten", p: 39 },
    ],
  },
  { kat: "SB100 Saugschlauch", artikel: [{ n: "SB100 Saugschlauch", p: 49 }] },
  {
    kat: "Serviceartikel",
    artikel: [
      { n: "ADF Adapter Fremdgeräte (1 Stück)", p: 12 },
      { n: "Aktiv-Filtersystem VT251-252 (1 Stück)", p: 89.9, hw: "nicht verfügbar" },
      { n: "Bodenplatte EB400", p: 29 },
      { n: "EB360 Frontdichtlippen Set", p: 9 },
      { n: "EB360 Revisionsklappe", p: 6 },
      { n: "EB370 Frontdichtlippen Set", p: 9 },
      { n: "EB370 Revisionsklappe", p: 6 },
      { n: "EB370/EB360 Rundbürsten (1 Stück)", p: 19.9, top: 1 },
      { n: "EB400 Dichtlippe (hinten)", p: 9 },
      { n: "EB400 Tierhaarbürste", p: 29.9, top: 1 },
      { n: "EB400/100 Revisionsklappe", p: 6 },
      { n: "GP EB370 Matratzenbürsten (10 Stück)", p: 150 },
      { n: "GP EB370 Rundbürsten (10 Stück)", p: 150 },
      { n: "GP Koboclear (12 Stück)", p: 108, hw: "zur Zeit nicht lieferbar" },
      { n: "HD50 Borstenträger (eco)", p: 12 },
      { n: "HD50 Revisionsklappe", p: 6 },
      { n: "HD60 Revisionsklappe", p: 4 },
      { n: "HD60 Borstenträgerplatte (1 Stück)", p: 19 },
      { n: "MF520/530 Reinigungstücher-Set", p: 93 },
      { n: "TS7 Tücherset", p: 49 },
      { n: "VA7 Groß Set 3 (2 x)", p: 15 },
      { n: "VA7 Medium Set 2 (3 x)", p: 12 },
      { n: "VA7 Universal Set 1 (3 x Mix)", p: 15 },
      { n: "VG100/VG100+ Tankverschluss", p: 8 },
      { n: "Kobolin Wachsemulsion 1l (1 Stück)", p: 14.9 },
      { n: "Kobosan active 2,5kg (5 x 500g)", p: 19.9 },
      { n: "Kobotex, 200 ml (2 Stück)", p: 15.9, hw: "zur Zeit nicht lieferbar" },
      { n: "Lavenia 720 g (6 x 120 g)", p: 15.9 },
      { n: "MB370 Matratzenbürsten (1 Stück)", p: 15 },
      { n: "Motorschutzfilter VK135 (1 Stück)", p: 9.9, top: 1 },
      { n: "PB440 Saugschuh inkl. Bürsten", p: 35 },
      { n: "Radiatorbürste (1 Stück)", p: 10 },
      { n: "Rundbürsten EB400 medium (1 Stück)", p: 29.9, top: 1 },
      { n: "Rundbürsten EB400 soft (1 Stück)", p: 29.9 },
      { n: "Rundbürsten ET340, EB350/351 (1 Stück)", p: 19.9, top: 1 },
      { n: "Rundbürsten zur ET340, EB350/351 (10 Paar)", p: 150 },
      { n: "SG15 Schultergurt (1 Stück)", p: 20 },
      { n: "SP520 Dichtlippenrahmen Set", p: 12 },
      { n: "SP530 Dichtlippenrahmen Set", p: 12 },
      { n: "SP530 Seitenklappe", p: 12 },
      { n: "Stiel zum VK136 ohne Kabel (1 Stück)", p: 33 },
      { n: "VC100 Staubkammer", p: 19 },
      { n: "VF200 Dosiereinheit", p: 39 },
      { n: "VF200 Rundbürste", p: 19 },
      { n: "VK140/150 Motorschutzfilter (1 Stück)", p: 9.9, top: 1 },
      { n: "VK200 Blende Filterraum", p: 18 },
      { n: "VK200 Kabelhaken (unten)", p: 5 },
      { n: "VR200 Anschlussleitung (1 Stück)", p: 15 },
      { n: "VR200 Staubfachdeckel", p: 12 },
      { n: "VR200/VR300 Filter (1 Stück)", p: 19.9, top: 1 },
      { n: "VR300 Hauptbürste neu", p: 29.9, top: 1 },
      { n: "VT270 Griff (einteilig)", p: 9 },
    ],
  },
  {
    kat: "SP520 / 530 Hartbodenreiniger",
    artikel: [
      { n: "MF Dry (2 Stück)", p: 29.9 },
      { n: "MF Parkett (3 Stück)", p: 39.9 },
      { n: "MF Universal (3 Stück)", p: 39.9 },
      { n: "MF Universal Soft (3 Stück)", p: 39.9 },
      { n: "SP Dosierflasche (1 Stück)", p: 20 },
      { n: "SP Zubehörtasche (1 Stück)", p: 29 },
      { n: "SP520/530 Tuchträger (1 Stück)", p: 25 },
    ],
  },
  {
    kat: "SP600 Hartbodenreiniger",
    artikel: [
      { n: "Dichtlippen-Set SP600", p: 19 },
      { n: "SP600 Wassertank", p: 30 },
      { n: "Tuchträgerplatte kpl SP600, verp.", p: 25 },
    ],
  },
  {
    kat: "SP7",
    artikel: [
      { n: "SP7 TUCHTRÄGERRAHMEN", p: 22 },
      { n: "SP7 WASSERTANK (kompl.)", p: 30 },
      { n: "SPB100/7 Dichtlippenset", p: 19 },
    ],
  },
  { kat: "SPB100", artikel: [{ n: "SPB100 Wassertank komplett", p: 30 }] },
  {
    kat: "SPB100/SP600/SP7",
    artikel: [
      { n: "Koboclean Holzbodenseife 500ml", p: 15.9, top: 1 },
      { n: "Koboclean Parkett 500ml", p: 9.9, top: 1 },
      { n: "Koboclean Universal 500ml", p: 9.9, top: 1 },
      { n: "MF Reinigungstuch Universal (3x)", p: 39.9, top: 1 },
      { n: "MF600/601 Dry Set (2 Stk.)", p: 29.9 },
      { n: "Parkett Set (3 Stk.)", p: 39.9, top: 1 },
      { n: "Universal Soft Set (3 Stk.)", p: 39.9, top: 1 },
    ],
  },
  {
    kat: "VB100 Akkusauger",
    artikel: [
      { n: "EBB Bürste", p: 19.9, top: 1 },
      { n: "FP 100 Filtertüte", p: 23, top: 1 },
      { n: "EBB100 Dichtlippen-Set (hinten)", p: 20 },
      { n: "EBB100 Seitenkappen", p: 12 },
      { n: "VB100 Filterdeckel", p: 20 },
      { n: "VB100 2-1 Zubehördüse", p: 25 },
      { n: "VB100 Akku", p: 99 },
      { n: "VB100 Ladegerät", p: 25 },
      { n: "VB100 Motorschutzfilter", p: 9.9 },
    ],
  },
  {
    kat: "VC100 Akkusauger",
    artikel: [
      { n: "NC100 Zubehördüsen (1 Stück)", p: 15 },
      { n: "VC100 Filtereinheit(1 Stück)", p: 9.9 },
      { n: "VC100 Ladestation (1 Stück)", p: 15 },
    ],
  },
  {
    kat: "VG100 Fensterreiniger",
    artikel: [
      { n: "MF100 Reinigungstuch (2 Stück)", p: 25 },
      { n: "VG 100 Abstellschale", p: 15 },
      { n: "VG100 Abziehlippe (1 Stück)", p: 9 },
      { n: "VG100 Teleskop (1 Stück)", p: 60 },
      { n: "VG100 Wassertrank (1 Stück)", p: 30 },
      { n: "VG100/VC100 Ladegerät (1 Stück)", p: 15 },
    ],
  },
  {
    kat: "VG100+ Flächenreiniger",
    artikel: [
      { n: "DA100 Kalkreiniger", p: 9 },
      { n: "GC100 Glasreiniger Konzentrat 200", p: 9 },
      { n: "MF100 Softfasertuch (2x)", p: 25 },
      { n: "VG100+ Teleskopstiel", p: 60 },
    ],
  },
  {
    kat: "VK130 / 131 Handstaubsauger",
    artikel: [
      { n: "Aktiv-Geruchsfilter (1 Stück)", p: 12.9, top: 1 },
      { n: "Filterset 130/131 (6 FP, 2 AGF, 1 HMF)", p: 59 },
      { n: "FP130/131 Filtertüte (6 Stück)", p: 23, top: 1 },
      { n: "HMF 130/131 Hygiene-Mikrofilter (1 Stück)", p: 19.9, top: 1 },
      { n: "VK130/131 Anschlussleitung lang", p: 19 },
    ],
  },
  {
    kat: "VK135 / 136 Handstaubsauger",
    artikel: [
      { n: "Anschlusskabel lang zum VK135/136 (1 Stück)", p: 19 },
      { n: "Anschlusskabel Standard zum VK135/136 (1 Stück)", p: 15 },
      { n: "Filterset 135/136 (6 FP, 1 HMF)", p: 35 },
      { n: "FP135/136 Filtertüten (6 Stück)", p: 23, top: 1 },
      { n: "HMF135/136 Hygiene-Mikrofilter (1 Stück)", p: 16.9, top: 1 },
      { n: "Hygiene-Mikrofilter zum VK135/136 (10 Stück)", p: 150 },
    ],
  },
  {
    kat: "VK140 / 150 Handstaubsauger",
    artikel: [
      { n: "Premium Filtertüte FP140/150 (6 Stück)", p: 23, top: 1 },
      { n: "VK140 Filterdeckel", p: 29 },
      { n: "VK150 Anschlusskabel, 10 m (1 Stück)", p: 19 },
      { n: "VK150 Filterdeckel", p: 29 },
    ],
  },
  {
    kat: "VK200 Handstaubsauger",
    artikel: [
      { n: "AL VK200 10m 230V DE", p: 17 },
      { n: "Anschlusskabel lang zum VK200 (1 Stück)", p: 19 },
      { n: "FL-M200 Motorschutzfilter", p: 9.9 },
      { n: "FP200 Filtertüte (RB7/VK200) (6x)", p: 23, top: 1 },
      { n: "VK200 Filterdeckel", p: 49 },
    ],
  },
  {
    kat: "VK7",
    artikel: [
      { n: "Filtertüte FP7", p: 23, top: 1 },
      { n: "AC7 Zubehör Set", p: 99 },
      { n: "AC7 Zubehör Set Box (inkl. SB7, FD7, VD7 (BA7,MB7))", p: 89, top: 1 },
      { n: "AD7 Anschlussadapter", p: 20 },
      { n: "BY7 Akku", p: 159, top: 1 },
      { n: "CA7 LADESCHALE", p: 20, top: 1 },
      { n: "CD7 Autodüse", p: 25, top: 1 },
      { n: "DS7 DISPLAYSCHUTZFOLIE (3 Stk.)", p: 9 },
      { n: "EB7 DICHTLIPPE (hi.)", p: 8 },
      { n: "EB7 REVISIONSKLAPPE", p: 6 },
      { n: "EB7 RUNDBÜRSTEN", p: 15, top: 1 },
      { n: "EB7 Seitenklappen Set (li.,re.)", p: 10 },
      { n: "FD7 Bürstenkranz inkl. Transportschutz", p: 12 },
      { n: "FD7 Flächendüse", p: 25 },
      { n: "FK7 SET", p: 143 },
      { n: "HD7 Borstenträgerplatte", p: 25 },
      { n: "HD7 Hardbodendüse", p: 89 },
      { n: "HD7 Revisionsklappe", p: 6 },
      { n: "MF7 MOTORSCHUTZFILTER", p: 9 },
      { n: "MP Noppenscheibe", p: 15 },
      { n: "MP7 Matratzenfrischer Aufsatz", p: 59 },
      { n: "MR7 Matratzenreinigungs Aufsatz", p: 39, top: 1 },
      { n: "PB7 Saugschuh (black, inkl. Bürsten)", p: 35 },
      { n: "PC7 ANSCHLUSSLEITUNG 230V (EU)", p: 5 },
      { n: "PC7 MONTAGEPLATTE", p: 9 },
      { n: "PC7 Premium Ladegerät", p: 114 },
      { n: "PC7 Premium Ladegerät (Mit Stromkabel)", p: 119 },
      { n: "SB7 Flexschlauch", p: 39, top: 1 },
      { n: "SC7 LADEGERÄT", p: 29 },
      { n: "SG7 Schultergurt", p: 20, top: 1 },
      { n: "TD7 Textildüse", p: 25 },
      { n: "TR7 Teleskoprohr", p: 25 },
      { n: "VD7 Variodüse (inkl. BA7, MB7)", p: 25 },
      { n: "VK7 FILTERDECKEL (exkl. Akku)", p: 25 },
      { n: "WM7 Wandhalterung", p: 15 },
      { n: "Zubehörtasche (Kunden)", p: 69 },
    ],
  },
  {
    kat: "VM7",
    artikel: [
      { n: "BM7 Akku", p: 89 },
      { n: "CM7 Wandhalt./Ladeg./USB-C", p: 39 },
      { n: "CM7 Wandhalterung (solo)", p: 16 },
      { n: "USB-C-Kabel", p: 10 },
      { n: "USB-C-Ladegerät (20 Watt)", p: 20, top: 1 },
      { n: "VM7 2-in-1-Düse", p: 25 },
      { n: "VM7 Filter Set", p: 19.9 },
      { n: "VM7 Staubbehälter", p: 25 },
    ],
  },
  {
    kat: "VR 300 Saugroboter",
    artikel: [
      { n: "VR300 Basisstation mit Anschlussleitung", p: 95 },
      { n: "VR300 Basisstation ohne Anschlussleitung", p: 80 },
      { n: "VR300 Staubfachdeckel", p: 12 },
    ],
  },
  {
    kat: "VR100 Saugroboter",
    artikel: [
      { n: "VR100 Filter (1 Stück)", p: 19.9, top: 1 },
      { n: "VR100 Rundbürste (1 Stück)", p: 29.9, top: 1 },
      { n: "VR100 Staubbehälter (1 Stück)", p: 15 },
    ],
  },
  {
    kat: "VR200 Saugroboter",
    artikel: [
      { n: "Bürste VR200", p: 29.9 },
      { n: "VR200 Basisstation ohne Netzteil (1 Stück)", p: 80 },
      { n: "VR200 Basisstation Set (inkl. Netzkabel)", p: 95 },
      { n: "VR200 Begrenzungsstreifen (1 Stück)", p: 19 },
      { n: "VR200 Fernbedienungung inkl. Batterie (1 Stück)", p: 25 },
      { n: "VR200 Staubbehälter (1 Stück)", p: 15 },
      { n: "VR200 USB-Adapter (1 Stück)", p: 10 },
    ],
  },
  {
    kat: "VR7",
    artikel: [
      { n: "CB7 Ladestation (inkl. Netzteil)", p: 49 },
      { n: "CB7 Netzteil", p: 25 },
      { n: "RB7 Abdeckplatte PC7", p: 4 },
      { n: "RB7 Abdeckplatte ST7", p: 1 },
      { n: "RB7 Anschlussleitung 230V (EU)", p: 5 },
      { n: "RB7 Deckel Filterraum", p: 25 },
      { n: "RB7 Motorschutzfilter", p: 9.9, top: 1 },
      { n: "ST7 & WM7", p: 39 },
      { n: "ST7 Stick (VK7 Halterung für RB7)", p: 24 },
      { n: "VR200/VR300VR7 Seitenbürste", p: 9.9, top: 1 },
      { n: "VR7 Akku", p: 129 },
      { n: "VR7 Bürstenabdeckung", p: 15 },
      { n: "VR7 Filter", p: 19.9, top: 1 },
      { n: "VR7 Motorschutzfilter", p: 9, top: 1 },
      { n: "VR7 Rundbürste", p: 29.9, top: 1 },
      { n: "VR7 Staubbehälter (ohne Filter)", p: 20 },
    ],
  },
  {
    kat: "VT250 / 251 / 252 Bodenstaubsauger",
    artikel: [{ n: "VT251/252 Geruchsfilter (1 Stück)", p: 19.9 }],
  },
  {
    kat: "VT260 / 265 / 270 Bodenstaubsauger",
    artikel: [
      { n: "Aktiv-Geruchsfilter (1 Stück)", p: 12.9, top: 1 },
      { n: "FP 260 Filtertüten", p: 23, top: 1 },
      { n: "Hygiene-Mikrofilter (1 Stück)", p: 16.9, top: 1 },
      { n: "VT260 Filterset (FP260, 1 HMF, 1 AGF)", p: 48 },
      { n: "VT265/270/300 Motorschutzfilter (1 Stück)", p: 9.9, top: 1 },
    ],
  },
  { kat: "VT300 Bodenstaubsauger", artikel: [{ n: "FP300 Premium Filtertüte (5 Stück)", p: 23, top: 1 }] },
  {
    kat: "Zubehör",
    artikel: [
      { n: "Adapter für Kobold für Zubehör mit Wappenanschluss (1 Stück)", p: 19 },
      { n: "FD15 Flexodüse (1 Stück)", p: 25 },
      { n: "HD60 Hartbodendüse (1 Stück)", p: 79 },
      { n: "Frische-Set Teppich", p: 29 },
      { n: "SD15 Softdüse (1 Stück)", p: 25 },
      { n: "Softdüse 14 (1 Stück)", p: 25 },
      { n: "TR15 Teleskoprohr (1 Stück)", p: 25 },
      { n: "Variodüse 14 (1 Stück)", p: 25 },
      { n: "VD15 Variodüse (1 Stück)", p: 25 },
    ],
  },
];
const katalog = { liste: K70_KATALOG }; // Shop-Katalog, überschreibbar über die Datenbank
const netto = (v) => v / MWST;

function mondayOfISOWeek(year, week) {
  const m = mondayOf(new Date(year, 0, 4));
  m.setDate(m.getDate() + (week - 1) * 7);
  return m;
}
/* Vertriebsmonat: Quartal = 4 + 4 + 5 Wochen (im 53-Wochen-Jahr zuletzt 6) */
function vertriebsmonat(date) {
  const { week, year } = isoWeek(date);
  const total = weeksInISOYear(year);
  const q = Math.min(Math.floor((week - 1) / 13), 3);
  const r = week - 1 - q * 13;
  let startW, len, idx;
  if (r < 4) {
    startW = q * 13 + 1;
    len = 4;
    idx = 1;
  } else if (r < 8) {
    startW = q * 13 + 5;
    len = 4;
    idx = 2;
  } else {
    startW = q * 13 + 9;
    len = total === 53 && q === 3 ? 6 : 5;
    idx = 3;
  }
  const from = mondayOfISOWeek(year, startW);
  const to = new Date(from);
  to.setDate(to.getDate() + len * 7 - 1);
  const qFrom = mondayOfISOWeek(year, q * 13 + 1);
  const jFrom = mondayOfISOWeek(year, 1);
  return {
    year,
    quartal: q + 1,
    idx,
    weeks: len,
    startW,
    endW: startW + len - 1,
    from,
    to,
    fromK: dk(from),
    toK: dk(to),
    qFromK: dk(qFrom),
    jFromK: dk(jFrom),
  };
}
/* Bruttoumsätze eines Zeitraums */
const abrechnungsTag = (tag, n) => (n && n.datiert === "Ja" && n.lieferdatum ? n.lieferdatum : tag);
function umsatz(fromK, toK) {
  const u = { fg: 0, wg: 0, k70: 0, k70ein: 0 };
  Object.keys(entries).forEach((k) => {
    const n = entries[k].nb;
    if (!n || n.fremd === "Ja") return; // für andere geschrieben
    const day = abrechnungsTag(k.split("|")[0], n);
    if (day < fromK || day > toK) return;
    if (n.verkauft === "Ja") {
      if (n.gebiet === "Festgebiet") u.fg += num(n.umsatz);
      else if (n.gebiet === "Weißgebiet") u.wg += num(n.umsatz);
    }
    if (n.k70 === "Ja") u.k70 += num(n.k70betrag);
    u.fg += num(n.umsatzFG); // Verkauf während einer Promotion
    u.wg += num(n.umsatzWG);
  });
  einkaeufe.forEach((e) => {
    if (e.datum >= fromK && e.datum <= toK) u.k70ein += num(e.brutto);
  });
  return u;
}
/* Echte Arbeitszeit eines Zeitraums – Meetings sind keine Arbeitszeit */
function arbeitsStunden(fromK, toK) {
  let std = 0;
  Object.keys(entries).forEach((k) => {
    const tag = k.split("|")[0];
    if (tag < fromK || tag > toK) return;
    const e = entries[k],
      n = e.nb;
    if (!n || e.kind === "meeting" || e.kind === "privat" || e.kind === "individuell") return;
    if (!n.realStart || !n.realEnde) return;
    const d = (toDec(n.realEnde) || 0) - (toDec(n.realStart) || 0);
    if (d > 0) std += d;
  });
  return std;
}

/* Bonusstufe – zählt nur, was im Festgebiet passiert ist (K70-Einkauf gilt als Festgebiet) */
function bonusStufe(fgNetto, weeks) {
  const f = weeks / 4;
  let b = 0,
    stufe = "keine";
  TIERS.forEach((t) => {
    if (fgNetto >= t.u * f) {
      b = t.b;
      stufe = Math.round(t.b * 100) + " %";
    }
  });
  const next = TIERS.find((t) => fgNetto < t.u * f);
  return {
    b,
    stufe,
    next: next ? { pct: Math.round(next.b * 100), fehlt: next.u * f - fgNetto, ziel: next.u * f } : null,
  };
}
function provision(u, weeks) {
  const fgN = netto(u.fg),
    wgN = netto(u.wg),
    einN = netto(u.k70ein);
  const basis = fgN + einN; // Grundlage der Bonusstufe
  const { b, stufe, next } = bonusStufe(basis, weeks);
  const pWG = wgN * 0.2;
  const pFG = fgN * (0.2 + b);
  const pK70 = einN * (0.26 + b);
  const prov = pWG + pFG + pK70;
  const vers = prov * 0.14;
  /* Der Warenkredit wird brutto eingekauft und deshalb auch brutto abgezogen */
  const warenkredit = +u.k70ein || 0;
  const minus = +settings.minusVormonat || 0;
  const saldo = prov + vers - warenkredit - minus;
  return {
    fgN,
    wgN,
    einN,
    basis,
    b,
    stufe,
    next,
    pWG,
    pFG,
    pK70,
    prov,
    vers,
    warenkredit,
    minus,
    saldo,
    gesamt: Math.max(0, saldo),
    uebertrag: saldo < 0 ? -saldo : 0,
  };
}
/* Welcher Nettoumsatz ist nötig, um das Wunscheinkommen zu erreichen? (75 % FG / 25 % WG) */
function zielNetto(ziel, weeks) {
  const f = weeks / 4;
  const opts = [{ u: 0, b: 0 }, ...TIERS];
  for (const t of opts) {
    const U = ziel / (1.14 * (0.2 + 0.75 * t.b));
    const fg = U * 0.75;
    const next = TIERS.find((x) => x.u * f > t.u * f);
    if (fg >= t.u * f && (!next || fg < next.u * f)) return U;
  }
  return ziel / (1.14 * (0.2 + 0.75 * 0.12));
}
function restTage(vm, tagePw) {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  if (heute > vm.to || heute < vm.from) return Math.max(1, tagePw * vm.weeks);
  const tage = Math.round((vm.to - heute) / 86400000) + 1;
  return Math.max(1, (tage * tagePw) / 7);
}
/* Alle Vertriebsmonate des Jahres mit Umsatz, Einheiten und Bonusstufe */
function jahresUebersicht(jahr) {
  const vmJetzt = vertriebsmonat(new Date());
  const zeilen = [];
  for (let q = 0; q < 4; q++) {
    [1, 2, 3].forEach((idx) => {
      const startW = q * 13 + (idx === 1 ? 1 : idx === 2 ? 5 : 9);
      const von = mondayOfISOWeek(jahr, startW);
      const vm = vertriebsmonat(von);
      if (vm.startW !== startW) return;
      const u = umsatz(vm.fromK, vm.toK);
      const p = provision(u, vm.weeks);
      let einheiten = 0,
        auftraege = 0;
      Object.keys(entries).forEach((k) => {
        const n = entries[k].nb;
        if (!n || n.fremd === "Ja") return;
        const tag = abrechnungsTag(k.split("|")[0], n);
        if (tag >= vm.fromK && tag <= vm.toK) {
          einheiten += +n.einheiten || 0;
          if (n.verkauft === "Ja") auftraege++;
        }
      });
      const vj = mondayOfISOWeek(jahr - 1, startW);
      const vmV = vertriebsmonat(vj);
      const uV = umsatz(vmV.fromK, vmV.toK);
      let ehV = 0;
      Object.keys(entries).forEach((k) => {
        const n = entries[k].nb;
        if (!n || n.fremd === "Ja") return;
        const tag = abrechnungsTag(k.split("|")[0], n);
        if (tag >= vmV.fromK && tag <= vmV.toK) ehV += +n.einheiten || 0;
      });
      const nach = (nachtrag[jahr] && nachtrag[jahr][startW]) || null;
      const nachV = (nachtrag[jahr - 1] && nachtrag[jahr - 1][startW]) || null;
      /*
       * „ersetzen“ heißt: der nachgetragene Wert gilt, die erfassten Zahlen treten zurück.
       *    Leer gelassene Felder behalten weiterhin den Wert aus der App.
       */
      const mit = (basis, n, feld) => {
        if (!n) return basis;
        const w = n[feld];
        if (w === undefined || w === null || w === "") return basis;
        return n.modus === "ersetzen" ? +w || 0 : basis + (+w || 0);
      };
      zeilen.push({
        nach,
        nachV,
        vorjahrNetto: mit(netto(uV.fg + uV.wg + uV.k70ein), nachV, "umsatz"),
        vorjahrEh: mit(ehV, nachV, "einheiten"),
        startW,
        name: `${q + 1}. Quartal · ${idx}`,
        kw: `${vm.startW}–${vm.endW}`,
        nettoU: mit(netto(u.fg + u.wg + u.k70ein), nach, "umsatz"),
        einheiten: mit(einheiten, nach, "einheiten"),
        auftraege: mit(auftraege, nach, "auftraege"),
        stufe: p.stufe,
        prov: p.prov,
        spanne: `${pad(vm.from.getDate())}.${pad(vm.from.getMonth() + 1)}–${pad(vm.to.getDate())}.${pad(vm.to.getMonth() + 1)}`,
        wochen: vm.weeks,
        kurz: `${q + 1}Q${idx}`,
        aktuell: vm.startW === vmJetzt.startW && jahr === vmJetzt.year,
      });
    });
  }
  return zeilen;
}

/* Monatsziel brutto je Gebiet */
function monatsZiel(vm) {
  if (!(wunsch.einkommen > 0)) return { fg: 0, wg: 0 };
  const U = zielNetto(wunsch.einkommen, vm.weeks);
  return { fg: U * 0.75 * MWST, wg: U * 0.25 * MWST };
}
/* Ampel: liegt der Ist-Wert im Plan für den bisherigen Monatsverlauf? */
function ampelPunkt(ist, ziel, vm) {
  if (!ziel) return "";
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  let anteil = 1;
  if (heute < vm.from) anteil = 0;
  else if (heute <= vm.to) anteil = (Math.round((heute - vm.from) / 86400000) + 1) / (vm.weeks * 7);
  const erwartet = ziel * anteil;
  if (!erwartet) return "";
  const quote = ist / erwartet;
  const farbe = quote >= 1 ? "#7fa88c" : quote >= 0.8 ? "#F2B33D" : "#E0806F";
  const txt = `${Math.round(quote * 100)} % vom Plan bis heute`;
  return `<span class="ampel" style="--a:${farbe}" title="${txt}"></span>`;
}

/* Soll-Werte pro Tag für die Planer-Kennzahlen */
function sollWerte() {
  const vm = vertriebsmonat(monday);
  const out = { fg: 0, wg: 0, k70: 0, k70ein: 0 };
  if (wunsch.einkommen > 0) {
    const U = zielNetto(wunsch.einkommen, vm.weeks);
    const zielFG = U * 0.75 * MWST,
      zielWG = U * 0.25 * MWST;
    const ist = umsatz(vm.fromK, vm.toK);
    const rest = restTage(vm, wunsch.tage || 5);
    out.fg = Math.max(0, zielFG - ist.fg) / rest;
    out.wg = Math.max(0, zielWG - ist.wg) / rest;
  }
  if (settings.bestellrahmen > 0) {
    const proTag = settings.bestellrahmen / Math.max(1, (wunsch.tage || 5) * vm.weeks);
    out.k70 = proTag;
  }
  return out;
}

/*
 * Abgerechneter Festgebietsumsatz aus Nachträgen.
 * Nur für Quartals- und Jahresausgleich; vonK/bisK begrenzen über den Montag des Vertriebsmonats.
 */
function ausgleichNachtrag(jahr, vonK, bisK) {
  const j = nachtrag[jahr];
  if (!j) return 0;
  let summe = 0;
  Object.keys(j).forEach((kw) => {
    const n = j[kw];
    if (!n || !n.fgAbger) return;
    const start = dk(mondayOfISOWeek(jahr, +kw));
    if (start < vonK || start > bisK) return;
    summe += +n.fgAbger || 0;
  });
  return summe;
}
