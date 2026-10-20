import { Link } from "@tanstack/react-router";
import { TrainFront, Menu, X, Info } from "lucide-react";
import { useState } from "react";
import { DISCLAIMER } from "@/lib/rail/api";

const NAV: { label: string; to: "/" | "/features" | "/how-it-works" | "/impact" }[] = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Impact", to: "/impact" },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-navy-foreground">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <TrainFront className="h-4 w-4" />
      </span>
      RailOpt <span className="text-cyan">AI</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-navy-border bg-navy/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} activeProps={{ className: "text-navy-foreground" }} className="text-sm text-navy-muted transition-colors hover:text-navy-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/optimizer" className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:brightness-110 sm:inline-flex">
            Open Optimizer
          </Link>
          <button aria-label="Toggle menu" onClick={() => setOpen((o) => !o)} className="rounded-md p-2 text-navy-foreground md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-navy-border px-4 py-3 md:hidden">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} activeProps={{ className: "text-navy-foreground" }} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 text-sm text-navy-muted hover:text-navy-foreground">
              {n.label}
            </Link>
          ))}
          <Link to="/optimizer" onClick={() => setOpen(false)} className="mt-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
            Open Optimizer
          </Link>
        </nav>
      )}
    </header>
  );
}

export function DisclaimerBar() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>{DISCLAIMER}</span>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-navy-border bg-navy text-navy-muted">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xl text-sm">
            Hackathon prototype exploring cost-aware freight route planning for Indian Railways. {DISCLAIMER} Not affiliated with or endorsed by Indian Railways.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <Link to="/" className="hover:text-navy-foreground">Home</Link>
          <Link to="/optimizer" className="hover:text-navy-foreground">Optimizer</Link>
          <Link to="/features" className="hover:text-navy-foreground">Features</Link>
        </div>
      </div>
    </footer>
  );
}
