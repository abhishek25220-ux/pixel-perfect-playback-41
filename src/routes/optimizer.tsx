import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, ArrowLeftRight, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter, DisclaimerBar } from "@/components/rail/SiteChrome";
import { ALL_STATIONS, validateInput } from "@/lib/rail/optimizer";
import { CARGO_LABEL, CARGO_TYPES, WAGON_LABEL, WAGON_PREFS, recommendWagon, type CargoType, type WagonPref } from "@/lib/rail/cargo";
import { requestOptimization } from "@/lib/rail/api";
import { parseSearch, type ShipmentSearch } from "@/lib/rail/search";
import { FreightCopilot } from "@/components/rail/FreightCopilot";

export const Route = createFileRoute("/optimizer")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | number | undefined>,
  head: () => ({
    meta: [
      { title: "Freight Optimizer — RailOpt AI" },
      { name: "description", content: "Enter origin, destination, cargo and tonnage to compare freight rail routes." },
      { property: "og:title", content: "Freight Optimizer — RailOpt AI" },
      { property: "og:description", content: "Plan a freight shipment and compare lowest-cost, fastest and balanced rail routes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Optimizer,
});

const fieldCls = "mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";

function Optimizer() {
  const navigate = useNavigate();
  const initial = parseSearch(Route.useSearch());
  const [origin, setOrigin] = useState(initial.origin);
  const [destination, setDestination] = useState(initial.destination);
  const [cargo, setCargo] = useState<CargoType>(initial.cargo);
  const [tonnes, setTonnes] = useState(String(initial.tonnes));
  const [wagonPref, setWagonPref] = useState<WagonPref>(initial.wagonPref);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const input = { origin, destination, cargo, tonnes: Number(tonnes), wagonPref };
  const errors = validateInput(input);
  const show = (k: string) => (touched ? errors[k] : undefined);
  const advice = !errors.tonnes ? recommendWagon(cargo, wagonPref, Number(tonnes)) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (Object.keys(errors).length) return;
    setLoading(true);
    try {
      const res = await requestOptimization(input);
      await new Promise((r) => setTimeout(r, 450));
      if (!res) { setSubmitError("No route found between these stations in the sample network."); return; }
      navigate({ to: "/results", search: { ...input } });
    } catch {
      setSubmitError("Something went wrong while computing routes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function runCopilot(s: ShipmentSearch) {
    setOrigin(s.origin); setDestination(s.destination); setCargo(s.cargo); setTonnes(String(s.tonnes)); setWagonPref(s.wagonPref);
    setSubmitError(null);
    setLoading(true);
    try {
      const res = await requestOptimization(s);
      if (!res) { setSubmitError("No route found between these stations in the sample network."); return; }
      navigate({ to: "/results", search: { ...s } });
    } catch {
      setSubmitError("Something went wrong while computing routes. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="text-sm text-cyan">Freight Optimizer</p>
          <h1 className="mt-1 text-3xl font-semibold">Plan your freight shipment</h1>
          <p className="mt-2 text-navy-muted">We'll compare candidate routes on the sample network and recommend three options.</p>
        </div>
      </div>
      <main className="mx-auto -mt-6 max-w-5xl px-4 pb-16 sm:px-6">
        <FreightCopilot busy={loading} onConfirm={runCopilot} />
        <form onSubmit={onSubmit} noValidate className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-start">
            <Field label="Origin station / city" error={show("origin")} id="origin">
              <select id="origin" className={fieldCls} value={origin} aria-invalid={!!show("origin")} onChange={(e) => setOrigin(e.target.value)}>
                {ALL_STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </Field>
            <button type="button" aria-label="Swap origin and destination" onClick={() => { setOrigin(destination); setDestination(origin); }}
              className="mx-auto mt-0 grid h-10 w-10 place-items-center rounded-full border bg-secondary text-secondary-foreground transition hover:bg-accent md:mt-7">
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <Field label="Destination station / city" error={show("destination")} id="destination">
              <select id="destination" className={fieldCls} value={destination} aria-invalid={!!show("destination")} onChange={(e) => setDestination(e.target.value)}>
                {ALL_STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <Field label="Cargo type" id="cargo">
              <select id="cargo" className={fieldCls} value={cargo} onChange={(e) => setCargo(e.target.value as CargoType)}>
                {CARGO_TYPES.map((c) => <option key={c} value={c}>{CARGO_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Quantity (tonnes)" error={show("tonnes")} id="tonnes">
              <input id="tonnes" type="number" inputMode="decimal" min={1} step="any" className={fieldCls} value={tonnes}
                aria-invalid={!!show("tonnes")} onChange={(e) => setTonnes(e.target.value)} onBlur={() => setTouched(true)} />
            </Field>
            <Field label="Wagon preference" id="wagon">
              <select id="wagon" className={fieldCls} value={wagonPref} onChange={(e) => setWagonPref(e.target.value as WagonPref)}>
                {WAGON_PREFS.map((w) => <option key={w} value={w}>{WAGON_LABEL[w]}</option>)}
              </select>
            </Field>
          </div>

          {advice && (
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Suggested: <strong>{WAGON_LABEL[advice.wagon]}</strong> × ~{advice.wagonCount} wagons.{advice.note ? ` ${advice.note}` : ""}
              </span>
            </div>
          )}

          {submitError && <p role="alert" className="mt-4 text-sm text-destructive">{submitError}</p>}
          {touched && Object.keys(errors).length > 0 && <p role="alert" className="mt-4 text-sm text-destructive">Please fix the highlighted fields.</p>}

          <div className="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DisclaimerBar />
            <button type="submit" disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-70">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Computing routes…" : "Optimize Routes"}
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, error, id, children }: { label: string; error?: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
