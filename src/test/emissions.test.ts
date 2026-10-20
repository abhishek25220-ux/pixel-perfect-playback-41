import { describe, expect, it } from "vitest";
import { optimizeRoutes, type OptimizeResult, type RouteOption } from "@/lib/rail/optimizer";
import {
  EMISSIONS_CONFIG, compareEmissions, emissionsCsvCells, emissionsCsvNote, estimateEmissions,
  formatIntensity, formatKg, lowestEmissionsTradeoffs, roundKg,
} from "@/lib/rail/emissions";

const labels = { cost: "Lowest Cost", fast: "Fastest", balanced: "Balanced" };
const res = optimizeRoutes({ origin: "delhi", destination: "mumbai", cargo: "cement", tonnes: 1200, wagonPref: "open" })!;

const route = (id: string, distanceKm: number, costInr: number, hours: number): RouteOption => ({
  id, stops: ["a", id, "b"], segments: [], distanceKm, hours, costInr, transfers: 0, corridors: [],
  wagon: { wagon: "open", wagonCount: 1 },
});

describe("emissions formula and units", () => {
  it("kg CO2e = distance km × tonnes × factor (kg CO2e per tonne-km)", () => {
    const e = estimateEmissions(1000, 500, 0.02)!;
    expect(e.tonneKm).toBe(500_000);
    expect(e.kgCo2e).toBeCloseTo(10_000);
    expect(e.kgPerTonne).toBeCloseTo(20);
    expect(e.kgPerTkm).toBe(0.02);
  });
  it("uses the documented illustrative default factor and is labelled unvalidated", () => {
    expect(estimateEmissions(100, 10)!.kgPerTkm).toBe(EMISSIONS_CONFIG.factorKgPerTkm);
    expect(EMISSIONS_CONFIG.validated).toBe(false);
    expect(compareEmissions(res, 1200).validated).toBe(false);
  });
  it("formats with kg CO2e units", () => {
    expect(formatKg(36960.4)).toBe("36,960 kg CO₂e");
    expect(formatIntensity(0.022)).toBe("0.022 kg CO₂e/t-km");
  });
});

describe("missing-value handling", () => {
  it.each([[undefined, 100], [100, undefined], [0, 100], [100, -5], [NaN, 100], [100, Infinity]])(
    "returns null for distance=%s tonnes=%s", (d, t) => {
      expect(estimateEmissions(d as number, t as number)).toBeNull();
    });
  it("returns null for a missing or invalid factor", () => {
    expect(estimateEmissions(100, 100, 0)).toBeNull();
    expect(estimateEmissions(100, 100, NaN)).toBeNull();
  });
  it("comparison is unavailable without a quantity, with n/a CSV cells", () => {
    const c = compareEmissions(res, undefined);
    expect(c.available).toBe(false);
    expect(c.lowestRouteId).toBeNull();
    expect(c.rows.every((r) => !r.lowest)).toBe(true);
    expect(emissionsCsvCells(c.rows[0])).toEqual(["n/a", "n/a"]);
    expect(emissionsCsvNote(compareEmissions(res, 1200, 0))[1]).toBe("n/a");
  });
});

describe("lowest-emissions comparison", () => {
  it("covers the three existing recommendations and flags the minimum", () => {
    const c = compareEmissions(res, 1200);
    expect(c.rows.map((r) => r.route.id)).toEqual([res.best.cost.id, res.best.fast.id, res.best.balanced.id]);
    const min = Math.min(...c.rows.map((r) => r.estimate!.kgCo2e));
    expect(c.lowestKg).toBe(min);
    for (const r of c.rows) expect(r.lowest).toBe(r.estimate!.kgCo2e === min);
  });
  it("does not assume the lowest-emissions route is the cheapest or fastest", () => {
    const cheap = route("cheap", 1500, 100_000, 40);
    const fast = route("fast", 1400, 130_000, 20);
    const short = route("short", 1000, 120_000, 30);
    const r: OptimizeResult = { candidates: [cheap, fast, short], best: { cost: cheap, fast, balanced: short } };
    const c = compareEmissions(r, 100);
    expect(c.lowestRouteId).toBe("short");
    expect(c.rows.filter((x) => x.lowest).map((x) => x.strategy)).toEqual(["balanced"]);
    const t = lowestEmissionsTradeoffs(c, r, labels);
    expect(t[0]).toContain("Not the cheapest");
    expect(t[0]).toContain("20,000");
    expect(t[1]).toBe("Not the fastest: 10 h slower than Fastest (20 h).");
  });
  it("says so when the lowest-emissions route is also cheapest and fastest", () => {
    const a = route("a", 900, 50_000, 10);
    const r: OptimizeResult = { candidates: [a], best: { cost: a, fast: a, balanced: a } };
    const c = compareEmissions(r, 100);
    expect(c.rows.every((x) => x.lowest)).toBe(true);
    expect(lowestEmissionsTradeoffs(c, r, labels)).toEqual(["Also the Lowest Cost route.", "Also the Fastest route."]);
  });
  it("reports a lower-emission candidate outside the three recommendations", () => {
    const a = route("a", 1500, 50_000, 10);
    const other = route("other", 800, 90_000, 50);
    const r: OptimizeResult = { candidates: [a, other], best: { cost: a, fast: a, balanced: a } };
    expect(compareEmissions(r, 100).lowerElsewhere?.route.id).toBe("other");
  });
});

describe("report consistency", () => {
  it("CSV cells match the figures shown on the page", () => {
    const c = compareEmissions(res, 1200);
    for (const row of c.rows) {
      const [kg, intensity] = emissionsCsvCells(row);
      expect(Number(kg)).toBe(roundKg(row.estimate!.kgCo2e));
      expect(formatKg(row.estimate!.kgCo2e)).toBe(`${Number(kg).toLocaleString("en-IN")} kg CO₂e`);
      expect(Number(intensity)).toBe(EMISSIONS_CONFIG.factorKgPerTkm);
      expect(Number(kg)).toBe(Math.round(row.route.distanceKm * 1200 * EMISSIONS_CONFIG.factorKgPerTkm));
    }
    expect(emissionsCsvNote(c)).toEqual(["Emissions factor (kg CO2e per tonne-km)", String(EMISSIONS_CONFIG.factorKgPerTkm), EMISSIONS_CONFIG.source]);
  });
});
