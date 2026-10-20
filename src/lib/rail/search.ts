import { CARGO_TYPES, WAGON_PREFS, type CargoType, type WagonPref } from "./cargo";
import type { OptimizeInput, Strategy } from "./optimizer";

export const DEFAULT_INPUT: OptimizeInput = { origin: "delhi", destination: "mumbai", cargo: "cement", tonnes: 1200, wagonPref: "open" };

/** Optional shipment goals carried from the AI Freight Copilot to the results page. */
export type ShipmentSearch = OptimizeInput & { priority?: Strategy; deadlineHours?: number; budgetInr?: number };

const STRATEGIES: readonly string[] = ["cost", "fast", "balanced"];

export function parseSearch(s: Record<string, unknown>): ShipmentSearch {
  const str = (v: unknown, d: string) => (typeof v === "string" && v ? v : d);
  const pos = (v: unknown) => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : undefined; };
  const cargo = str(s.cargo, DEFAULT_INPUT.cargo);
  const wagon = str(s.wagonPref, DEFAULT_INPUT.wagonPref);
  const t = Number(s.tonnes);
  const out: ShipmentSearch = {
    origin: str(s.origin, DEFAULT_INPUT.origin),
    destination: str(s.destination, DEFAULT_INPUT.destination),
    cargo: (CARGO_TYPES as readonly string[]).includes(cargo) ? (cargo as CargoType) : DEFAULT_INPUT.cargo,
    wagonPref: (WAGON_PREFS as readonly string[]).includes(wagon) ? (wagon as WagonPref) : DEFAULT_INPUT.wagonPref,
    tonnes: Number.isFinite(t) && t > 0 ? t : DEFAULT_INPUT.tonnes,
  };
  if (typeof s.priority === "string" && STRATEGIES.includes(s.priority)) out.priority = s.priority as Strategy;
  const d = pos(s.deadlineHours); if (d) out.deadlineHours = d;
  const b = pos(s.budgetInr); if (b) out.budgetInr = b;
  return out;
}
