import { useMemo, useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { stationName, type OptimizeResult, type RouteOption, type Strategy } from "@/lib/rail/optimizer";
import type { ConstraintCheck } from "@/lib/rail/explain";
import { formatInr } from "@/lib/rail/api";
import type { ShipmentSearch } from "@/lib/rail/search";
import { baselineScenario, baselineSummary, parseLimit, simulateScenario } from "@/lib/rail/scenario";

const fieldCls = "mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";
const via = (r: RouteOption) => r.stops.slice(1, -1).map(stationName).join(", ") || "Direct";

interface Props { result: OptimizeResult; input: ShipmentSearch; labels: Record<Strategy, string> }

export function WhatIfSimulator({ result, input, labels }: Props) {
  const initial = useMemo(() => baselineScenario(input), [input]);
  const toFields = () => ({
    budget: initial.budgetInr ? String(initial.budgetInr) : "",
    deadline: initial.deadlineHours ? String(initial.deadlineHours) : "",
    weight: Math.round(initial.costWeight * 100),
  });
  const [fields, setFields] = useState(toFields);
  const reset = () => setFields(toFields());

  const budget = parseLimit(fields.budget);
  const deadline = parseLimit(fields.deadline);
  const invalid = !!(budget.error || deadline.error);
  const baseline = useMemo(() => baselineSummary(result, input), [result, input]);
  const outcome = useMemo(
    () => simulateScenario(result, { budgetInr: budget.value, deadlineHours: deadline.value, costWeight: fields.weight / 100 }),
    [result, budget.value, deadline.value, fields.weight],
  );
  const rev = invalid ? null : outcome.recommended;
  const dirty = JSON.stringify(fields) !== JSON.stringify(toFields());
  const n = result.candidates.length;

  return (
    <section aria-labelledby="whatif-title" className="no-print rounded-xl border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="whatif-title" className="flex items-center gap-2 text-lg font-semibold"><FlaskConical className="h-5 w-5 text-primary" /> What-if Simulator</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Re-ranks the {n} routes already evaluated above. Your original results stay unchanged.</p>
        </div>
        <button type="button" onClick={reset} disabled={!dirty}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-50">
          <RotateCcw className="h-4 w-4" /> Reset Scenario
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Hard constraints <span className="font-normal text-muted-foreground">· routes must meet these</span></legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="wi-budget" className="text-sm font-medium">Budget cap (₹)</label>
              <input id="wi-budget" type="number" inputMode="decimal" min={1} step="any" placeholder="No limit" className={fieldCls}
                value={fields.budget} aria-invalid={!!budget.error} aria-describedby="wi-budget-help"
                onChange={(e) => setFields((f) => ({ ...f, budget: e.target.value }))} />
              <p id="wi-budget-help" className={`mt-1 text-xs ${budget.error ? "text-destructive" : "text-muted-foreground"}`}>{budget.error ?? (budget.value ? formatInr(budget.value) : "Leave blank for no budget limit.")}</p>
            </div>
            <div>
              <label htmlFor="wi-deadline" className="text-sm font-medium">Delivery deadline (hours)</label>
              <input id="wi-deadline" type="number" inputMode="decimal" min={1} step="any" placeholder="No limit" className={fieldCls}
                value={fields.deadline} aria-invalid={!!deadline.error} aria-describedby="wi-deadline-help"
                onChange={(e) => setFields((f) => ({ ...f, deadline: e.target.value }))} />
              <p id="wi-deadline-help" className={`mt-1 text-xs ${deadline.error ? "text-destructive" : "text-muted-foreground"}`}>{deadline.error ?? (deadline.value ? `~${(deadline.value / 24).toFixed(1)} days` : "Leave blank for no deadline.")}</p>
            </div>
          </div>
        </fieldset>
        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Ranking preference <span className="font-normal text-muted-foreground">· reorders, never filters</span></legend>
          <div className="flex items-center justify-between text-sm">
            <label id="wi-weight-label" className="font-medium">Cost vs. time priority</label>
            <span className="font-mono text-xs">Cost {fields.weight}% · Time {100 - fields.weight}%</span>
          </div>
          <Slider className="mt-4" min={0} max={100} step={5} value={[fields.weight]} aria-labelledby="wi-weight-label"
            onValueChange={([v]) => setFields((f) => ({ ...f, weight: v }))} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Prioritise faster</span><span>Prioritise cheaper</span></div>
          <p className="mt-2 text-xs text-muted-foreground">Score = {(fields.weight / 100).toFixed(2)} × normalised cost + {(1 - fields.weight / 100).toFixed(2)} × normalised time (0 = best, 1 = worst; lower is better).</p>
        </fieldset>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ResultCard title={`Baseline · ${labels[baseline.strategy]}`} note="Original recommendation (unchanged)" route={baseline.route} score={baseline.score}
          check={baseline.check} hasConstraints={baseline.hasConstraints} feasible={baseline.feasible} input={{ budgetInr: input.budgetInr, deadlineHours: input.deadlineHours }} />
        {invalid ? (
          <div role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">Fix the highlighted input to see a revised recommendation.</div>
        ) : rev ? (
          <ResultCard title="Revised recommendation" note={rev.route.id === baseline.route.id ? "Same route as baseline" : deltaText(rev.route, baseline.route)}
            route={rev.route} score={rev.score} check={rev.check} hasConstraints={outcome.hasConstraints} feasible
            input={{ budgetInr: budget.value, deadlineHours: deadline.value }} highlight />
        ) : (
          <div role="status" className="rounded-lg border border-destructive p-4 text-sm">
            <h3 className="font-semibold text-destructive">No evaluated route meets these hard constraints</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {deadline.value && <li>Fastest evaluated route takes {result.best.fast.hours} h (deadline {deadline.value} h).</li>}
              {budget.value && <li>Cheapest evaluated route costs {formatInr(result.best.cost.costInr)} (budget {formatInr(budget.value)}).</li>}
              {deadline.value && budget.value && <li>Some routes may meet one limit, but none meets both.</li>}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Relax a limit to get a recommendation. No route is marked feasible here.</p>
          </div>
        )}
      </div>

      {!invalid && (
        <div className="mt-5 overflow-x-auto">
          <p className="text-xs text-muted-foreground">{outcome.hasConstraints ? `${outcome.feasibleCount} of ${n} routes meet the hard constraints. Routes that miss a constraint are listed last and not ranked.` : `No hard constraints set — all ${n} routes are eligible.`}</p>
          <table className="mt-2 w-full min-w-[640px] text-xs">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1">Rank</th><th>Route via</th><th>Cost</th><th>Time</th><th>Score</th><th>Hard constraints</th></tr></thead>
            <tbody className="font-mono">
              {outcome.ranked.map((r) => (
                <tr key={r.route.id} className={`border-t ${r.feasible ? "" : "text-muted-foreground"} ${rev && r.route.id === rev.route.id ? "font-semibold text-primary" : ""}`}>
                  <td className="py-1.5">{r.rank ?? "—"}</td>
                  <td className="font-sans">{via(r.route)}{r.route.id === baseline.route.id && <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">Baseline</span>}</td>
                  <td>{formatInr(r.route.costInr)}</td><td>{r.route.hours} h</td><td>{r.score.toFixed(3)}</td>
                  <td className="font-sans"><Checks check={r.check} feasible={r.feasible} hasConstraints={outcome.hasConstraints} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function deltaText(r: RouteOption, b: RouteOption) {
  const dc = r.costInr - b.costInr, dh = r.hours - b.hours;
  const c = dc === 0 ? "same cost" : `${formatInr(Math.abs(dc))} ${dc > 0 ? "more" : "less"}`;
  const h = dh === 0 ? "same time" : `${Math.abs(dh)} h ${dh > 0 ? "slower" : "faster"}`;
  return `Different route vs baseline: ${c}, ${h}`;
}

function Checks({ check, feasible, hasConstraints }: { check: ConstraintCheck; feasible: boolean; hasConstraints: boolean }) {
  if (!hasConstraints) return <span className="text-muted-foreground">None set</span>;
  return (
    <span className="flex flex-wrap gap-2">
      {check.budget !== undefined && <span className={check.budget ? "text-cost" : "text-destructive"}>{check.budget ? "✓ Within budget" : "✗ Over budget"}</span>}
      {check.deadline !== undefined && <span className={check.deadline ? "text-cost" : "text-destructive"}>{check.deadline ? "✓ Meets deadline" : "✗ Misses deadline"}</span>}
      <span className={`font-semibold ${feasible ? "text-cost" : "text-destructive"}`}>{feasible ? "Feasible" : "Infeasible"}</span>
    </span>
  );
}

function ResultCard({ title, note, route, score, check, hasConstraints, feasible, input, highlight }: {
  title: string; note: string; route: RouteOption; score: number; check: ConstraintCheck; hasConstraints: boolean; feasible: boolean;
  input: { budgetInr?: number; deadlineHours?: number }; highlight?: boolean;
}) {
  return (
    <article className={`rounded-lg border p-4 ${highlight ? "border-primary" : ""}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{note}</p>
      <p className="mt-2 text-sm">Via {via(route)}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">Est. cost</dt><dd className="font-mono">{formatInr(route.costInr)}</dd></div>
        <div className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">Transit</dt><dd className="font-mono">{route.hours} h</dd></div>
        <div className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">Score</dt><dd className="font-mono">{score.toFixed(3)}</dd></div>
      </dl>
      <div className="mt-3 text-xs">
        <Checks check={check} feasible={feasible} hasConstraints={hasConstraints} />
        {hasConstraints && (
          <p className="mt-1 text-muted-foreground">Limits: {input.budgetInr ? formatInr(input.budgetInr) : "no budget"} · {input.deadlineHours ? `${input.deadlineHours} h` : "no deadline"}</p>
        )}
      </div>
    </article>
  );
}
