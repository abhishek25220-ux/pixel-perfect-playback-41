// Deterministic client-side route optimizer over the sample network.
// Integration point: swap `optimizeRoutes` for a call to a FastAPI solver
// (see ./api.ts) once a real graph + validated cost model exist.
import { SEGMENTS, STATIONS, stationById, type Segment } from "./data";
import { CARGO_RATE, TRANSFER_HANDLING_PER_TONNE, recommendWagon, type CargoType, type WagonPref, type WagonAdvice } from "./cargo";

export interface OptimizeInput {
  origin: string;
  destination: string;
  cargo: CargoType;
  tonnes: number;
  wagonPref: WagonPref;
}

export interface RouteOption {
  id: string;
  stops: string[];
  segments: Segment[];
  distanceKm: number;
  hours: number;
  costInr: number;
  transfers: number;
  corridors: string[];
  wagon: WagonAdvice;
}

/** Temporary, simulated disruption on one sample segment. Never mutates SEGMENTS. */
export interface Disruption { segmentKey: string; mode: "block" | "delay"; delayHours?: number }

/** Stable id for a segment (endpoints sorted, so direction doesn't matter). */
export const segmentKey = (s: Pick<Segment, "from" | "to">) => [s.from, s.to].sort().join("~");

export type Strategy = "cost" | "fast" | "balanced";

export interface OptimizeResult {
  candidates: RouteOption[];
  best: Record<Strategy, RouteOption>;
}

const DWELL_HOURS_PER_STOP = 2;
const TRANSFER_HOURS = 6;
const MAX_HOPS = 7;

function neighbours(id: string): { seg: Segment; next: string }[] {
  return SEGMENTS.flatMap((seg) =>
    seg.from === id ? [{ seg, next: seg.to }] : seg.to === id ? [{ seg, next: seg.from }] : [],
  );
}

export function findPaths(origin: string, destination: string, disruption?: Disruption): { stops: string[]; segments: Segment[] }[] {
  const out: { stops: string[]; segments: Segment[] }[] = [];
  const walk = (cur: string, stops: string[], segs: Segment[]) => {
    if (cur === destination) { out.push({ stops: [...stops], segments: [...segs] }); return; }
    if (segs.length >= MAX_HOPS) return;
    for (const { seg, next } of neighbours(cur)) {
      if (stops.includes(next)) continue;
      if (disruption?.mode === "block" && segmentKey(seg) === disruption.segmentKey) continue;
      walk(next, [...stops, next], [...segs, seg]);
    }
  };
  walk(origin, [origin], []);
  return out;
}

export function evaluate(stops: string[], segments: Segment[], input: OptimizeInput, disruption?: Disruption): RouteOption {
  const distanceKm = segments.reduce((a, s) => a + s.km, 0);
  let transfers = 0;
  for (let i = 1; i < segments.length; i++) if (segments[i].corridor !== segments[i - 1].corridor) transfers++;
  const runHours = segments.reduce((a, s) => a + s.km / s.speed, 0);
  const delay = disruption?.mode === "delay" && segments.some((s) => segmentKey(s) === disruption.segmentKey)
    ? Math.max(0, Number(disruption.delayHours) || 0) : 0;
  const hours = Math.round(runHours + (stops.length - 2) * DWELL_HOURS_PER_STOP + transfers * TRANSFER_HOURS + delay);
  const rate = CARGO_RATE[input.cargo];
  const haul = segments.reduce((a, s) => a + s.km * rate * s.costFactor * input.tonnes, 0);
  const costInr = Math.round(haul + transfers * TRANSFER_HANDLING_PER_TONNE * input.tonnes);
  const corridors = segments.map((s) => s.corridor).filter((c, i, arr) => arr.indexOf(c) === i);
  return {
    id: stops.join(">"),
    stops,
    segments,
    distanceKm,
    hours,
    costInr,
    transfers,
    corridors,
    wagon: recommendWagon(input.cargo, input.wagonPref, input.tonnes),
  };
}

const safe = (n: number) => (Number.isFinite(n) ? n : Number.POSITIVE_INFINITY);

/** Stable tie-break: fewer transfers, shorter distance, then id. */
export function tieBreak(a: RouteOption, b: RouteOption) {
  return a.transfers - b.transfers || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id);
}

export const BALANCED_WEIGHTS = { cost: 0.5, time: 0.5 } as const;

export interface BalancedBreakdown { id: string; costNorm: number; timeNorm: number; score: number }

/** Min-max normalised cost & time (0 = best among candidates, 1 = worst), combined with the given weights. Lower score is better. */
export function weightedScores(candidates: RouteOption[], weights: { cost: number; time: number }): Map<string, BalancedBreakdown> {
  const costs = candidates.map((c) => safe(c.costInr));
  const times = candidates.map((c) => safe(c.hours));
  const [cMin, cMax] = [Math.min(...costs), Math.max(...costs)];
  const [tMin, tMax] = [Math.min(...times), Math.max(...times)];
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 0 : (v - lo) / (hi - lo));
  return new Map(candidates.map((c) => {
    const costNorm = norm(safe(c.costInr), cMin, cMax);
    const timeNorm = norm(safe(c.hours), tMin, tMax);
    return [c.id, { id: c.id, costNorm, timeNorm, score: weights.cost * costNorm + weights.time * timeNorm }];
  }));
}

/** Min-max normalised cost & time weighted 50/50 (the Balanced strategy). */
export function balancedScores(candidates: RouteOption[]): Map<string, BalancedBreakdown> {
  return weightedScores(candidates, BALANCED_WEIGHTS);
}

export function pickBest(candidates: RouteOption[]): Record<Strategy, RouteOption> {
  if (candidates.length === 0) throw new Error("No candidates");
  const scores = balancedScores(candidates);
  const by = (f: (r: RouteOption) => number) => [...candidates].sort((a, b) => f(a) - f(b) || tieBreak(a, b))[0];
  return {
    cost: by((r) => safe(r.costInr)),
    fast: by((r) => safe(r.hours)),
    balanced: by((r) => scores.get(r.id)!.score),
  };
}

export function validateInput(input: Partial<OptimizeInput>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.origin || !stationById(input.origin)) errors.origin = "Choose a valid origin station.";
  if (!input.destination || !stationById(input.destination)) errors.destination = "Choose a valid destination station.";
  if (input.origin && input.origin === input.destination) errors.destination = "Destination must differ from origin.";
  const t = Number(input.tonnes);
  if (!Number.isFinite(t) || t <= 0) errors.tonnes = "Enter a quantity greater than 0 tonnes.";
  else if (t > 50000) errors.tonnes = "Prototype supports up to 50,000 tonnes per plan.";
  return errors;
}

export function optimizeRoutes(input: OptimizeInput, disruption?: Disruption): OptimizeResult | null {
  const paths = findPaths(input.origin, input.destination, disruption);
  if (paths.length === 0) return null;
  const all = paths.map((p) => evaluate(p.stops, p.segments, input, disruption));
  // Keep the most reasonable candidates (within 1.8x of the shortest distance).
  const minKm = Math.min(...all.map((r) => r.distanceKm));
  const candidates = all
    .filter((r) => r.distanceKm <= minKm * 1.8)
    .sort((a, b) => a.costInr - b.costInr || tieBreak(a, b))
    .slice(0, 8);
  return { candidates, best: pickBest(candidates) };
}

export const stationName = (id: string) => stationById(id)?.name ?? id;
export const ALL_STATIONS = [...STATIONS].sort((a, b) => a.name.localeCompare(b.name));
