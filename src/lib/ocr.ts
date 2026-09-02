/**
 * Browser-only OCR pipeline.
 *
 * Nothing in this module may be imported at module scope by a route that is
 * server-rendered: tesseract.js is dynamically imported inside runOcr().
 */

export type OcrProgress = { stage: string; progress: number };

export type OcrResult = {
  text: string;
  confidence: number;
  /** Per-word confidence, when the engine reports it. */
  words: { text: string; confidence: number }[];
};

const MAX_WIDTH = 1600;

/**
 * Load a File/Blob into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image file."));
    img.src = src;
  });
}

/**
 * Canvas pre-processing: downscale, grayscale, contrast stretch and a light
 * adaptive threshold. This is what makes real-world package photos legible
 * to Tesseract.
 */
export async function preprocessImage(objectUrl: string): Promise<string> {
  const img = await loadImage(objectUrl);

  const scale = img.naturalWidth > MAX_WIDTH ? MAX_WIDTH / img.naturalWidth : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return objectUrl;

  ctx.drawImage(img, 0, 0, width, height);

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  // Pass 1: grayscale + histogram
  const histogram = new Array<number>(256).fill(0);
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[p] = g;
    histogram[g]++;
  }

  // Pass 2: contrast stretch between the 2nd and 98th percentile
  const total = width * height;
  const lowCut = total * 0.02;
  const highCut = total * 0.98;
  let acc = 0;
  let low = 0;
  let high = 255;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc >= lowCut) {
      low = v;
      break;
    }
  }
  acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += histogram[v];
    if (acc >= highCut) {
      high = v;
      break;
    }
  }
  const span = Math.max(1, high - low);

  // Pass 3: local (boxed) threshold — soft, so anti-aliased glyph edges survive.
  const box = Math.max(16, Math.round(Math.min(width, height) / 24));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const stretched = Math.max(0, Math.min(255, ((gray[p] - low) / span) * 255));

      // Local mean over a coarse grid cell (cheap approximation of adaptive
      // thresholding, good enough to kill uneven package lighting).
      const cx = Math.min(width - 1, Math.floor(x / box) * box + box / 2);
      const cy = Math.min(height - 1, Math.floor(y / box) * box + box / 2);
      const localRef = gray[Math.round(cy) * width + Math.round(cx)];
      const localStretched = Math.max(0, Math.min(255, ((localRef - low) / span) * 255));

      const bias = stretched - localStretched;
      const out = bias > 6 ? 255 : bias < -6 ? 0 : stretched > 140 ? 255 : stretched < 90 ? 0 : stretched;

      const i = p * 4;
      data[i] = out;
      data[i + 1] = out;
      data[i + 2] = out;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

type WordLike = { text?: string; confidence?: number };

function collectWords(payload: unknown): WordLike[] {
  const out: WordLike[] = [];
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 6) return;
    if (Array.isArray(node)) {
      node.forEach((n) => visit(n, depth + 1));
      return;
    }
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.words)) {
      for (const w of obj.words as WordLike[]) {
        if (w && typeof w.text === "string") out.push(w);
      }
    }
    for (const key of ["blocks", "paragraphs", "lines", "symbols"]) {
      if (Array.isArray(obj[key])) visit(obj[key], depth + 1);
    }
  };
  visit(payload, 0);
  return out;
}

/**
 * Run Tesseract in a worker. Returns raw text plus confidence signals.
 */
export async function runOcr(
  imageSource: string,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (!onProgress) return;
      onProgress({ stage: m.status ?? "working", progress: m.progress ?? 0 });
    },
  });

  try {
    const result = await worker.recognize(imageSource, {}, { text: true, blocks: true });
    const data = result.data as { text?: string; confidence?: number; blocks?: unknown };
    const words = collectWords(data.blocks ?? data).map((w) => ({
      text: String(w.text ?? ""),
      confidence: typeof w.confidence === "number" ? w.confidence : 0,
    }));

    return {
      text: data.text ?? "",
      confidence: typeof data.confidence === "number" ? data.confidence : 0,
      words,
    };
  } finally {
    await worker.terminate();
  }
}
