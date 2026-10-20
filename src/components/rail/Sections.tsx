import { Link } from "@tanstack/react-router";
import { ArrowRight, Route as RouteIcon, IndianRupee, Timer, Boxes, Scale, FileDown, MapPinned, SlidersHorizontal, BarChart3, Leaf, Truck, Building2, Server, Network, Cpu, Database } from "lucide-react";
import { SiteHeader, SiteFooter, DisclaimerBar } from "@/components/rail/SiteChrome";
import { RouteMap } from "@/components/rail/RouteMap";
import { SamplePreviewDialog } from "@/components/rail/SamplePreviewDialog";
import { optimizeRoutes } from "@/lib/rail/optimizer";
import { formatInr } from "@/lib/rail/api";

const preview = optimizeRoutes({ origin: "delhi", destination: "mumbai", cargo: "cement", tonnes: 1200, wagonPref: "open" })!;

export const FEATURES = [
  { icon: RouteIcon, title: "Multi-route search", text: "Explores alternative corridors across a sample rail network graph." },
  { icon: IndianRupee, title: "Cost-aware planning", text: "Estimates haulage and transfer handling per tonne in INR." },
  { icon: Timer, title: "Transit time estimates", text: "Accounts for segment speeds, halts and corridor transfers." },
  { icon: Boxes, title: "Wagon recommendations", text: "Matches cargo to suitable wagon types and estimates rake size." },
  { icon: Scale, title: "Balanced scoring", text: "Ranks routes on a normalized blend of cost and time." },
  { icon: FileDown, title: "Printable reports", text: "Export or print a summary of the selected route plan." },
];

export const STEPS = [
  { icon: SlidersHorizontal, title: "Enter shipment", text: "Origin, destination, cargo type, tonnage and wagon preference." },
  { icon: Network, title: "Compare routes", text: "We score every candidate path for cost, time and transfers." },
  { icon: BarChart3, title: "Pick & export", text: "Choose Lowest Cost, Fastest or Balanced and export the plan." },
];

export const IMPACT = [
  { icon: IndianRupee, title: "Lower logistics cost", text: "Helps shippers see cheaper corridor options before booking." },
  { icon: Leaf, title: "Modal shift to rail", text: "Clear comparisons can make rail more attractive than road." },
  { icon: Truck, title: "Better rake utilisation", text: "Right-sized wagon counts reduce empty or overloaded movements." },
  { icon: Building2, title: "Planner productivity", text: "Faster what-if analysis for freight and terminal teams." },
];

const TECH = [
  { icon: Cpu, title: "Today", items: ["React + TypeScript front end", "Sample network graph (21 stations)", "Deterministic client-side scoring"] },
  { icon: Server, title: "Next", items: ["Python/FastAPI optimization service", "Validated cost & tariff model", "OR-Tools / MILP route solver"] },
  { icon: Database, title: "Later", items: ["Real rail-network graph integration", "Historical transit-time learning", "Multi-consignment rake planning"] },
];


export function HeroSection() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero text-navy-foreground">
        <div className="absolute inset-0 grid-lines" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-navy-border px-3 py-1 text-xs text-navy-muted">
              <MapPinned className="h-3.5 w-3.5 text-cyan" /> Freight planning prototype
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Smarter Freight. <span className="text-cyan">Optimized Routes.</span> Better Rail Logistics.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-muted">
              RailOpt AI compares freight corridors across Indian Railways by estimated cost, transit time and transfers — and recommends the right wagons for your cargo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/optimizer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground shadow-glow transition hover:brightness-110">
                Optimize My Route <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/features" className="inline-flex items-center rounded-lg border border-navy-border px-5 py-3 font-medium text-navy-foreground transition hover:bg-navy-2">
                Explore Features
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-navy-border bg-navy/70 p-4 shadow-glow backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">Delhi → Mumbai · Cement 1,200 t</span>
              <SamplePreviewDialog result={preview} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <RouteMap dark className="h-72 w-full" routes={[
                { stops: preview.best.cost.stops, tone: "cost" },
                { stops: preview.best.fast.stops, tone: "fast" },
                { stops: preview.best.balanced.stops, tone: "balanced", active: true },
              ]} />
              <div className="space-y-2">
                {([["cost", "Lowest Cost", "text-cost"], ["fast", "Fastest", "text-fast"], ["balanced", "Balanced", "text-balanced"]] as const).map(([k, l, c]) => (
                  <div key={k} className="rounded-lg border border-navy-border bg-navy-2 p-3">
                    <div className={`text-xs font-medium ${c}`}>{l}</div>
                    <div className="font-mono text-sm">{formatInr(preview.best[k].costInr)}</div>
                    <div className="text-xs text-navy-muted">{preview.best[k].hours} h · {preview.best[k].distanceKm} km</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
export function FeaturesSection() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="Features" title="Everything a freight planner needs for a first-pass plan" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-card">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
export function HowSection() {
  return (
    <>
      <section className="scroll-mt-20 border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="How It Works" title="Three steps from shipment to route plan" />
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border bg-background p-6">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <s.icon className="mt-3 h-6 w-6 text-foreground" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
export function ImpactSection() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="Intended Impact" title="Where better route planning can help" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IMPACT.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-card">
              <f.icon className="h-6 w-6 text-success" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Intended outcomes for a production version — not measured results.</p>
      </section>
    </>
  );
}
export function TechSection() {
  return (
    <>
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-10">
            <p className="text-sm font-medium text-cyan">Technology & Scalability</p>
            <h2 className="mt-2 text-3xl font-semibold">Built to grow from prototype to platform</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TECH.map((t) => (
              <div key={t.title} className="rounded-xl border border-navy-border bg-navy-2 p-6">
                <t.icon className="h-6 w-6 text-cyan" />
                <h3 className="mt-3 font-semibold">{t.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-navy-muted">
                  {t.items.map((i) => <li key={i}>• {i}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl text-navy-foreground"><DisclaimerBar /></div>
            <Link to="/optimizer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground">
              Optimize My Route <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-semibold">{title}</h2>
    </div>
  );
}
