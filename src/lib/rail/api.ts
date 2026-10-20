// Integration seam for a future Python/FastAPI optimization backend.
// Today this runs the local sample optimizer. When a backend exists, replace
// the body with a fetch to e.g. POST /api/optimize returning OptimizeResult.
import { optimizeRoutes, type OptimizeInput, type OptimizeResult } from "./optimizer";

export async function requestOptimization(input: OptimizeInput): Promise<OptimizeResult | null> {
  return optimizeRoutes(input);
}

export const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const formatNum = (n: number) => new Intl.NumberFormat("en-IN").format(n);
export const DISCLAIMER = "Illustrative prototype estimates only. Not for live booking or official quotations.";
