// Simulated disruption comparison. Reuses optimizeRoutes with an optional disruption
// constraint; the shared sample network and the baseline result are never mutated.
import { SEGMENTS } from "./data";
import { optimizeRoutes, segmentKey, type Disruption, type OptimizeInput, type OptimizeResult, type RouteOption, type Strategy } from "./optimizer";
import { checkRoute, type ConstraintCheck, type Constraints } from "./explain";

export interface DisruptionOutcome {
  disrupted: OptimizeResult | null;
  baselineRoute: RouteOption;
  /** False when the baseline recommendation uses the blocked segment. */
  originalAvailable: boolean;
  /** Best remaining route for the same strategy under the disruption, or null if none exists. */
  alternative: RouteOption | null;
  alternativeCheck: ConstraintCheck | null;
  alternativeFeasible: boolean;
}

export const segmentOptions = () =>
  SEGMENTS.map((s) => ({ key: segmentKey(s), segment: s }));

export function simulateDisruption(
  input: OptimizeInput,
  baseline: OptimizeResult,
  strategy: Strategy,
  disruption: Disruption,
  constraints: Constraints = {},
): DisruptionOutcome {
  const baselineRoute = baseline.best[strategy];
  const uses = baselineRoute.segments.some((s) => segmentKey(s) === disruption.segmentKey);
  const originalAvailable = !(disruption.mode === "block" && uses);
  const disrupted = optimizeRoutes(input, disruption);
  const alternative = disrupted ? disrupted.best[strategy] : null;
  const alternativeCheck = alternative ? checkRoute(alternative, constraints) : null;
  return {
    disrupted,
    baselineRoute,
    originalAvailable,
    alternative,
    alternativeCheck,
    alternativeFeasible: !!alternativeCheck && Object.values(alternativeCheck).every(Boolean),
  };
}
