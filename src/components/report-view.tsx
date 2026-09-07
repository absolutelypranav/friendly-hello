import { AlertTriangle, CheckCircle2, CircleSlash, Download, Printer, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComplianceReport, RuleStatus } from "@/lib/rules";

const STATUS_META: Record<RuleStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  pass: {
    label: "Compliant",
    className: "bg-status-pass text-status-pass-foreground",
    Icon: CheckCircle2,
  },
  fail: {
    label: "Non-compliant",
    className: "bg-status-fail text-status-fail-foreground",
    Icon: XCircle,
  },
  review: {
    label: "Needs review",
    className: "bg-status-review text-status-review-foreground",
    Icon: AlertTriangle,
  },
  manual: {
    label: "Manual check",
    className: "bg-status-manual text-status-manual-foreground",
    Icon: CircleSlash,
  },
};

function StatusPill({ status }: { status: RuleStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        meta.className,
      )}
    >
      <meta.Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

function VerdictBanner({ report }: { report: ComplianceReport }) {
  const verdict =
    report.verdict === "compliant"
      ? { text: "Compliant", tone: "bg-status-pass text-status-pass-foreground", Icon: CheckCircle2 }
      : report.verdict === "non-compliant"
        ? { text: "Non-compliant", tone: "bg-status-fail text-status-fail-foreground", Icon: XCircle }
        : { text: "Needs review", tone: "bg-status-review text-status-review-foreground", Icon: AlertTriangle };

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-lg px-5 py-4", verdict.tone)}>
      <div className="flex items-center gap-3">
        <verdict.Icon className="size-7" />
        <div>
          <p className="text-lg font-semibold leading-tight">{verdict.text}</p>
          <p className="text-xs opacity-90">
            {report.counts.pass} passed · {report.counts.fail} failed · {report.counts.review} to review ·{" "}
            {report.counts.manual} manual
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-bold leading-none tabular-nums">{report.score}%</p>
        <p className="text-[11px] uppercase tracking-widest opacity-90">Compliance score</p>
      </div>
    </div>
  );
}

export function ReportView({ report, onDownload }: { report: ComplianceReport; onDownload: () => void }) {
  return (
    <section aria-label="Compliance report" className="space-y-4">
      <VerdictBanner report={report} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-muted-foreground">
          Extraction confidence {Math.round(report.ocrConfidence)}% · generated{" "}
          {new Date(report.generatedAt).toLocaleString()}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="size-4" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / PDF
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl glass">
        {report.results.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-card-foreground">{r.label}</h3>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {r.ruleRef}
                </p>
              </div>
              <StatusPill status={r.status} />
            </div>
            {r.value ? (
              <p className="mt-2 text-sm text-card-foreground">
                <span className="text-muted-foreground">Extracted: </span>
                <span className="font-medium">{r.value}</span>
              </p>
            ) : null}
            {r.matched ? (
              <p className="mt-2 rounded border border-border bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                “{r.matched}”
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">{r.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
