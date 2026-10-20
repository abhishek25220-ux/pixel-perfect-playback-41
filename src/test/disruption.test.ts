import { describe, expect, it } from "vitest";
import { SEGMENTS } from "@/lib/rail/data";
import { optimizeRoutes, segmentKey } from "@/lib/rail/optimizer";
import { simulateDisruption } from "@/lib/rail/disruption";

const input = { origin: "delhi", destination: "mumbai", cargo: "cement" as const, tonnes: 1200, wagonPref: "open" as const };
const base = optimizeRoutes(input)!;
const snapshot = JSON.stringify(base);
const segsBefore = JSON.stringify(SEGMENTS);

describe("disruption simulator", () => {
  it("blocked segment makes the baseline unavailable and alternative avoids it", () => {
    const key = segmentKey(base.best.cost.segments[0]);
    const out = simulateDisruption(input, base, "cost", { segmentKey: key, mode: "block" });
    expect(out.originalAvailable).toBe(false);
    expect(out.alternative).not.toBeNull();
    expect(out.alternative!.segments.some((s) => segmentKey(s) === key)).toBe(false);
    for (const c of out.disrupted!.candidates) expect(c.segments.some((s) => segmentKey(s) === key)).toBe(false);
  });

  it("added delay increases hours of routes using the segment by the delay", () => {
    const r = base.best.fast;
    const key = segmentKey(r.segments[0]);
    const out = optimizeRoutes(input, { segmentKey: key, mode: "delay", delayHours: 10 })!;
    const same = out.candidates.find((c) => c.id === r.id)!;
    expect(same.hours).toBe(r.hours + 10);
    expect(same.costInr).toBe(r.costInr);
  });

  it("returns no alternative when no path remains (Mumbai–Surat blocked)", () => {
    const inp = { ...input, origin: "mumbai", destination: "surat" };
    const b = optimizeRoutes(inp)!;
    const out = simulateDisruption(inp, b, "balanced", { segmentKey: "mumbai~surat", mode: "block" });
    expect(out.originalAvailable).toBe(false);
    expect(out.disrupted).toBeNull();
    expect(out.alternative).toBeNull();
    expect(out.alternativeFeasible).toBe(false);
  });

  it("baseline results and shared network are never mutated", () => {
    simulateDisruption(input, base, "balanced", { segmentKey: segmentKey(base.best.balanced.segments[0]), mode: "block" });
    simulateDisruption(input, base, "fast", { segmentKey: segmentKey(base.best.fast.segments[0]), mode: "delay", delayHours: 50 });
    expect(JSON.stringify(base)).toBe(snapshot);
    expect(JSON.stringify(SEGMENTS)).toBe(segsBefore);
  });

  it("reset (no disruption) reproduces the baseline exactly", () => {
    expect(JSON.stringify(optimizeRoutes(input))).toBe(snapshot);
  });
});
