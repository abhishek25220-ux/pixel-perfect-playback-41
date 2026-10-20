import { describe, expect, it } from "vitest";
import { optimizeRoutes, balancedScores } from "@/lib/rail/optimizer";
import { explainStrategy, feasibility } from "@/lib/rail/explain";

const res = optimizeRoutes({ origin: "delhi", destination: "mumbai", cargo: "foodgrains", tonnes: 800, wagonPref: "covered" })!;

describe("explainable route intelligence", () => {
  it("balanced pick has the lowest 50/50 normalised score", () => {
    const s = balancedScores(res.candidates);
    const min = Math.min(...[...s.values()].map((b) => b.score));
    expect(s.get(res.best.balanced.id)!.score).toBe(min);
    for (const b of s.values()) expect(b.score).toBeCloseTo(0.5 * b.costNorm + 0.5 * b.timeNorm);
  });
  it("explanations quote the actual computed values", () => {
    expect(explainStrategy("fast", res).why).toContain(`${res.best.fast.hours} h`);
    expect(explainStrategy("cost", res).tradeoffs[0]).toContain(`${res.best.cost.hours - res.best.fast.hours} h longer`);
  });
  it("reports no feasible route when the deadline is below the fastest time", () => {
    const f = feasibility(res, { deadlineHours: res.best.fast.hours - 1 });
    expect(f.deadlineOk).toEqual([]);
    expect(f.bothOk).toEqual([]);
  });
  it("counts routes that meet a 36 h deadline", () => {
    const f = feasibility(res, { deadlineHours: 36 });
    expect(f.deadlineOk!.every((r) => r.hours <= 36)).toBe(true);
    expect(f.deadlineOk!.length).toBe(res.candidates.filter((r) => r.hours <= 36).length);
  });
});
