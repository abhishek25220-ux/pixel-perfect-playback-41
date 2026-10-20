// What-if scenario re-ranking over the optimizer's EXISTING candidate routes.
// Never creates routes: it only filters by hard constraints and re-orders by preference.
import { BALANCED_WEIGHTS, tieBreak, weightedScores, type OptimizeResult, type RouteOption, type Strategy } from "./optimizer";
import { checkRoute, type ConstraintCheck, type Constraints } from "./explain";
import type { ShipmentSearch } from "./search";

/** Hard constraints (budget, deadline) filter routes; costWeight (0–1) only re-orders them. */
export interface Scenario extends Constraints { costWeight: number }

/** Cost weight implied by each existing strategy (time weight = 1 − cost weight). */
export const STRATEGY_COST_WEIGHT: Record<Strategy, number> = { cost: 1, fast: 0, balanced: BALANCED_WEIGHTS.cost };

export const baselineStrategy = (s: Pick<ShipmentSearch, "priority">): Strategy => s.priority ?? "balanced";

export function baselineScenario(s: ShipmentSearch): Scenario {
  return { budgetInr: s.budgetInr, deadlineHours: s.deadlineHours, costWeight: STRATEGY_COST_WEIGHT[baselineStrategy(s)] };
}

export interface RankedRoute { route: RouteOption; score: number; check: ConstraintCheck; feasible: boolean; rank: number | null }

export interface ScenarioOutcome {
  ranked: RankedRoute[];
  recommended: RankedRoute | null;
  feasibleCount: number;
  hasConstraints: boolean;
}

const clampWeight = (w: number) => (Number.isFinite(w) ? Math.min(1, Math.max(0, w)) : BALANCED_WEIGHTS.cost);
const isMet = (c: ConstraintCheck) => Object.values(c).every(Boolean);

/** Re-rank existing candidates: routes meeting every hard constraint first (by weighted score), others after and unranked. */
export function simulateScenario(result: OptimizeResult, scenario: Scenario): ScenarioOutcome {
  const w = clampWeight(scenario.costWeight);
  const scores = weightedScores(result.candidates, { cost: w, time: 1 - w });
  const constraints: Constraints = { budgetInr: scenario.budgetInr, deadlineHours: scenario.deadlineHours };
  const rows = result.candidates.map((route) => {
    const check = checkRoute(route, constraints);
    return { route, score: scores.get(route.id)!.score, check, feasible: isMet(check), rank: null as number | null };
  });
  rows.sort((a, b) => Number(b.feasible) - Number(a.feasible) || a.score - b.score || tieBreak(a.route, b.route));
  let n = 0;
  for (const r of rows) if (r.feasible) r.rank = ++n;
  return {
    ranked: rows,
    recommended: rows[0]?.feasible ? rows[0] : null,
    feasibleCount: n,
    hasConstraints: !!(constraints.budgetInr || constraints.deadlineHours),
  };
}

/** The baseline is the recommendation the results page already shows; it is never altered by a scenario. */
export function baselineSummary(result: OptimizeResult, s: ShipmentSearch) {
  const strategy = baselineStrategy(s);
  const route = result.best[strategy];
  const w = STRATEGY_COST_WEIGHT[strategy];
  const score = weightedScores(result.candidates, { cost: w, time: 1 - w }).get(route.id)!.score;
  const check = checkRoute(route, { budgetInr: s.budgetInr, deadlineHours: s.deadlineHours });
  return { strategy, route, score, costWeight: w, check, feasible: isMet(check), hasConstraints: !!(s.budgetInr || s.deadlineHours) };
}

/** Parse an optional positive number field. Empty = no limit; anything else invalid returns an error. */
export function parseLimit(raw: string): { value?: number; error?: string } {
  const t = raw.trim().replace(/,/g, "");
  if (t === "") return {};
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return { error: "Enter a number greater than 0, or leave blank for no limit." };
  return { value: n };
}
