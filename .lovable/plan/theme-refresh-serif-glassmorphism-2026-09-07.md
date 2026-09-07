# Theme refresh: serif + glassmorphism

Replace the current plain white look with a dark, glassmorphic aesthetic and serif display typography. Purely visual — no features, logic, or OCR flow change.

## What changes

1. **Typography**
   - Load a serif display font for headings (**DM Serif Display**) and a clean companion for body text (**Fira Sans**) via `<link>` tags in `src/routes/__root.tsx` head.
   - Register `--font-display` / `--font-sans` tokens in `src/styles.css` and apply display serif to headings/brand text, sans to body.

2. **Color theme (dark glass)**
   - Rework the `:root` tokens in `src/styles.css` to a deep navy/ink background (`oklch` dark base) with light foreground, keeping the existing status colors (pass/fail/review) readable on dark.
   - Translucent card/popover/secondary surfaces: tokens carry alpha (e.g. `oklch(1 0 0 / 8%)`) with light border (`oklch(1 0 0 / 12%)`) so panels read as frosted glass.

3. **Glass surfaces**
   - Add a reusable `glass` utility in `src/styles.css` using standard `backdrop-filter: blur(...)` only (no hand-written vendor prefixes).
   - Apply glass treatment to the header, upload card, report cards, and status panels in `src/components/*` and `src/routes/index.tsx` (swap solid `bg-card` for translucent glass + blur where a panel sits over the background).

4. **Background depth**
   - Subtle ambient backdrop (soft radial color glows on the page background, defined as a CSS token) so the frosted panels have something to refract — no heavy gradients or imagery.

5. **Verification**
   - Visual check of `/` and the report state, light/dark class still valid, `bun run build` passes.

## Scope guardrails

- No changes to OCR/AI vision, rules engine, extraction, routes, or data.
- Status colors keep their meaning (green pass, red fail, amber review).
- Fonts load via `<link>` in the root head — never a remote `@import` in CSS.

## Cost note

This is a small, styling-only change (CSS tokens + font links + class tweaks). I can't guarantee an exact credit figure since build pricing is usage-based, but this is one of the cheapest categories of change.
