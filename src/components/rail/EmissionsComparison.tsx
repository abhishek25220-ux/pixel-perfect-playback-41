import { Leaf, ChevronDown } from "lucide-react";
import { stationName, type OptimizeResult, type Strategy } from "@/lib/rail/optimizer";
import { formatNum } from "@/lib/rail/api";
import {
  EMISSIONS_CONFIG, formatIntensity, formatKg, formatKgPerTonne, isValidFactor, lowestEmissionsTradeoffs,
  type EmissionsComparison as Comparison,
} from "@/lib/rail/emissions";

interface Props {
  cmp: Comparison;
  result: OptimizeResult;
  tonnes: number;
  meta: Record<Strategy, { label: string; text: string; bg: string }>;
}

const via = (stops: string[]) => stops.slice(1, -1).map(stationName).join(", ") || "Direct";

export function EmissionsComparison({ cmp, result, tonnes, meta }: Props) {
  const labels = { cost: meta.cost.label, fast: meta.fast.label, balanced: meta.balanced.label };
  const lowestRows = cmp.rows.filter((r) => r.lowest);
  const tradeoffs = lowestEmissionsTradeoffs(cmp, result, labels);
  const distinctLowest = new Set(lowestRows.map((r) => r.route.id)).size;
  const tag = cmp.validated ? "Estimated" : "Illustrative estimate";

  const assumptions = (
    <>
      <p className="font-mono text-xs">tonne-km = route distance (km) × quantity (t)<br />kg CO₂e = tonne-km × {isValidFactor(cmp.factor) ? cmp.factor : "—"} kg CO₂e per tonne-km</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>One factor is applied to every route, so in this model lower emissions simply mean a shorter route distance. Cost and transit time use separate calculations, so the lowest-emissions route is not necessarily the cheapest or fastest.</li>
        <li>The factor ({isValidFactor(cmp.factor) ? formatIntensity(cmp.factor) : "not set"}) is {cmp.validated ? "configured as validated" : "an illustrative assumption, not official Indian Railways data and not a validated emissions factor"}.</li>
        <li>Covers line-haul movement only. Excludes {EMISSIONS_CONFIG.excludes.join(", ")}.</li>
        <li>Figures are rounded to the nearest kg; per-tonne values to two decimals.</li>
      </ul>
    </>
  );

  return (
    <section aria-labelledby="emissions-title" className="rounded-xl border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="emissions-title" className="flex items-center gap-2 text-lg font-semibold"><Leaf className="h-5 w-5 text-success" /> Sustainability &amp; estimated emissions</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Estimated CO₂e for the three recommendations, from shipment tonne-kilometres ({formatNum(tonnes)} t).</p>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">{tag} · {cmp.validated ? "validated factor" : "not official data"}</span>
      </div>

      {!cmp.available ? (
        <p role="status" className="mt-4 rounded-lg border border-destructive px-3 py-2 text-sm text-destructive">
          Emissions can't be estimated: {isValidFactor(cmp.factor) ? "route distance or shipment quantity is missing." : "no emissions factor is configured."}
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-y bg-muted text-left text-xs text-muted-foreground">
                <tr><th className="px-3 py-2">Strategy</th><th className="px-3 py-2">Via</th><th className="px-3 py-2">Distance</th><th className="px-3 py-2">Tonne-km</th><th className="px-3 py-2">Est. CO₂e</th><th className="px-3 py-2">Per tonne</th><th className="px-3 py-2">Per t-km</th></tr>
              </thead>
              <tbody>
                {cmp.rows.map((r) => (
                  <tr key={r.strategy} className={`border-b last:border-0 ${r.lowest ? "bg-accent/50" : ""}`}>
                    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 font-medium ${meta[r.strategy].text}`}><span className={`h-2 w-2 rounded-full ${meta[r.strategy].bg}`} />{meta[r.strategy].label}</span></td>
                    <td className="px-3 py-3">{via(r.route.stops)}</td>
                    <td className="px-3 py-3 font-mono">{formatNum(r.route.distanceKm)} km</td>
                    {r.estimate ? (
                      <>
                        <td className="px-3 py-3 font-mono">{formatNum(Math.round(r.estimate.tonneKm))}</td>
                        <td className="px-3 py-3 font-mono font-medium">
                          {formatKg(r.estimate.kgCo2e)}
                          {r.lowest && <span className="ml-2 rounded-full bg-success px-2 py-0.5 font-sans text-xs text-primary-foreground">Lowest est.</span>}
                        </td>
                        <td className="px-3 py-3 font-mono">{formatKgPerTonne(r.estimate.kgPerTonne)}</td>
                        <td className="px-3 py-3 font-mono">{formatIntensity(r.estimate.kgPerTkm)}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="px-3 py-3 text-muted-foreground">Not available — missing distance or quantity</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border p-4 text-sm">
            <p className="font-semibold">
              Lowest estimated emissions: {lowestRows.map((r) => meta[r.strategy].label).join(" / ")}
              {cmp.lowestKg !== null && <span className="font-mono font-normal"> · {formatKg(cmp.lowestKg)}</span>}
            </p>
            {distinctLowest > 1 && <p className="mt-1 text-muted-foreground">Different routes tie on estimated emissions; comparisons below use the {lowestRows[0] && meta[lowestRows[0].strategy].label} route.</p>}
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {tradeoffs.map((t) => <li key={t}>{t}</li>)}
            </ul>
            {cmp.lowerElsewhere && (
              <p className="mt-2 text-muted-foreground">
                Another evaluated route (via {via(cmp.lowerElsewhere.route.stops)}) is estimated lower at {formatKg(cmp.lowerElsewhere.estimate.kgCo2e)}, but it isn't one of the three recommendations.
              </p>
            )}
          </div>
        </>
      )}

      <details className="no-print group mt-4 rounded-lg border p-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
          How this is calculated <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 text-muted-foreground">{assumptions}</div>
      </details>
      <div className="mt-4 hidden text-sm text-muted-foreground print:block">
        <p className="font-medium text-foreground">How this is calculated</p>
        {assumptions}
      </div>
    </section>
  );
}
