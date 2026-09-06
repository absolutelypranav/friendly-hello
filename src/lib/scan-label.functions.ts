import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

import { createLovableAiProvider } from "./ai-gateway.server";

const ScanInput = z.object({
  imageDataUrl: z
    .string()
    .max(8_000_000)
    .refine((value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value), "Unsupported image format"),
});

const Field = z.object({
  value: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(100),
});

const VisionResult = z.object({
  transcription: z.string(),
  confidence: z.number().min(0).max(100),
  warnings: z.array(z.string()),
  fields: z.object({
    manufacturerOrImporter: Field.nullable(),
    commodityName: Field.nullable(),
    netQuantity: Field.nullable(),
    retailPrice: Field.nullable(),
    manufactureOrPackDate: Field.nullable(),
    bestBeforeOrExpiry: Field.nullable(),
    consumerCare: Field.nullable(),
    countryOfOrigin: Field.nullable(),
    fssai: Field.nullable(),
  }),
});

function errorDetails(error: unknown): { status?: number; message: string } {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const status = typeof record['statusCode'] === "number"
      ? record['statusCode']
      : typeof record['status'] === "number"
        ? record['status']
        : undefined;
    const message = typeof record['message'] === "string" ? record['message'] : "AI label extraction failed.";
    return status === undefined ? { message } : { status, message };
  }
  return { message: "AI label extraction failed." };
}

export const scanLabelWithVision = createServerFn({ method: "POST" })
  .validator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) {
      return { ok: false as const, message: "AI scanning is not configured for this project." };
    }

    try {
      const gateway = createLovableAiProvider(apiKey);
      const result = streamText({
        model: gateway("google/gemini-3.1-pro-preview"),
        maxRetries: 2,
        output: Output.object({
          name: "package_label_reading",
          description: "A faithful English transcription and mandatory packaged-commodity declarations.",
          schema: VisionResult,
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Read this Indian packaged-commodity label with maximum precision.",
                  "Transcribe every visible English character faithfully, preserving line breaks and original spelling.",
                  "Do not invent hidden, blurred, cropped, or unreadable text. Mark uncertain fragments as [unclear].",
                  "Extract the listed declarations separately. Evidence must be verbatim text visible in the image.",
                  "Use an empty warnings array when there are no image-quality concerns.",
                  "Confidence is 0-100 and must reflect legibility, glare, curvature, blur, and cropping—not optimism.",
                ].join(" "),
              },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });

      const output = await result.output;
      return { ok: true as const, ...output };
    } catch (error) {
      const { status, message } = errorDetails(error);
      if (status === 401) return { ok: false as const, message: "AI scanning is not configured correctly." };
      if (status === 402 || status === 403 || status === 400 || status === 429 || (status && status >= 500)) {
        return { ok: false as const, message };
      }
      return { ok: false as const, message };
    }
  });