# Replace Tesseract with accurate AI vision extraction

Use English AI vision as the primary label reader while preserving LegalScan’s existing compliance rules, report, editable text, exports, and sample-label flow.

## What will change

1. **Add a secure AI vision extraction service**
   - Activate the project’s managed backend and provision the server-only Lovable AI key.
   - Add a TanStack server function that accepts a resized label image and sends it to `google/gemini-3.1-pro-preview`, a strong multimodal model suited to difficult package-label images.
   - Request strict structured output containing a faithful English transcription, each mandatory declaration, verbatim evidence, normalized values, and field-level confidence/review flags.
   - Keep the key, model instructions, and validation entirely server-side.

2. **Prepare images for vision without damaging text**
   - Replace destructive black/white thresholding with orientation correction and high-quality resizing/compression before upload.
   - Validate image type and size, and preserve the original image preview.

3. **Connect AI results to the existing compliance engine**
   - Convert the validated AI response into the current `Declarations` shape and continue using the existing deterministic Legal Metrology rule evaluator.
   - Populate the editable extracted-text panel from the AI transcription.
   - Keep manual text corrections and local re-checking through the existing regex extractor.
   - Replace OCR-wide confidence wording with AI extraction quality and field-specific “Needs review” handling; never turn uncertain text into a confident pass.

4. **Update scan states and honest product copy**
   - Show clear preparing, securely reading, and evaluating stages instead of Tesseract download progress.
   - Update privacy/offline messaging because the selected image is sent securely for AI analysis and the feature requires internet.
   - Surface the AI Gateway’s exact actionable error message. Retry only rate limits and temporary server failures with bounded backoff; do not retry terminal credit, policy, authentication, or request errors.

5. **Remove the obsolete OCR path**
   - Remove the Tesseract dependency and browser OCR module after the AI flow is connected.
   - Update route metadata that currently claims extraction happens entirely in the browser.

6. **Verify accuracy and regressions**
   - Make a real AI Gateway call through the implemented server path and inspect its response.
   - Test all three bundled labels plus a difficult real-world-style image, checking transcription and every extracted declaration.
   - Verify upload, camera capture, editable re-check, JSON export, print/PDF, failure states, and responsive layout.

## Technical notes

- New client-safe `*.functions.ts` server-function boundary plus a server-only AI provider helper.
- Image input is sent as a correctly typed base64 data URL through Lovable AI; no secret reaches the browser.
- Zod validates both request input and structured model output before the deterministic rule engine receives it.
- No login, scan history, or database persistence will be added.

## Cost and limitation

Each scan uses Lovable AI credits and needs a network connection. This should be substantially more accurate than Tesseract on curved, glossy, low-contrast, and visually cluttered English labels, but low-quality or hidden text will still be flagged for review rather than guessed.