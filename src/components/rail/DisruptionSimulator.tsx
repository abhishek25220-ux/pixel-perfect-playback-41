import { useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, TrafficCone } from "lucide-react";
import { RouteMap } from "@/components/rail/RouteMap";
import { segmentKey, stationName, type OptimizeResult, type RouteOption, type Strategy } from "@/lib/rail/optimizer";
import { formatInr, formatNum } from "@/lib/rail/api";
import type { ShipmentSearch } from "@/lib/rail/search";
import { segmentOptions, simulateDisruption } from "@/lib/rail/disruption";
import { parseLimit } from "@/lib/rail/scenario";
import type { ConstraintCheck } from "@/lib/rail/explain";

const fieldCls = "mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";

interface Props { result: OptimizeResult; input: ShipmentSearch; strategy: Strategy; strategyLabel: string }

export function DisruptionSimulator({ result, input, strategy, strategyLabel }: Props) {
  const baseRoute = result.best[strategy];
  const options = useMemo(() => {
    const onRoute = new Set(baseRoute.segments.map(segmentKey));
    return segmentOptions().sort((a, b) => Number(onRoute.has(b.key)) - Number(onRoute.has(a.key)));
  }, [baseRoute]);
  const onRoute = new Set(baseRoute.segments.map(segmentKey));
  const [seg, setSeg] = useState("");
  const [mode, setMode] = useState<"block" | "delay">("block");
  const [delay, setDelay] = useState("12");
  const reset = () => { setSeg(""); setMode("block"); setDelay("12"); };

  const delayParsed = parseLimit(delay);
  const delayError = mode === "delay" ? (delayParsed.error ?? (delayParsed.value ? undefined : "Enter delay hours greater than 0.")) : undefined;
  const constraints = { budgetInr: input.budgetInr, deadlineHours: input.deadlineHours };
  const outcome = useMemo(
    () => (!seg || delayError ? null : simulateDisruption(input, result, strategy, { segmentKey: seg, mode, delayHours: delayParsed.value }, constraints)),
    [seg, mode, delayParsed.value, delayError, result, strategy, JSON.stringify(input)],
  );
  const segLabel = (k: string) => { const s = options.find((o) => o.key === k)?.segment; return s ? `${stationName(s.from)} – ${stationName(s.to)}` : k; };

  return (
    <section aria-labelledby="disrupt-title" className="no-print rounded-xl border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="disrupt-title" className="flex items-center gap-2 text-lg font-semibold"><TrafficCone className="h-5 w-5 text-destructive" /> Disruption Simulator</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Simulation only — not a real-time Indian Railways alert. Tests the {strategyLabel} route against a hypothetical blocked or delayed segment.</p>
        </div>
        <button type="button" onClick={reset} disabled={!seg}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-50">
          <RotateCcw className="h-4 w-4" /> Reset Disruption
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Segment
          <select aria-label="Disrupted segment" value={seg} onChange={(e) => setSeg(e.target.value)} className={fieldCls}>
            <option value="">No disruption</option>
            {options.map((o) => <option key={o.key} value={o.key}>{segLabel(o.key)}{onRoute.has(o.key) ? " (on current route)" : ""}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Disruption type
          <select aria-label="Disruption type" value={mode} onChange={(e) => setMode(e.target.value as "block" | "delay")} className={fieldCls}>
            <option value="block">Blocked (cannot be used)</option>
            <option value="delay">Additional delay</option>
          </select>
        </label>
        {mode === "delay" && (
          <label className="text-sm font-medium">Delay (hours)
            <input aria-label="Delay hours" inputMode="decimal" value={delay} onChange={(e) => setDelay(e.target.value)} aria-invalid={!!delayError} className={fieldCls} />
            {delayError && <span className="mt-1 block text-xs text-destructive">{delayError}</span>}
          </label>
        )}
      </div>

      {outcome && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
          <RouteCard title={`Baseline ${strategyLabel}`} route={outcome.baselineRoute} check={null}
            note={outcome.originalAvailable ? (onRoute.has(seg) ? "Uses the disrupted segment." : "Not affected by this segment.") : undefined}
            unavailable={!outcome.originalAvailable} />
          {outcome.alternative ? (
            <RouteCard title={`Simulated ${strategyLabel}${outcome.alternative.id === outcome.baselineRoute.id ? " (same route)" : " (best remaining alternative)"}`}
              route={outcome.alternative} check={outcome.alternativeCheck} highlight
              note={outcome.alternativeFeasible ? undefined : "Does not meet every shipment constraint."} />
          ) : (
            <div role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">
              <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> No feasible route</p>
              <p className="mt-1">With {segLabel(seg)} blocked, the sample network has no path from {stationName(input.origin)} to {stationName(input.destination)} within the optimizer's limits. No route is suggested.</p>
            </div>
          )}
          <div className="rounded-lg bg-navy p-2">
            <RouteMap dark className="h-[260px] w-full" blocked={mode === "block" ? seg : undefined}
              routes={[{ stops: outcome.baselineRoute.stops, tone: strategy }, ...(outcome.alternative ? [{ stops: outcome.alternative.stops, tone: "alt" as const, active: true }] : [])]} />
            <p className="px-1 text-xs text-navy-muted">Faded: baseline · bold: simulated route{mode === "block" ? " · red dashed: blocked" : ""}</p>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Estimates are simulated on the illustrative sample network. Your baseline results above are unchanged.</p>
    </section>
  );
}

function RouteCard({ title, route, check, note, unavailable, highlight }: { title: string; route: RouteOption; check: ConstraintCheck | null; note?: string; unavailable?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${unavailable ? "border-destructive opacity-80" : highlight ? "border-primary" : ""}`}>
      <h3 className="font-semibold">{title}</h3>
      {unavailable && <p role="alert" className="mt-1 font-medium text-destructive">Unavailable — uses the blocked segment.</p>}
      <p className="mt-1 text-muted-foreground">{route.stops.map(stationName).join(" → ")}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
        <div><dt className="font-sans text-muted-foreground">Cost</dt><dd>{formatInr(route.costInr)}</dd></div>
        <div><dt className="font-sans text-muted-foreground">Transit</dt><dd>{route.hours} h</dd></div>
        <div><dt className="font-sans text-muted-foreground">Distance</dt><dd>{formatNum(route.distanceKm)} km</dd></div>
        <div><dt className="font-sans text-muted-foreground">Transfers</dt><dd>{route.transfers}</dd></div>
      </dl>
      {check && Object.keys(check).length > 0 && (
        <p className="mt-2 flex flex-wrap gap-2 text-xs">
          {check.deadline !== undefined && <span className={check.deadline ? "text-cost" : "text-destructive"}>{check.deadline ? "✓ Meets" : "✗ Misses"} deadline</span>}
          {check.budget !== undefined && <span className={check.budget ? "text-cost" : "text-destructive"}>{check.budget ? "✓ Within" : "✗ Over"} budget</span>}
        </p>
      )}
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
