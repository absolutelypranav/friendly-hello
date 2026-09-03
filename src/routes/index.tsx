import { createFileRoute } from "@tanstack/react-router";
import { FileImage, Loader2, RotateCcw, ScanLine, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ReportView } from "@/components/report-view";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { extractDeclarations } from "@/lib/extract";
import { evaluate, type ComplianceReport } from "@/lib/rules";

const SAMPLES = [
  { src: "/samples/label-compliant.png", label: "Compliant snack pack" },
  { src: "/samples/label-noncompliant.png", label: "Missing declarations" },
  { src: "/samples/label-imported.png", label: "Imported package" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LegalScan — check packaged label compliance from a photo" },
      {
        name: "description",
        content:
          "Upload a photo of a food or product label and get an instant rule-by-rule compliance report under the Legal Metrology (Packaged Commodities) Rules, 2011. Runs entirely in your browser.",
      },
      { property: "og:title", content: "LegalScan — check packaged label compliance from a photo" },
      {
        property: "og:description",
        content:
          "Scan a package label, extract every mandatory declaration with OCR, and see which Legal Metrology 2011 requirements pass or fail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

type Phase = "idle" | "preparing" | "reading" | "done";

function ScanPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const analyse = useCallback((ocrText: string, ocrConfidence: number) => {
    const declarations = extractDeclarations(ocrText);
    setReport(evaluate(declarations, ocrConfidence));
  }, []);

  const scan = useCallback(
    async (blobUrl: string) => {
      setPhase("preparing");
      setProgress(0);
      setStage("preparing image");
      setReport(null);
      setText("");

      try {
        const { preprocessImage, runOcr } = await import("@/lib/ocr");
        const prepared = await preprocessImage(blobUrl);

        setPhase("reading");
        const result = await runOcr(prepared, (p) => {
          setStage(p.stage);
          setProgress(Math.round(p.progress * 100));
        });

        setText(result.text.trim());
        setConfidence(result.confidence);
        analyse(result.text, result.confidence);
        setPhase("done");

        if (!result.text.trim()) {
          toast.error("No text could be read from that image. Try a sharper, straight-on photo of the label.");
        }
      } catch (error) {
        console.error(error);
        setPhase("idle");
        toast.error(error instanceof Error ? error.message : "The scan failed. Please try another image.");
      }
    },
    [analyse],
  );

  const acceptFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file (JPG, PNG or WebP).");
        return;
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setImageUrl(url);
      setFileName(file.name);
      void scan(url);
    },
    [scan],
  );

  const useSample = useCallback(
    async (src: string, label: string) => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error("Sample image is unavailable.");
        const blob = await res.blob();
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setImageUrl(url);
        setFileName(label);
        void scan(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load that sample.");
      }
    },
    [scan],
  );

  const busy = phase === "preparing" || phase === "reading";

  const reset = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setImageUrl(null);
    setFileName("");
    setText("");
    setReport(null);
    setConfidence(0);
    setPhase("idle");
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Toaster />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="max-w-2xl print:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Check a package label for Legal Metrology compliance
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Upload or photograph the label of a packaged commodity. Text is read on-device with OCR, every mandatory
            declaration is extracted, and each requirement of the Legal Metrology (Packaged Commodities) Rules, 2011 is
            checked. No image or data ever leaves your browser.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          {/* Left: capture + extracted text */}
          <div className="space-y-4 print:hidden">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) acceptFile(file);
              }}
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                dragging ? "border-primary bg-accent" : "border-border bg-card"
              }`}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Label being checked: ${fileName}`}
                  className="mx-auto max-h-64 w-auto rounded border border-border object-contain"
                />
              ) : (
                <div className="py-6">
                  <FileImage className="mx-auto size-10 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium text-card-foreground">Drop a label photo here</p>
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · processed on your device</p>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) acceptFile(file);
                  e.target.value = "";
                }}
              />

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={() => inputRef.current?.click()} disabled={busy}>
                  <Upload className="size-4" /> {imageUrl ? "Choose another" : "Upload or capture"}
                </Button>
                {imageUrl ? (
                  <Button variant="outline" onClick={reset} disabled={busy}>
                    <RotateCcw className="size-4" /> Clear
                  </Button>
                ) : null}
              </div>
            </div>

            {busy ? (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {phase === "preparing" ? "Preparing image…" : `Reading label — ${stage}`}
                </div>
                <Progress value={phase === "preparing" ? 8 : Math.max(progress, 5)} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">
                  The OCR engine loads once, then stays cached for later scans.
                </p>
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-card-foreground">Extracted text</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                OCR is imperfect. Correct any misread line and re-check — the rules run on this text.
              </p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Text read from the label appears here."
                className="mt-3 h-48 font-mono text-xs"
              />
              <Button
                variant="secondary"
                className="mt-3 w-full"
                disabled={!text.trim() || busy}
                onClick={() => {
                  analyse(text, confidence || 90);
                  toast.success("Compliance re-checked against the edited text.");
                }}
              >
                <ScanLine className="size-4" /> Re-check compliance
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-card-foreground">Sample labels</h2>
              <p className="mt-1 text-xs text-muted-foreground">Try the checker without a camera.</p>
              <div className="mt-3 flex flex-col gap-2">
                {SAMPLES.map((s) => (
                  <Button
                    key={s.src}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    disabled={busy}
                    onClick={() => void useSample(s.src, s.label)}
                  >
                    <FileImage className="size-4" /> {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: report */}
          <div>
            {report ? (
              <ReportView
                report={report}
                onDownload={() => {
                  const blob = new Blob([JSON.stringify({ fileName, text, report }, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "legalscan-report.json";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center print:hidden">
                <ScanLine className="size-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-card-foreground">No report yet</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Scan a label to see each mandatory declaration verified against the Legal Metrology (Packaged
                  Commodities) Rules, 2011.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
