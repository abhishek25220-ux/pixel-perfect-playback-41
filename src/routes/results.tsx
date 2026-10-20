import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { IndianRupee, Timer, Ruler, Repeat, Boxes, Printer, Download, ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { SiteHeader, SiteFooter, DisclaimerBar } from "@/components/rail/SiteChrome";
import { RouteMap } from "@/components/rail/RouteMap";
import { WhatIfSimulator } from "@/components/rail/WhatIfSimulator";
import { DisruptionSimulator } from "@/components/rail/DisruptionSimulator";
import { optimizeRoutes, stationName, validateInput, type RouteOption, type Strategy } from "@/lib/rail/optimizer";
import { CARGO_LABEL, WAGON_LABEL } from "@/lib/rail/cargo";
import { DISCLAIMER, formatInr, formatNum } from "@/lib/rail/api";
import { parseSearch } from "@/lib/rail/search";
import { BALANCED_WEIGHTS } from "@/lib/rail/optimizer";
import { checkRoute, explainStrategy, feasibility } from "@/lib/rail/explain";
import { EmissionsComparison } from "@/components/rail/EmissionsComparison";
import { compareEmissions, emissionsCsvCells, emissionsCsvNote } from "@/lib/rail/emissions";

export const Route = createFileRoute("/results")({
  validateSearch: parseSearch,
  head: () => ({
    meta: [
      { title: "Route Comparison — RailOpt AI" },
      { name: "description", content: "Compare lowest-cost, fastest and balanced freight rail routes with cost, time and wagon estimates." },
      { property: "og:title", content: "Route Comparison — RailOpt AI" },
      { property: "og:description", content: "Side-by-side comparison of illustrative freight rail route options." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Results,
});

const META: Record<Strategy, { label: string; tagline: string; text: string; border: string; bg: string }> = {
  cost: { label: "Lowest Cost", tagline: "Minimises estimated freight cost", text: "text-cost", border: "border-cost", bg: "bg-cost" },
  fast: { label: "Fastest", tagline: "Minimises estimated transit time", text: "text-fast", border: "border-fast", bg: "bg-fast" },
  balanced: { label: "Balanced", tagline: "Best blend of cost and time", text: "text-balanced", border: "border-balanced", bg: "bg-balanced" },
};
const STRATS: Strategy[] = ["cost", "fast", "balanced"];
const SECTIONS: [string, string][] = [
  ["recommendations", "Recommendations"], ["details", "Route Details"], ["sustainability", "Sustainability"],
  ["what-if", "What-if Simulator"], ["disruption", "Disruption Simulator"], ["all-routes", "All Routes"],
];

function SectionTitle({ id, title, desc }: { id: string; title: string; desc: string }) {
  return (
    <div>
      <h2 id={id} className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Results() {
  const input = Route.useSearch();
  const errors = validateInput(input);
  const result = useMemo(() => (Object.keys(errors).length ? null : optimizeRoutes(input)), [JSON.stringify(input)]);
  const [selected, setSelected] = useState<Strategy>(input.priority ?? "balanced");

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">No routes to show</h1>
          <p className="mt-2 text-muted-foreground">{Object.values(errors)[0] ?? "No route found between these stations in the sample network."}</p>
          <Link to="/optimizer" search={input} className="mt-6 inline-flex rounded-lg bg-primary px-5 py-2.5 text-primary-foreground">Back to optimizer</Link>
        </main>
      </div>
    );
  }

  const route = result.best[selected];
  const strategiesFor = (r: RouteOption) => STRATS.filter((s) => result.best[s].id === r.id);
  const constraints = { deadlineHours: input.deadlineHours, budgetInr: input.budgetInr };
  const fz = feasibility(result, constraints);
  const expl = { cost: explainStrategy("cost", result), fast: explainStrategy("fast", result), balanced: explainStrategy("balanced", result) };
  const emissions = compareEmissions(result, input.tonnes);

  function exportCsv() {
    const rows = [
      ["RailOpt AI route report"], [DISCLAIMER], [],
      ["Origin", stationName(input.origin)], ["Destination", stationName(input.destination)],
      ["Cargo", CARGO_LABEL[input.cargo]], ["Quantity (t)", String(input.tonnes)], [],
      ["Strategy", "Cost (INR)", "Time (h)", "Distance (km)", "Transfers", "Wagon", "Wagons", "Stops", "Why", "Est. CO2e (kg)", "kg CO2e per t-km"],
      ...STRATS.map((s, i) => { const r = result!.best[s]; return [META[s].label, String(r.costInr), String(r.hours), String(r.distanceKm), String(r.transfers), WAGON_LABEL[r.wagon.wagon], String(r.wagon.wagonCount), r.stops.map(stationName).join(" > "), expl[s].why, ...emissionsCsvCells(emissions.rows[i])]; }),
      [], emissionsCsvNote(emissions),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `railopt-${input.origin}-${input.destination}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="bg-hero text-navy-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-7 sm:px-6">
          <div className="min-w-0">
            <Link to="/optimizer" search={input} className="no-print inline-flex items-center gap-1 text-sm text-navy-muted hover:text-navy-foreground"><ArrowLeft className="h-4 w-4" /> Edit shipment</Link>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{stationName(input.origin)} → {stationName(input.destination)}</h1>
            <p className="mt-1 text-navy-muted">{CARGO_LABEL[input.cargo]} · {formatNum(input.tonnes)} t · {WAGON_LABEL[input.wagonPref]} · {result.candidates.length} candidate routes evaluated</p>
          </div>
          <div className="no-print flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-navy-border px-4 py-2 text-sm hover:bg-navy-2"><Printer className="h-4 w-4" /> Print report</button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"><Download className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6"><DisclaimerBar /></div>
      <nav aria-label="Page sections" className="no-print sticky top-16 z-30 mt-4 border-y bg-background/90 backdrop-blur">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {SECTIONS.map(([id, label]) => (
            <li key={id} className="shrink-0">
              <a href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", `${location.pathname}${location.search}#${id}`); }}
                className="inline-flex rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6">
        {route.wagon.note && <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{route.wagon.note}</p>}
        {fz.hasConstraints && (
          <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${fz.bothOk.length ? "" : "border-destructive text-destructive"}`}>
            {fz.deadlineOk && <p>Deadline {input.deadlineHours} h: {fz.deadlineOk.length ? `${fz.deadlineOk.length} of ${result.candidates.length} routes meet it.` : `no evaluated route meets it (fastest is ${result.best.fast.hours} h).`}</p>}
            {fz.budgetOk && <p>Budget {formatInr(input.budgetInr!)}: {fz.budgetOk.length ? `${fz.budgetOk.length} of ${result.candidates.length} routes fit.` : `no evaluated route fits (cheapest is ${formatInr(result.best.cost.costInr)}).`}</p>}
            {fz.deadlineOk && fz.budgetOk && <p>{fz.bothOk.length ? `${fz.bothOk.length} route(s) satisfy both constraints.` : "No evaluated route satisfies both constraints."}</p>}
          </div>
        )}

        <section id="recommendations" aria-labelledby="rec-title" className="scroll-mt-32 space-y-4">
        <SectionTitle id="rec-title" title="Recommended routes" desc="Three ranked options. Select one to view its full journey." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STRATS.map((s) => {
            const r = result.best[s];
            const m = META[s];
            const active = selected === s;
            const shared = strategiesFor(r).filter((x) => x !== s);
            return (
              <article key={s} className={`flex flex-col rounded-xl border-2 bg-card p-5 shadow-card transition ${active ? m.border : "border-transparent"}`}>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${m.text}`}><span className={`h-2 w-2 rounded-full ${m.bg}`} />{m.label}</span>
                  {active && <CheckCircle2 className={`h-5 w-5 ${m.text}`} />}
                </div>
                <p className="text-xs text-muted-foreground">{m.tagline}{shared.length ? ` · same route as ${shared.map((x) => META[x].label).join(", ")}` : ""}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat icon={IndianRupee} label="Est. cost" value={formatInr(r.costInr)} hi={s === "cost"} />
                  <Stat icon={Timer} label="Transit" value={`${r.hours} h`} hi={s === "fast"} />
                  <Stat icon={Ruler} label="Distance" value={`${formatNum(r.distanceKm)} km`} />
                  <Stat icon={Repeat} label="Transfers" value={String(r.transfers)} />
                </dl>
                <div className="mt-3 flex items-center gap-2 text-sm"><Boxes className="h-4 w-4 text-muted-foreground" />{WAGON_LABEL[r.wagon.wagon]} × {r.wagon.wagonCount}</div>
                <p className="mt-3 text-sm">{expl[s].why}</p>
                {fz.hasConstraints && (() => { const c = checkRoute(r, constraints); return (
                  <p className="mt-2 flex flex-wrap gap-2 text-xs">
                    {c.deadline !== undefined && <span className={c.deadline ? "text-cost" : "text-destructive"}>{c.deadline ? "✓ Meets" : "✗ Misses"} {input.deadlineHours} h deadline</span>}
                    {c.budget !== undefined && <span className={c.budget ? "text-cost" : "text-destructive"}>{c.budget ? "✓ Within" : "✗ Over"} budget</span>}
                  </p>
                ); })()}
                <p className="mt-3 text-sm text-muted-foreground">Via {r.corridors.join(" → ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Stops: {r.stops.slice(1, -1).map(stationName).join(", ") || "Direct"}</p>
                <button onClick={() => { setSelected(s); document.getElementById("details")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="no-print mt-auto inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 pt-2 text-sm font-medium transition hover:bg-secondary [margin-top:1.25rem]">
                  View Route Details <ChevronRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>
        </section>

        <section id="details" aria-labelledby="details-title" className="scroll-mt-32 space-y-4">
        <SectionTitle id="details-title" title="Route details" desc="Segment-by-segment journey and network view for the selected route." />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
            <div className="no-print mb-4 flex flex-wrap gap-2" role="tablist">
              {STRATS.map((s) => (
                <button key={s} role="tab" aria-selected={selected === s} onClick={() => setSelected(s)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${selected === s ? "bg-navy text-navy-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                  {META[s].label}
                </button>
              ))}
            </div>
            <h3 className="text-lg font-semibold">{META[selected].label} route details</h3>
            <p className="mt-1 text-sm text-muted-foreground">{route.stops.map(stationName).join(" → ")}</p>
            <ol className="mt-5 space-y-0">
              {route.segments.map((seg, i) => {
                const transfer = i > 0 && route.segments[i - 1].corridor !== seg.corridor;
                return (
                  <li key={i} className="relative border-l-2 border-border pb-4 pl-5">
                    <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${META[selected].bg}`} />
                    <div className="text-sm font-medium">{stationName(route.stops[i])} → {stationName(route.stops[i + 1])}</div>
                    <div className="text-xs text-muted-foreground">{seg.corridor} · {seg.km} km · ~{Math.round(seg.km / seg.speed)} h running{transfer ? " · corridor transfer" : ""}</div>
                  </li>
                );
              })}
            </ol>
            <div className="mb-4 rounded-lg border p-4 text-sm" aria-label="Why this route">
              <h3 className="font-semibold">Why this route ranks first for {META[selected].label}</h3>
              <p className="mt-1">{expl[selected].why}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {expl[selected].tradeoffs.map((t) => <li key={t}>{t}</li>)}
                <li>Wagon plan: {WAGON_LABEL[route.wagon.wagon]} × {route.wagon.wagonCount}, {formatNum(route.distanceKm)} km, {route.transfers} transfer{route.transfers === 1 ? "" : "s"}.</li>
              </ul>
              {selected === "balanced" && (
                <div className="mt-3 overflow-x-auto">
                  <p className="text-xs text-muted-foreground">Score = {BALANCED_WEIGHTS.cost} × normalised cost + {BALANCED_WEIGHTS.time} × normalised time (0 = best, 1 = worst among candidates; lower is better).</p>
                  <table className="mt-2 w-full text-xs">
                    <thead className="text-left text-muted-foreground"><tr><th className="py-1">Route</th><th>Cost</th><th>Time</th><th>Norm. cost</th><th>Norm. time</th><th>Score</th></tr></thead>
                    <tbody className="font-mono">
                      {[...result.candidates].sort((a, b) => expl.balanced.scores.get(a.id)!.score - expl.balanced.scores.get(b.id)!.score).map((r) => {
                        const b = expl.balanced.scores.get(r.id)!;
                        return (
                          <tr key={r.id} className={r.id === route.id ? "font-semibold text-balanced" : ""}>
                            <td className="py-1 font-sans">{r.stops.slice(1, -1).map(stationName).join(", ") || "Direct"}</td>
                            <td>{formatInr(r.costInr)}</td><td>{r.hours} h</td><td>{b.costNorm.toFixed(3)}</td><td>{b.timeNorm.toFixed(3)}</td><td>{b.score.toFixed(3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-4">
              <div><div className="text-xs text-muted-foreground">Cost</div><div className="font-mono">{formatInr(route.costInr)}</div></div>
              <div><div className="text-xs text-muted-foreground">Per tonne</div><div className="font-mono">{formatInr(route.costInr / input.tonnes)}</div></div>
              <div><div className="text-xs text-muted-foreground">Transit</div><div className="font-mono">{route.hours} h (~{(route.hours / 24).toFixed(1)} d)</div></div>
              <div><div className="text-xs text-muted-foreground">Wagons</div><div className="font-mono">{route.wagon.wagonCount} {WAGON_LABEL[route.wagon.wagon].split(" ")[0]}</div></div>
            </div>
          </div>
          <div className="rounded-xl border bg-navy p-4 shadow-card lg:sticky lg:top-32 lg:self-start">
            <div className="mb-2 flex flex-wrap gap-3 text-xs text-navy-muted">
              {STRATS.map((s) => <span key={s} className="inline-flex items-center gap-1"><span className={`h-2 w-4 rounded ${META[s].bg}`} />{META[s].label}</span>)}
              <span className="ml-auto">Schematic, not to scale</span>
            </div>
            <RouteMap dark className="h-[420px] w-full" routes={STRATS.map((s) => ({ stops: result.best[s].stops, tone: s, active: s === selected }))} />
          </div>
        </div>
        </section>

        <div id="sustainability" className="scroll-mt-32">
        <EmissionsComparison cmp={emissions} result={result} tonnes={input.tonnes} meta={META} />
        </div>

        <div id="what-if" className="no-print scroll-mt-32">
        <WhatIfSimulator key={JSON.stringify(input)} result={result} input={input}
          labels={{ cost: META.cost.label, fast: META.fast.label, balanced: META.balanced.label }} />
        </div>

        <div id="disruption" className="no-print scroll-mt-32">
        <DisruptionSimulator key={`d-${JSON.stringify(input)}`} result={result} input={input} strategy={selected} strategyLabel={META[selected].label} />
        </div>

        <section id="all-routes" aria-labelledby="all-title" className="scroll-mt-32 overflow-hidden rounded-xl border bg-card shadow-card">
          <h2 id="all-title" className="px-6 pt-5 text-lg font-semibold">All evaluated routes</h2>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 border-y bg-muted text-left text-xs text-muted-foreground">
                <tr><th className="px-6 py-2">Route</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Distance</th><th className="px-3 py-2">Transfers</th><th className="px-6 py-2">Best for</th></tr>
              </thead>
              <tbody>
                {result.candidates.map((r) => {
                  const tags = strategiesFor(r);
                  return (
                    <tr key={r.id} className={`border-b last:border-0 ${r.id === route.id ? "bg-accent/50" : "even:bg-muted/40"}`}>
                      <td className="px-6 py-3">{r.stops.map(stationName).join(" → ")}</td>
                      <td className="px-3 py-3 font-mono">{formatInr(r.costInr)}</td>
                      <td className="px-3 py-3 font-mono">{r.hours} h</td>
                      <td className="px-3 py-3 font-mono">{formatNum(r.distanceKm)} km</td>
                      <td className="px-3 py-3 font-mono">{r.transfers}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tags.map((t) => (
                            <button key={t} onClick={() => setSelected(t)} className={`rounded-full px-2 py-0.5 text-xs text-primary-foreground ${META[t].bg}`}>{META[t].label}</button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-6 py-4 text-xs text-muted-foreground">
            Estimates use a sample rate per tonne-km by cargo type, segment cost factors, transfer handling per tonne, segment speeds, halts and transfer time. Balanced = equal-weight normalized cost and time; ties resolved by fewer transfers, then shorter distance.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon: Icon, label, value, hi }: { icon: typeof Timer; label: string; value: string; hi?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${hi ? "bg-accent" : "bg-muted"}`}>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}
