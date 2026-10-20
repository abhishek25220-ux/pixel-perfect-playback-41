import { SEGMENTS, STATIONS, stationById } from "@/lib/rail/data";
import { segmentKey } from "@/lib/rail/optimizer";

const W = 400, H = 440;
const LON = [71.5, 89.5], LAT = [11.5, 30];
const px = (lon: number) => ((lon - LON[0]) / (LON[1] - LON[0])) * W;
const py = (lat: number) => H - ((lat - LAT[0]) / (LAT[1] - LAT[0])) * H;

export interface MapRoute { stops: string[]; tone: "cost" | "fast" | "balanced" | "alt"; active?: boolean }

const STROKE = { cost: "var(--cost)", fast: "var(--fast)", balanced: "var(--balanced)", alt: "var(--primary)" };

/** Schematic (not geographic-accurate) network map of the sample graph. */
export function RouteMap({ routes, dark = false, className = "", blocked }: { routes: MapRoute[]; dark?: boolean; className?: string; /** segmentKey of a simulated blocked segment */ blocked?: string }) {
  const highlighted = new Set(routes.flatMap((r) => r.stops));
  const sorted = [...routes].sort((a, b) => Number(!!a.active) - Number(!!b.active));
  return (
    <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} className={className} role="img" aria-label="Schematic route map">
      {SEGMENTS.map((s, i) => {
        const a = stationById(s.from)!, b = stationById(s.to)!;
        if (blocked && segmentKey(s) === blocked)
          return <line key={i} data-blocked="true" x1={px(a.lon)} y1={py(a.lat)} x2={px(b.lon)} y2={py(b.lat)} stroke="var(--destructive)" strokeWidth={4} strokeDasharray="6 5" />;
        return <line key={i} x1={px(a.lon)} y1={py(a.lat)} x2={px(b.lon)} y2={py(b.lat)} stroke={dark ? "var(--navy-border)" : "var(--border)"} strokeWidth={1.5} />;
      })}
      {sorted.map((r) => (
        <polyline
          key={r.tone + r.stops.join()}
          points={r.stops.map((id) => { const st = stationById(id)!; return `${px(st.lon)},${py(st.lat)}`; }).join(" ")}
          fill="none"
          stroke={STROKE[r.tone]}
          strokeWidth={r.active ? 4 : 2.5}
          strokeOpacity={r.active || routes.length === 1 ? 1 : 0.45}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={r.active ? "route-dash" : undefined}
        />
      ))}
      {STATIONS.map((st) => {
        const on = highlighted.has(st.id);
        return (
          <g key={st.id}>
            <circle cx={px(st.lon)} cy={py(st.lat)} r={on ? 4.5 : 2.5} fill={on ? "var(--cyan)" : dark ? "var(--navy-muted)" : "var(--muted-foreground)"} />
            {on && (
              <text x={px(st.lon) + 7} y={py(st.lat) + 4} fontSize={11} fill={dark ? "var(--navy-foreground)" : "var(--foreground)"} fontFamily="var(--font-sans)">
                {st.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
