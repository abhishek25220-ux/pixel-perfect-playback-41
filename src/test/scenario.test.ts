import { describe, expect, it } from "vitest";
import { optimizeRoutes } from "@/lib/rail/optimizer";
import { baselineScenario, baselineSummary, parseLimit, simulateScenario } from "@/lib/rail/scenario";

const input = { origin: "delhi", destination: "mumbai", cargo: "cement" as const, tonnes: 1200, wagonPref: "open" as const };
const res = optimizeRoutes(input)!;

describe("what-if scenario simulator", () => {
  it("baseline scenario reproduces each existing strategy pick when no constraints are set", () => {
    for (const priority of ["cost", "fast", "balanced"] as const) {
      const out = simulateScenario(res, baselineScenario({ ...input, priority }));
      expect(out.recommended!.route.id).toBe(res.best[priority].id);
    }
  });
  it("only re-ranks existing candidates", () => {
    const out = simulateScenario(res, { costWeight: 0.3 });
    expect(out.ranked.map((r) => r.route.id).sort()).toEqual(res.candidates.map((c) => c.id).sort());
  });
  it("revised recommendation always meets the deadline (hard constraint)", () => {
    const deadline = res.best.fast.hours + 5;
    const out = simulateScenario(res, { costWeight: 1, deadlineHours: deadline });
    expect(out.recommended!.route.hours).toBeLessThanOrEqual(deadline);
  });
  it("revised recommendation always fits the budget (hard constraint)", () => {
    const budget = res.best.cost.costInr + 1;
    const out = simulateScenario(res, { costWeight: 0, budgetInr: budget });
    expect(out.recommended!.route.costInr).toBeLessThanOrEqual(budget);
  });
  it("returns no recommendation when no route meets the deadline", () => {
    const out = simulateScenario(res, { costWeight: 0.5, deadlineHours: res.best.fast.hours - 1 });
    expect(out.recommended).toBeNull();
    expect(out.feasibleCount).toBe(0);
    expect(out.ranked.every((r) => !r.feasible && r.rank === null)).toBe(true);
  });
  it("returns no recommendation when the budget is below the cheapest route", () => {
    const out = simulateScenario(res, { costWeight: 0.5, budgetInr: res.best.cost.costInr - 1 });
    expect(out.recommended).toBeNull();
  });
  it("baseline flags an infeasible original pick instead of hiding it", () => {
    const b = baselineSummary(res, { ...input, priority: "cost", deadlineHours: 1 });
    expect(b.route.id).toBe(res.best.cost.id);
    expect(b.feasible).toBe(false);
  });
  it("blank limits mean no limit; zero or text are rejected", () => {
    expect(parseLimit("")).toEqual({});
    expect(parseLimit("0").error).toBeDefined();
    expect(parseLimit("abc").error).toBeDefined();
    expect(parseLimit("1,50,000").value).toBe(150000);
  });
});
