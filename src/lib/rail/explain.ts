// Plain-language explanations built only from the optimizer's computed values.
import { balancedScores, type OptimizeResult, type RouteOption, type Strategy, type BalancedBreakdown } from "./optimizer";
import { formatInr } from "./api";

export interface Constraints { deadlineHours?: number; budgetInr?: number }
export interface ConstraintCheck { deadline?: boolean; budget?: boolean }

export const checkRoute = (r: RouteOption, c: Constraints): ConstraintCheck => ({
  ...(c.deadlineHours ? { deadline: r.hours <= c.deadlineHours } : {}),
  ...(c.budgetInr ? { budget: r.costInr <= c.budgetInr } : {}),
});

export function feasibility(result: OptimizeResult, c: Constraints) {
  const all = result.candidates;
  const deadlineOk = c.deadlineHours ? all.filter((r) => r.hours <= c.deadlineHours!) : null;
  const budgetOk = c.budgetInr ? all.filter((r) => r.costInr <= c.budgetInr!) : null;
  const bothOk = all.filter((r) => Object.values(checkRoute(r, c)).every(Boolean));
  return { deadlineOk, budgetOk, bothOk, hasConstraints: !!(c.deadlineHours || c.budgetInr) };
}

const diffH = (a: number, b: number) => `${Math.abs(a - b)} h`;
const diffInr = (a: number, b: number) => formatInr(Math.abs(a - b));

export interface Explanation { why: string; tradeoffs: string[]; breakdown?: BalancedBreakdown; scores: Map<string, BalancedBreakdown> }

export function explainStrategy(s: Strategy, result: OptimizeResult): Explanation {
  const r = result.best[s];
  const others = result.candidates.filter((c) => c.id !== r.id);
  const scores = balancedScores(result.candidates);
  const n = result.candidates.length;
  const { cost, fast } = result.best;
  const tradeoffs: string[] = [];
  let why: string;

  if (s === "cost") {
    const next = [...others].sort((a, b) => a.costInr - b.costInr)[0];
    why = `Cheapest of ${n} evaluated routes at ${formatInr(r.costInr)}` +
      (next ? `, ${diffInr(next.costInr, r.costInr)} less than the next-cheapest option (${formatInr(next.costInr)}).` : ".");
    if (fast.id !== r.id) tradeoffs.push(`Takes ${r.hours} h — ${diffH(r.hours, fast.hours)} longer than the fastest route (${fast.hours} h), which costs ${diffInr(fast.costInr, r.costInr)} more.`);
    else tradeoffs.push("This route is also the fastest, so there is no cost-versus-time trade-off.");
  } else if (s === "fast") {
    const next = [...others].sort((a, b) => a.hours - b.hours)[0];
    why = `Shortest estimated transit of ${n} evaluated routes at ${r.hours} h` +
      (next ? `, ${diffH(next.hours, r.hours)} quicker than the next-fastest option (${next.hours} h).` : ".");
    if (cost.id !== r.id) tradeoffs.push(`Costs ${formatInr(r.costInr)} — ${diffInr(r.costInr, cost.costInr)} more than the lowest-cost route (${formatInr(cost.costInr)}), which takes ${diffH(cost.hours, r.hours)} longer.`);
    else tradeoffs.push("This route is also the cheapest, so there is no cost-versus-time trade-off.");
  } else {
    const b = scores.get(r.id)!;
    const next = [...others].sort((a, b2) => scores.get(a.id)!.score - scores.get(b2.id)!.score)[0];
    why = `Lowest combined score (${b.score.toFixed(3)}) of ${n} routes, weighting normalised cost and time equally` +
      (next ? `; the runner-up scores ${scores.get(next.id)!.score.toFixed(3)}.` : ".");
    if (r.id !== cost.id) tradeoffs.push(`${diffInr(r.costInr, cost.costInr)} more than the lowest-cost route.`);
    if (r.id !== fast.id) tradeoffs.push(`${diffH(r.hours, fast.hours)} slower than the fastest route.`);
    if (!tradeoffs.length) tradeoffs.push("This route is both the cheapest and the fastest.");
    return { why, tradeoffs, breakdown: b, scores };
  }
  if (r.transfers > 0) tradeoffs.push(`Includes ${r.transfers} corridor transfer${r.transfers > 1 ? "s" : ""}, each adding handling time and cost in this model.`);
  return { why, tradeoffs, scores };
}
