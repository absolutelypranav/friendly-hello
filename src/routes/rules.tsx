import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { RULE_CATALOGUE } from "@/lib/rules";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules checked — LegalScan label compliance" },
      {
        name: "description",
        content:
          "Every mandatory declaration LegalScan checks under the Legal Metrology (Packaged Commodities) Rules, 2011, with the rule reference for each.",
      },
      { property: "og:title", content: "Rules checked — LegalScan label compliance" },
      {
        property: "og:description",
        content:
          "Mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011 and how each is verified from a label photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Rules checked</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          LegalScan evaluates each declaration below against the text read from the label image. Declarations that
          depend on the physical package (print height, panel area) are reported as manual checks rather than guessed.
        </p>

        <ol className="mt-8 space-y-3">
          {RULE_CATALOGUE.map((rule, i) => (
            <li key={rule.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-card-foreground">{rule.label}</h2>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {rule.ruleRef}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-xs text-muted-foreground">
          Reference: Legal Metrology (Packaged Commodities) Rules, 2011, as amended. This tool is a screening aid — a
          verdict here is not a legal determination.
        </p>
      </main>
    </div>
  );
}
