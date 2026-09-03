import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScanLine className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">LegalScan</span>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
              Packaged Commodities Rules, 2011
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Scan
          </Link>
          <Link
            to="/rules"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Rules checked
          </Link>
        </nav>
      </div>
    </header>
  );
}
