import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass border-x-0 border-t-0 rounded-none print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <ScanLine className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base tracking-tight">Project Metro Scan</span>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
              OUR HACKATHON PROJECT (PROTOTYPE)
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
