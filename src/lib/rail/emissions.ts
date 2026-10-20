// Estimated CO2e for the optimizer's existing route recommendations.
// ILLUSTRATIVE ONLY: the factor below is a placeholder assumption, NOT official
// Indian Railways data and NOT a validated emissions factor.
// Formula (one rule for every route):
//   tonne-km   = route distance (km) × shipment quantity (t)
//   kg CO2e    = tonne-km × factor (kg CO2e per tonne-km)
// To use a validated factor, change EMISSIONS_CONFIG (or pass `factor`) and set `validated: true`.
import type { OptimizeResult, RouteOption, Strategy } from "./optimizer";
import { formatInr, formatNum } from "./api";

export const EMISSIONS_CONFIG = {
  /** kg CO2e per tonne-km of line-haul rail freight. Illustrative placeholder value. */
  factorKgPerTkm: 0.022,
  /** Set to true only when factorKgPerTkm comes from a validated, cited source. */
  validated: false,
  source: "Illustrative assumption for this prototype — not official Indian Railways data.",
  excludes: [
    "terminal handling and transfer operations",
    "first/last-mile road legs",
    "empty wagon return journeys",
    "traction-mix differences (electric vs diesel) between corridors",
    "infrastructure and rolling-stock manufacture",
  ],
} as const;

export interface EmissionsEstimate {
  tonneKm: number;
  kgCo2e: number;
  kgPerTonne: number;
  kgPerTkm: number;
}

const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
export const isValidFactor = positive;

/** kg CO2e = distance × tonnes × factor. Returns null when any input is missing, non-finite or ≤ 0. */
export function estimateEmissions(
  distanceKm: number | undefined | null,
  tonnes: number | undefined | null,
  factor: number = EMISSIONS_CONFIG.factorKgPerTkm,
): EmissionsEstimate | null {
  if (!positive(distanceKm) || !positive(tonnes) || !positive(factor)) return null;
  const tonneKm = distanceKm * tonnes;
  return { tonneKm, kgCo2e: tonneKm * factor, kgPerTonne: distanceKm * factor, kgPerTkm: factor };
}

export interface EmissionsRow {
  strategy: Strategy;
  route: RouteOption;
  estimate: EmissionsEstimate | null;
  lowest: boolean;
}

export interface EmissionsComparison {
  rows: EmissionsRow[];
  factor: number;
  validated: boolean;
  /** False when no recommendation could be estimated (e.g. missing quantity or factor). */
  available: boolean;
  lowestRouteId: string | null;
  lowestKg: number | null;
  /** An evaluated candidate outside the three recommendations with lower estimated emissions, if any. */
  lowerElsewhere: { route: RouteOption; estimate: EmissionsEstimate } | null;
}

const STRATS: Strategy[] = ["cost", "fast", "balanced"];
const EPS = 1e-6;

export function compareEmissions(
  result: OptimizeResult,
  tonnes: number | undefined | null,
  factor: number = EMISSIONS_CONFIG.factorKgPerTkm,
): EmissionsComparison {
  const rows: EmissionsRow[] = STRATS.map((strategy) => {
    const route = result.best[strategy];
    return { strategy, route, estimate: estimateEmissions(route?.distanceKm, tonnes, factor), lowest: false };
  });
  const kgs = rows.flatMap((r) => (r.estimate ? [r.estimate.kgCo2e] : []));
  const lowestKg = kgs.length ? Math.min(...kgs) : null;
  let lowestRouteId: string | null = null;
  if (lowestKg !== null) {
    for (const r of rows) if (r.estimate && Math.abs(r.estimate.kgCo2e - lowestKg) < EPS) r.lowest = true;
    // Ties between distinct routes keep the first strategy's route as the reference.
    lowestRouteId = rows.find((r) => r.lowest)!.route.id;
  }
  let lowerElsewhere: EmissionsComparison["lowerElsewhere"] = null;
  if (lowestKg !== null) {
    const recIds = new Set(rows.map((r) => r.route.id));
    for (const route of result.candidates) {
      if (recIds.has(route.id)) continue;
      const estimate = estimateEmissions(route.distanceKm, tonnes, factor);
      if (estimate && estimate.kgCo2e < lowestKg - EPS && (!lowerElsewhere || estimate.kgCo2e < lowerElsewhere.estimate.kgCo2e))
        lowerElsewhere = { route, estimate };
    }
  }
  return {
    rows,
    factor,
    validated: EMISSIONS_CONFIG.validated && factor === EMISSIONS_CONFIG.factorKgPerTkm,
    available: lowestKg !== null,
    lowestRouteId,
    lowestKg,
    lowerElsewhere,
  };
}

/** How the lowest-emissions route compares on cost and time — computed, never assumed. */
export function lowestEmissionsTradeoffs(cmp: EmissionsComparison, result: OptimizeResult, labels: Record<Strategy, string>): string[] {
  const row = cmp.rows.find((r) => r.lowest);
  if (!row) return [];
  const r = row.route;
  const { cost, fast } = result.best;
  const out: string[] = [];
  out.push(r.id === cost.id ? `Also the ${labels.cost} route.` : `Not the cheapest: ${formatInr(r.costInr - cost.costInr)} more than ${labels.cost} (${formatInr(cost.costInr)}).`);
  out.push(r.id === fast.id ? `Also the ${labels.fast} route.` : `Not the fastest: ${r.hours - fast.hours} h slower than ${labels.fast} (${fast.hours} h).`);
  return out;
}

/** Shared rounding so the page, print report and CSV always show the same figures. */
export const roundKg = (n: number) => Math.round(n);
export const formatKg = (n: number) => `${formatNum(roundKg(n))} kg CO₂e`;
export const formatKgPerTonne = (n: number) => `${n.toFixed(2)} kg CO₂e/t`;
export const formatIntensity = (n: number) => `${n} kg CO₂e/t-km`;

/** CSV cells appended to each strategy row: [kg CO2e, kg CO2e per t-km]. */
export function emissionsCsvCells(row: EmissionsRow): [string, string] {
  return row.estimate ? [String(roundKg(row.estimate.kgCo2e)), String(row.estimate.kgPerTkm)] : ["n/a", "n/a"];
}

export function emissionsCsvNote(cmp: EmissionsComparison): string[] {
  return [
    "Emissions factor (kg CO2e per tonne-km)",
    isValidFactor(cmp.factor) ? String(cmp.factor) : "n/a",
    cmp.validated ? "Validated factor" : EMISSIONS_CONFIG.source,
  ];
}
