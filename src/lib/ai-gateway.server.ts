import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    supportsStructuredOutputs: true,
  });
}

function createDirectOpenAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai-direct",
    baseURL: "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    supportsStructuredOutputs: true,
  });
}

/**
 * Resolves the vision model to use.
 *
 * Preference order:
 *  1. Lovable AI (LOVABLE_API_KEY) — present on Lovable hosting and in preview.
 *  2. A user-supplied OpenAI key (OPENAI_API_KEY) — used for self-hosted
 *     deployments such as Vercel, where the Lovable key is not available.
 */
export function resolveVisionModel() {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  if (lovableKey) {
    return { ok: true as const, model: createLovableAiProvider(lovableKey)("google/gemini-3.1-pro-preview") };
  }

  const openAiKey = process.env['OPENAI_API_KEY'];
  if (openAiKey) {
    return { ok: true as const, model: createDirectOpenAiProvider(openAiKey)("gpt-4o") };
  }

  return {
    ok: false as const,
    message:
      "AI scanning is not configured on this deployment. Publish the app from Lovable, or add an OPENAI_API_KEY environment variable to your hosting provider and redeploy.",
  };
}
