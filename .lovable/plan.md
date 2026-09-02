# LegalScan — Legal Metrology label compliance checker

A single-page web app for your SIH build: upload a photo of a packaged-commodity label, OCR runs in the browser, and the app returns a rule-by-rule compliance report against the Legal Metrology (Packaged Commodities) Rules, 2011.

Everything runs client-side — no login, no backend, nothing stored. Fully demo-able offline after first load.

## What gets built

**1. Upload & capture**
- Drag-drop / file picker / mobile camera capture for a label photo
- Live image preview with a "Run compliance scan" action
- Progress indicator while OCR runs (Tesseract reports progress per stage)

**2. OCR pipeline (browser, Tesseract.js)**
- Pre-processing on a canvas before OCR: grayscale, contrast stretch, adaptive threshold, and downscale to a sane max width. This is what makes real package photos usable.
- Tesseract run in a Web Worker so the UI stays responsive
- Output: raw text + per-word confidence + word bounding boxes

**3. Declaration extractor**
Regex + keyword extraction over the OCR text for each mandatory declaration:

| Declaration | How it's detected |
|---|---|
| Manufacturer / packer / importer name & full address | "manufactured by / packed by / marketed by / imported by" cues, followed by address block + PIN code (6-digit) |
| Common or generic name of commodity | Largest-text line heuristics + product-name cues |
| Net quantity | Number + unit (g, kg, ml, L, N, pcs) with standard-unit validation |
| Retail sale price | "MRP / M.R.P. / Maximum Retail Price", "Rs./₹/INR", and the mandatory "inclusive of all taxes" phrase |
| Month & year of manufacture / pack / import | "MFG / MFD / PKD / Packed on" + many date formats (MM/YYYY, DD-MM-YYYY, MON YYYY) |
| Best-before / use-by / expiry | "Best before / Use by / EXP" + relative forms ("best before 9 months from packing") |
| Consumer-care details | "Consumer care / Customer care", phone number, email, toll-free |
| Country of origin (imported goods) | "Country of origin" cue |

**4. Compliance report**
- Overall verdict: Compliant / Non-compliant, with a score
- Per-rule cards: Pass / Fail / Needs review, the exact matched text, and the rule reference (e.g. Rule 6(1)(a))
- Validation beyond mere presence: expiry earlier than manufacture date, non-standard unit symbols ("gms", "ltr"), MRP missing the tax-inclusive wording, address without a PIN code
- Low-confidence fields flagged "Needs review" instead of silently failing — important, since OCR is imperfect and a false "compliant" is worse than a flag
- Extracted-text panel with the raw OCR output, editable so a judge/user can correct a misread and re-check instantly
- Download report as JSON, and print/save-as-PDF view

**5. Demo affordances (matters at judging)**
- 2–3 bundled sample label images so the demo never depends on a live camera
- Rules reference page listing each checked declaration and its legal basis

## Honest limits (worth knowing before the demo)

- Browser Tesseract on curved, glossy, or multilingual packages will misread text; the editable-text panel and "Needs review" states are the mitigation. If accuracy becomes the bottleneck at any point, swapping the extraction step to an AI vision model is a contained change — the rule engine stays as-is.
- The rule engine checks declarations that are *readable as text*. Font-height/size compliance and principal-display-panel area rules need physical dimensions, so those are reported as "manual check required" rather than guessed.
- Bulk e-commerce crawling / listing audits are out of scope for this first build.

## Technical notes

- `tesseract.js` added as a dependency; worker + language data loaded lazily on first scan so initial page load stays fast
- Tesseract is browser-only: it's dynamically imported inside the scan handler (never at module scope) so SSR isn't affected
- `src/lib/ocr.ts` — preprocessing + Tesseract invocation
- `src/lib/extract.ts` — pure field extractors (no I/O), so each declaration is independently unit-testable
- `src/lib/rules.ts` — rule definitions, legal references, and the evaluator that turns extracted fields into verdicts
- `src/routes/index.tsx` — upload + report page (replaces the template placeholder); `src/routes/rules.tsx` — rules reference
- Design: clean regulatory/audit aesthetic — high-contrast, tabular, verdict-driven colour semantics (all via design tokens, not hardcoded colours)
- Route metadata set per page for title/description/social preview
