import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RouteMap } from "@/components/rail/RouteMap";
import { stationName, type OptimizeResult, type Strategy } from "@/lib/rail/optimizer";
import { explainStrategy } from "@/lib/rail/explain";
import { formatInr, formatNum } from "@/lib/rail/api";

const STRATS: { key: Strategy; label: string; text: string; bg: string }[] = [
  { key: "cost", label: "Lowest Cost", text: "text-cost", bg: "bg-cost" },
  { key: "fast", label: "Fastest", text: "text-fast", bg: "bg-fast" },
  { key: "balanced", label: "Balanced", text: "text-balanced", bg: "bg-balanced" },
];

/** Opens an interactive view of the existing homepage sample shipment. Reads only the passed optimizer result. */
export function SamplePreviewDialog({ result }: { result: OptimizeResult }) {
  const [active, setActive] = useState<Strategy>("balanced");
  const r = result.best[active];
  const meta = STRATS.find((s) => s.key === active)!;
  const why = explainStrategy(active, result).why;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="rounded px-1.5 py-0.5 text-xs text-navy-muted transition hover:bg-navy-2 hover:text-navy-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan">
          Sample preview
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interactive Sample Preview</DialogTitle>
          <DialogDescription>Delhi → Mumbai · Cement · 1,200 t · illustrative sample estimates</DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="Recommendation" className="flex flex-wrap gap-2">
          {STRATS.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={active === s.key} onClick={() => setActive(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === s.key ? "bg-navy text-navy-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
              <span className={`h-2 w-2 rounded-full ${s.bg}`} />{s.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl bg-navy p-3">
            <RouteMap dark className="h-72 w-full md:h-80" routes={STRATS.map((s) => ({ stops: result.best[s.key].stops, tone: s.key, active: s.key === active }))} />
          </div>
          <div className="space-y-3" role="tabpanel" aria-live="polite">
            <div className={`text-sm font-semibold ${meta.text}`}>{meta.label}</div>
            <p className="text-sm">{r.stops.map(stationName).join(" → ")}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[["Est. cost", formatInr(r.costInr)], ["Transit", `${r.hours} h`], ["Distance", `${formatNum(r.distanceKm)} km`], ["Transfers", String(r.transfers)]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-muted p-2.5">
                  <dt className="text-xs text-muted-foreground">{l}</dt>
                  <dd className="font-mono font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">{why}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
