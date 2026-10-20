import { describe, expect, it } from "vitest";
import { optimizeRoutes, validateInput, pickBest } from "@/lib/rail/optimizer";
import { recommendWagon } from "@/lib/rail/cargo";

const input = { origin: "delhi", destination: "mumbai", cargo: "cement" as const, tonnes: 1200, wagonPref: "open" as const };

describe("optimizer", () => {
  it("lowest cost has minimum cost among candidates", () => {
    const r = optimizeRoutes(input)!;
    expect(r.best.cost.costInr).toBe(Math.min(...r.candidates.map((c) => c.costInr)));
  });
  it("fastest has minimum hours among candidates", () => {
    const r = optimizeRoutes(input)!;
    expect(r.best.fast.hours).toBe(Math.min(...r.candidates.map((c) => c.hours)));
  });
  it("is deterministic", () => {
    expect(optimizeRoutes(input)!.best.balanced.id).toBe(optimizeRoutes(input)!.best.balanced.id);
  });
  it("rejects same origin and destination", () => {
    expect(validateInput({ ...input, destination: "delhi" }).destination).toBeDefined();
  });
  it("rejects zero tonnes", () => {
    expect(validateInput({ ...input, tonnes: 0 }).tonnes).toBeDefined();
  });
  it("redirects coal away from covered wagons", () => {
    expect(recommendWagon("coal", "covered", 600).wagon).toBe("open");
  });
  it("handles a single candidate (ties)", () => {
    const r = optimizeRoutes(input)!;
    const one = pickBest([r.candidates[0]]);
    expect(one.balanced.id).toBe(r.candidates[0].id);
  });
});
