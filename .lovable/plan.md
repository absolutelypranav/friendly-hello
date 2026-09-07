# Fix "AI is not configured" on the Vercel deployment

## What's happening

The label reader calls Lovable's AI service, and that call needs a key that lives only inside Lovable's own hosting. When the app is copied out to Vercel, the key doesn't travel with it, so every scan on the live Vercel site stops with "AI scanning is not configured for this project." The preview here keeps working because the key is present here.

The key's value is not viewable or copyable from Lovable, so it cannot simply be pasted into Vercel.

## Two ways forward

### Option A (recommended, no code change): publish with Lovable

Publish the app from Lovable and use that live link (a free `*.lovable.app` address, and a custom domain can be attached). Scanning works immediately because the AI key is already in place there. Nothing to configure, nothing to maintain.

### Option B (keep Vercel): use your own AI key

If the site must stay on Vercel, the app needs to fall back to a key you own:

- Add support for a second key the app reads when Lovable's key is absent.
- You create an API key with an AI provider (for example OpenAI), add it to Vercel as an environment variable, and redeploy.
- Billing for scans then goes to your provider account, not Lovable credits.
- The error message shown when neither key is present will be reworded to explain exactly what to add.

## Technical notes

- `src/lib/scan-label.functions.ts` reads `process.env.LOVABLE_API_KEY` inside the server function and returns the "not configured" result when it is missing; on Vercel that variable is unset.
- Option B adds a provider branch in `src/lib/ai-gateway.server.ts`: use the Lovable gateway when `LOVABLE_API_KEY` exists, otherwise build a direct provider from a user-supplied key (e.g. `OPENAI_API_KEY`) with an equivalent vision-capable model, keeping the same structured-output schema, validation, retries, and report logic untouched.
- No changes to extraction, rules, report, editing, or exports in either option.

## Decision needed

Tell me which option you want. If Option B, also confirm which provider key you'll supply.
