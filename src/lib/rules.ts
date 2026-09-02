/**
 * Rule engine for the Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * Each rule turns extracted declarations into a verdict plus the evidence text
 * that justified it. Nothing here touches the DOM or the network.
 */

import type { Declarations } from "./extract";

export type RuleStatus = "pass" | "fail" | "review" | "manual";

export type RuleResult = {
  id: string;
  label: string;
  /** Legal basis, shown next to each verdict. */
  ruleRef: string;
  status: RuleStatus;
  /** Extracted value, when found. */
  value?: string;
  /** Verbatim label text that produced the verdict. */
  matched?: string;
  note: string;
};

export type ComplianceReport = {
  verdict: "compliant" | "non-compliant" | "needs-review";
  score: number;
  counts: Record<RuleStatus, number>;
  results: RuleResult[];
  ocrConfidence: number;
  generatedAt: string;
};

export const RULE_CATALOGUE: { id: string; label: string; ruleRef: string; description: string }[] = [
  {
    id: "manufacturer",
    label: "Name & complete address of manufacturer / packer / importer",
    ruleRef: "Rule 6(1)(a)",
    description:
      "The name and complete address of the manufacturer, packer or importer must be declared, including a postal PIN code.",
  },
  {
    id: "commodity",
    label: "Common or generic name of the commodity",
    ruleRef: "Rule 6(1)(b)",
    description: "The package must state the common or generic name of the commodity contained in it.",
  },
  {
    id: "netQuantity",
    label: "Net quantity in standard units",
    ruleRef: "Rule 6(1)(d) & Rule 8",
    description:
      "Net quantity must be declared in standard weight, measure or number — using the correct unit symbols (g, kg, ml, l, N).",
  },
  {
    id: "retailPrice",
    label: "Retail sale price, inclusive of all taxes",
    ruleRef: "Rule 6(1)(e) & Rule 2(r)",
    description:
      "The maximum retail price must be declared as 'MRP Rs. ___ inclusive of all taxes'.",
  },
  {
    id: "manufactureDate",
    label: "Month & year of manufacture / packing / import",
    ruleRef: "Rule 6(1)(c)",
    description: "The month and year in which the commodity was manufactured, packed or imported must be declared.",
  },
  {
    id: "bestBefore",
    label: "Best before / use by date",
    ruleRef: "Rule 6(1)(c) proviso",
    description: "Where applicable, the 'best before' or 'use by' date must be declared.",
  },
  {
    id: "consumerCare",
    label: "Consumer care details",
    ruleRef: "Rule 6(1)(f)",
    description:
      "Name, address, telephone number and e-mail address of the person who can be contacted for consumer complaints.",
  },
  {
    id: "countryOfOrigin",
    label: "Country of origin (imported packages)",
    ruleRef: "Rule 6(10)",
    description: "Imported packages must declare the country of origin of the commodity.",
  },
  {
    id: "dateConsistency",
    label: "Date consistency (expiry after manufacture)",
    ruleRef: "Rule 6(1)(c)",
    description: "A declared best-before date must fall after the declared date of manufacture or packing.",
  },
  {
    id: "declarationLegibility",
    label: "Print size, contrast & principal display panel area",
    ruleRef: "Rule 7 & Rule 9",
    description:
      "Minimum height of numerals and letters, and the area of the principal display panel, depend on the physical package size — verify manually.",
  },
];

function ok(id: string, note: string, value?: string, matched?: string): RuleResult {
  const meta = RULE_CATALOGUE.find((r) => r.id === id)!;
  return { id, label: meta.label, ruleRef: meta.ruleRef, status: "pass", note, ...(value ? { value } : {}), ...(matched ? { matched } : {}) };
}
function bad(id: string, note: string, matched?: string): RuleResult {
  const meta = RULE_CATALOGUE.find((r) => r.id === id)!;
  return { id, label: meta.label, ruleRef: meta.ruleRef, status: "fail", note, ...(matched ? { matched } : {}) };
}
function review(id: string, note: string, value?: string, matched?: string): RuleResult {
  const meta = RULE_CATALOGUE.find((r) => r.id === id)!;
  return { id, label: meta.label, ruleRef: meta.ruleRef, status: "review", note, ...(value ? { value } : {}), ...(matched ? { matched } : {}) };
}
function manual(id: string, note: string): RuleResult {
  const meta = RULE_CATALOGUE.find((r) => r.id === id)!;
  return { id, label: meta.label, ruleRef: meta.ruleRef, status: "manual", note };
}

export function evaluate(d: Declarations, ocrConfidence: number): ComplianceReport {
  const results: RuleResult[] = [];

  // Rule 6(1)(a) — manufacturer identity and address
  if (!d.manufacturer) {
    results.push(bad("manufacturer", "No 'manufactured by / packed by / imported by' declaration was found on the label."));
  } else if (!d.manufacturer.pin) {
    results.push(
      review(
        "manufacturer",
        "A manufacturer declaration was found, but no 6-digit PIN code could be read — the address may be incomplete or misread.",
        d.manufacturer.value,
        d.manufacturer.matched,
      ),
    );
  } else {
    results.push(ok("manufacturer", `Declared with PIN ${d.manufacturer.pin}.`, d.manufacturer.value, d.manufacturer.matched));
  }

  // Rule 6(1)(b) — commodity name
  if (!d.commodityName) {
    results.push(bad("commodity", "No common or generic name of the commodity could be identified."));
  } else {
    results.push(
      review(
        "commodity",
        "A likely product name was detected. Confirm it is the common or generic name of the commodity, not only a brand name.",
        d.commodityName.value,
        d.commodityName.matched,
      ),
    );
  }

  // Rule 6(1)(d) & Rule 8 — net quantity
  if (!d.netQuantity) {
    results.push(bad("netQuantity", "No net quantity declaration was found."));
  } else if (!d.netQuantity.standardUnit) {
    results.push(
      bad(
        "netQuantity",
        `Unit '${d.netQuantity.unit}' is not a standard unit symbol. Use g, kg, ml, l or N as prescribed.`,
        d.netQuantity.matched,
      ),
    );
  } else {
    results.push(ok("netQuantity", "Declared in a standard unit.", d.netQuantity.value, d.netQuantity.matched));
  }

  // Rule 6(1)(e) — retail sale price
  if (!d.retailPrice) {
    results.push(bad("retailPrice", "No maximum retail price declaration was found."));
  } else if (!d.retailPrice.taxInclusive) {
    results.push(
      bad(
        "retailPrice",
        "MRP is declared but the mandatory wording 'inclusive of all taxes' was not found on the label.",
        d.retailPrice.matched,
      ),
    );
  } else {
    results.push(
      ok("retailPrice", "Declared with 'inclusive of all taxes' wording.", d.retailPrice.value, d.retailPrice.matched),
    );
  }

  // Rule 6(1)(c) — month & year of manufacture
  if (!d.manufactureDate) {
    results.push(bad("manufactureDate", "No date of manufacture, packing or import was found."));
  } else if (!d.manufactureDate.date) {
    results.push(
      review(
        "manufactureDate",
        "A manufacture/packing cue was found but the date could not be parsed reliably — check the extracted text.",
        d.manufactureDate.value,
        d.manufactureDate.matched,
      ),
    );
  } else {
    results.push(
      ok("manufactureDate", "Month and year of manufacture/packing declared.", d.manufactureDate.value, d.manufactureDate.matched),
    );
  }

  // Best before / use by
  if (!d.bestBefore) {
    results.push(
      review(
        "bestBefore",
        "No best-before or use-by declaration was found. Mandatory for food and other perishable commodities; not required for every commodity.",
      ),
    );
  } else if (!d.bestBefore.date && d.bestBefore.relative) {
    results.push(
      ok("bestBefore", "Declared in relative form (e.g. 'best before N months from packing'), which is permitted.", d.bestBefore.value, d.bestBefore.matched),
    );
  } else if (!d.bestBefore.date) {
    results.push(
      review("bestBefore", "A best-before cue was found but no date could be parsed.", d.bestBefore.value, d.bestBefore.matched),
    );
  } else {
    results.push(ok("bestBefore", "Best-before / use-by date declared.", d.bestBefore.value, d.bestBefore.matched));
  }

  // Rule 6(1)(f) — consumer care
  if (!d.consumerCare) {
    results.push(bad("consumerCare", "No consumer care contact (name, phone or e-mail) was found."));
  } else if (!d.consumerCare.phone || !d.consumerCare.email) {
    results.push(
      review(
        "consumerCare",
        `Partial consumer care details found (${d.consumerCare.phone ? "phone" : "no phone"}, ${d.consumerCare.email ? "e-mail" : "no e-mail"}). The rule expects both a telephone number and an e-mail address.`,
        d.consumerCare.value,
        d.consumerCare.matched,
      ),
    );
  } else {
    results.push(ok("consumerCare", "Telephone and e-mail contact declared.", d.consumerCare.value, d.consumerCare.matched));
  }

  // Rule 6(10) — country of origin, only for imported packages
  if (d.countryOfOrigin) {
    results.push(ok("countryOfOrigin", "Country of origin declared.", d.countryOfOrigin.value, d.countryOfOrigin.matched));
  } else if (d.importer) {
    results.push(bad("countryOfOrigin", "The label mentions import, but no country of origin declaration was found."));
  } else {
    results.push(manual("countryOfOrigin", "No import indication detected — applicable only to imported packages."));
  }

  // Cross-field date sanity
  const mfg = d.manufactureDate?.date ?? null;
  const exp = d.bestBefore?.date ?? null;
  if (mfg && exp) {
    if (exp.getTime() > mfg.getTime()) {
      results.push(ok("dateConsistency", "Best-before date falls after the date of manufacture."));
    } else {
      results.push(
        bad("dateConsistency", "The declared best-before date is not later than the date of manufacture/packing.", `${d.manufactureDate?.matched} / ${d.bestBefore?.matched}`),
      );
    }
  } else {
    results.push(manual("dateConsistency", "Both dates must be readable before consistency can be checked."));
  }

  // Physical print-size rules cannot be judged from an image alone
  results.push(
    manual(
      "declarationLegibility",
      "Requires the physical package dimensions (print height in mm relative to panel area). Verify against Rule 7 and Rule 9 by hand.",
    ),
  );

  // Low OCR confidence should never produce a confident PASS.
  const finalResults =
    ocrConfidence > 0 && ocrConfidence < 65
      ? results.map((r) =>
          r.status === "pass"
            ? { ...r, status: "review" as RuleStatus, note: `${r.note} (OCR confidence was low — verify the extracted text.)` }
            : r,
        )
      : results;

  const counts: Record<RuleStatus, number> = { pass: 0, fail: 0, review: 0, manual: 0 };
  for (const r of finalResults) counts[r.status]++;

  const applicable = counts.pass + counts.fail + counts.review;
  const score = applicable === 0 ? 0 : Math.round(((counts.pass + counts.review * 0.5) / applicable) * 100);
  const verdict: ComplianceReport["verdict"] =
    counts.fail > 0 ? "non-compliant" : counts.review > 0 ? "needs-review" : "compliant";

  return {
    verdict,
    score,
    counts,
    results: finalResults,
    ocrConfidence,
    generatedAt: new Date().toISOString(),
  };
}
