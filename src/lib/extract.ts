/**
 * Pure declaration extractors over transcribed label text.
 *
 * No I/O, no DOM: every function here takes text and returns structured
 * findings, so each declaration can be reasoned about (and tested) alone.
 */

export type Finding<T = string> = {
  /** Normalised value. */
  value: T;
  /** The exact text matched in the label, for display as evidence. */
  matched: string;
};

export type Declarations = {
  manufacturer: Finding & { role: string; pin: string | null } | null;
  commodityName: Finding | null;
  netQuantity: (Finding & { quantity: number; unit: string; standardUnit: boolean }) | null;
  retailPrice: (Finding & { amount: number; taxInclusive: boolean }) | null;
  manufactureDate: (Finding & { date: Date | null }) | null;
  bestBefore: (Finding & { date: Date | null; relative: boolean }) | null;
  consumerCare: (Finding & { phone: string | null; email: string | null }) | null;
  countryOfOrigin: Finding | null;
  fssai: Finding | null;
  importer: boolean;
};

/** Normalise transcribed text: collapse odd whitespace, keep line structure. */
export function normalise(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function toYear(y: string): number {
  const n = Number(y);
  if (y.length <= 2) return n + (n > 70 ? 1900 : 2000);
  return n;
}

/** Parse the date formats that actually show up on Indian packages. */
export function parseLabelDate(raw: string): Date | null {
  const s = raw.toLowerCase().replace(/[.]/g, "/");

  // DD/MM/YYYY or MM/YYYY
  const numeric = s.match(/\b(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})\b/);
  if (numeric) {
    const d = Number(numeric[1]);
    const m = Number(numeric[2]);
    const y = toYear(numeric[3]!);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d);
  }
  const monthYear = s.match(/\b(\d{1,2})\s*[/-]\s*(\d{4})\b/);
  if (monthYear) {
    const m = Number(monthYear[1]);
    if (m >= 1 && m <= 12) return new Date(Number(monthYear[2]), m - 1, 1);
  }

  // MON YYYY / DD MON YYYY
  const named = s.match(/\b(\d{1,2})?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[,'\s/-]*\s*(\d{2,4})\b/);
  if (named) {
    const m = MONTHS[named[2]!];
    if (m !== undefined) return new Date(toYear(named[3]!), m, named[1] ? Number(named[1]) : 1);
  }
  return null;
}

function lineAfter(lines: string[], index: number): string {
  return lines.slice(index, index + 4).join(" ");
}

export function extractManufacturer(text: string) {
  const lines = text.split("\n");
  const cues = /\b(manufactured\s*(&|and)?\s*(packed)?\s*by|mfd\.?\s*by|mfg\.?\s*by|packed\s*by|marketed\s*by|imported\s*(&|and)?\s*(marketed)?\s*by|manufacturer)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!cues.test(line)) continue;
    const block = lineAfter(lines, i);
    const pin = block.match(/\b([1-9]\d{5})\b/);
    const roleMatch = line.match(cues);
    return {
      value: block.replace(/\s+/g, " ").trim(),
      matched: block.replace(/\s+/g, " ").trim(),
      role: (roleMatch?.[0] ?? "manufacturer").toLowerCase(),
      pin: pin ? pin[1]! : null,
    };
  }
  return null;
}

export function extractCommodityName(text: string) {
  const lines = text.split("\n");
  const cue = lines.find((l) => /\b(common\s*name|product\s*name|commodity|generic\s*name|name\s*of\s*(the\s*)?(product|commodity))\b/i.test(l));
  if (cue) {
    const value = cue.replace(/^.*?(:|-)\s*/, "").trim() || cue.trim();
    return { value, matched: cue.trim() };
  }
  // Fall back to the first substantial alphabetic line (usually the brand /
  // product name printed largest on the principal display panel).
  const candidate = lines.find(
    (l) => /^[A-Za-z][A-Za-z\s&'().-]{3,40}$/.test(l) && !/\b(mfg|mrp|net|batch|best|www|india)\b/i.test(l),
  );
  return candidate ? { value: candidate.trim(), matched: candidate.trim() } : null;
}

const STANDARD_UNITS = new Set(["g", "kg", "mg", "ml", "l", "cm", "m", "mm", "n", "u"]);

export function extractNetQuantity(text: string) {
  const re = /\b(net\s*(qty\.?|quantity|weight|wt\.?|vol(ume)?\.?|content[s]?)\s*[:\-]?\s*)?(\d+(?:[.,]\d+)?)\s*(kgs?|kg|gms?|gm|grams?|g|mg|mls?|ml|litres?|liters?|ltr?s?|l|pcs?|pieces?|nos?\.?|n|u)\b/gi;
  let best: { value: string; matched: string; quantity: number; unit: string; standardUnit: boolean } | null = null;

  for (const m of text.matchAll(re)) {
    const labelled = Boolean(m[1]);
    const quantity = Number(m[4]!.replace(",", "."));
    const rawUnit = m[5]!.toLowerCase();
    const canonical =
      /^(kgs?|kg)$/.test(rawUnit) ? "kg"
      : /^(gms?|gm|grams?|g)$/.test(rawUnit) ? "g"
      : rawUnit === "mg" ? "mg"
      : /^(mls?|ml)$/.test(rawUnit) ? "ml"
      : /^(litres?|liters?|ltr?s?|l)$/.test(rawUnit) ? "l"
      : /^(pcs?|pieces?|nos?\.?|n|u)$/.test(rawUnit) ? "N"
      : rawUnit;
    const standardUnit = STANDARD_UNITS.has(canonical.toLowerCase());
    const finding = {
      value: `${quantity} ${canonical}`,
      matched: m[0].trim(),
      quantity,
      unit: rawUnit,
      standardUnit,
    };
    if (labelled) return finding;
    if (!best) best = finding;
  }
  return best;
}

export function extractRetailPrice(text: string) {
  const re = /\b(m\.?\s?r\.?\s?p\.?|maximum\s*retail\s*price|retail\s*sale\s*price)\b[^\n]{0,60}/gi;
  const flat = text.replace(/\n/g, " ");
  for (const m of text.matchAll(re)) {
    const segment = m[0];
    const amount = segment.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (!amount) continue;
    const taxInclusive = /incl(?:usive|\.)?\s*(of)?\s*all\s*tax(es)?/i.test(flat);
    return {
      value: `Rs. ${amount[1]}`,
      matched: segment.trim(),
      amount: Number(amount[1]!.replace(",", ".")),
      taxInclusive,
    };
  }
  return null;
}

function findDated(text: string, cue: RegExp) {
  const flat = text.split("\n");
  let fallback: { matched: string; date: Date | null } | null = null;

  for (let i = 0; i < flat.length; i++) {
    const line = flat[i]!;
    if (!cue.test(line)) continue;
    const window = flat.slice(i, i + 2).join(" ");
    const at = window.search(cue);
    const segment = window.slice(at >= 0 ? at : 0, at >= 0 ? at + 120 : 120);
    const candidate = { matched: segment.trim(), date: parseLabelDate(segment) };
    // Prefer the first cue whose neighbourhood actually contains a date; a
    // bare cue word ("Manufactured by") must not win over "MFG 04/2026".
    if (candidate.date) return candidate;
    if (!fallback) fallback = candidate;
  }
  return fallback;
}

export function extractManufactureDate(text: string) {
  const hit = findDated(text, /\b(mfg|mfd|pkd|packed\s*on|manufactur\w*\s*(date|on)|date\s*of\s*(manufacture|packing|import)|month\s*(&|and)?\s*year\s*of\s*(manufacture|packing|import))\b/i);
  if (!hit) return null;
  return { value: hit.date ? hit.date.toISOString().slice(0, 10) : hit.matched, matched: hit.matched, date: hit.date };
}

export function extractBestBefore(text: string) {
  const hit = findDated(text, /\b(best\s*before|use\s*by|expiry|exp\.?\s*date|expires|consume\s*before)\b/i);
  if (!hit) return null;
  const relative = /\b(\d{1,2})\s*(months?|days?|years?)\s*(from|of)\b/i.test(hit.matched);
  return {
    value: hit.date ? hit.date.toISOString().slice(0, 10) : hit.matched,
    matched: hit.matched,
    date: hit.date,
    relative,
  };
}

export function extractConsumerCare(text: string) {
  const flat = text.replace(/\n/g, " ");
  const email = flat.match(/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/);
  const phone = flat.match(/(?:\+91[\s-]?)?(?:1800[\s-]?\d{3}[\s-]?\d{3,4}|0?\d{2,4}[\s-]?\d{6,8}|\d{10})/);
  const cue = flat.match(/\b(consumer\s*(care|complaints?)|customer\s*(care|service)|for\s*(any\s*)?(queries|complaints|feedback)|toll\s*free)\b[^\n]{0,80}/i);
  if (!cue && !email) return null;
  return {
    value: [phone?.[0], email?.[0]].filter(Boolean).join(" · ") || (cue?.[0] ?? ""),
    matched: (cue?.[0] ?? email?.[0] ?? phone?.[0] ?? "").trim(),
    phone: phone ? phone[0].trim() : null,
    email: email ? email[0].trim() : null,
  };
}

export function extractCountryOfOrigin(text: string) {
  const m = text.match(/\bcountry\s*of\s*origin\s*[:\-]?\s*([A-Za-z ]{3,30})/i);
  if (m) return { value: m[1]!.trim(), matched: m[0].trim() };
  const made = text.match(/\bmade\s*in\s+([A-Za-z ]{3,30})/i);
  return made ? { value: made[1]!.trim(), matched: made[0].trim() } : null;
}

export function extractFssai(text: string) {
  const m = text.match(/\b(fssai|lic(?:ense)?\.?\s*no\.?)\s*[:\-]?\s*(\d{12,14})\b/i);
  return m ? { value: m[2]!, matched: m[0].trim() } : null;
}

export function extractDeclarations(rawText: string): Declarations {
  const text = normalise(rawText);
  return {
    manufacturer: extractManufacturer(text),
    commodityName: extractCommodityName(text),
    netQuantity: extractNetQuantity(text),
    retailPrice: extractRetailPrice(text),
    manufactureDate: extractManufactureDate(text),
    bestBefore: extractBestBefore(text),
    consumerCare: extractConsumerCare(text),
    countryOfOrigin: extractCountryOfOrigin(text),
    fssai: extractFssai(text),
    importer: /\bimport(ed|er)\b/i.test(text),
  };
}
