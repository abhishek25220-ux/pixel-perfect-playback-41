import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Loader2, ArrowLeftRight, Sparkles, Bot, ClipboardList } from "lucide-react";
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
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = mode === "manual" ? "ai" : "manual";
    setMode(next);
    document.getElementById(next === "manual" ? "tab-manual" : "tab-ai")?.focus();
  }

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

  const tabCls = (on: boolean) =>
    `inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-3xl px-4 pb-14 pt-8 sm:px-6">
          <p className="text-sm text-cyan">Freight Optimizer</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Plan your freight shipment</h1>
          <p className="mt-1.5 text-sm text-navy-muted">Compare candidate routes on the sample network and get three recommended options.</p>
        </div>
      </div>
      <main className="mx-auto -mt-8 max-w-3xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="border-b bg-secondary/40 p-2">
            <div role="tablist" aria-label="Entry mode" className="flex gap-1 rounded-lg bg-secondary p-1">
              <button type="button" role="tab" id="tab-manual" aria-controls="panel-manual" aria-selected={mode === "manual"}
                tabIndex={mode === "manual" ? 0 : -1} onClick={() => setMode("manual")} onKeyDown={onTabKey} className={tabCls(mode === "manual")}>
                <ClipboardList className="h-4 w-4" /> Manual Entry
              </button>
              <button type="button" role="tab" id="tab-ai" aria-controls="panel-ai" aria-selected={mode === "ai"}
                tabIndex={mode === "ai" ? 0 : -1} onClick={() => setMode("ai")} onKeyDown={onTabKey} className={tabCls(mode === "ai")}>
                <Bot className="h-4 w-4" /> AI Freight Copilot
              </button>
            </div>
          </div>

          <div role="tabpanel" id="panel-ai" aria-labelledby="tab-ai" hidden={mode !== "ai"}>
            <FreightCopilot busy={loading} onConfirm={runCopilot} />
            {submitError && <p role="alert" className="px-5 pb-5 text-sm text-destructive sm:px-6">{submitError}</p>}
          </div>

          <form role="tabpanel" id="panel-manual" aria-labelledby="tab-manual" hidden={mode !== "manual"} onSubmit={onSubmit} noValidate>
            <section className="p-5 sm:p-6" aria-labelledby="sec-route">
              <SectionHeading n="01" id="sec-route">Route</SectionHeading>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-4">
                <Field label="Origin station / city" error={show("origin")} id="origin">
                  <select id="origin" className={fieldCls} value={origin} aria-invalid={!!show("origin")} onChange={(e) => setOrigin(e.target.value)}>
                    {ALL_STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </Field>
                <button type="button" aria-label="Swap origin and destination" onClick={() => { setOrigin(destination); setDestination(origin); }}
                  className="mx-auto grid h-11 w-11 place-items-center rounded-full border bg-secondary text-secondary-foreground transition hover:bg-accent md:mt-7 md:h-10 md:w-10">
                  <ArrowLeftRight className="h-4 w-4 rotate-90 md:rotate-0" />
                </button>
                <Field label="Destination station / city" error={show("destination")} id="destination">
                  <select id="destination" className={fieldCls} value={destination} aria-invalid={!!show("destination")} onChange={(e) => setDestination(e.target.value)}>
                    {ALL_STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </Field>
              </div>
            </section>

            <section className="border-t p-5 sm:p-6" aria-labelledby="sec-ship">
              <SectionHeading n="02" id="sec-ship">Shipment details</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-3">
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
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground" aria-live="polite">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Suggested: <strong>{WAGON_LABEL[advice.wagon]}</strong> × ~{advice.wagonCount} wagons.{advice.note ? ` ${advice.note}` : ""}
                  </span>
                </div>
              )}
            </section>

            <div className="border-t bg-secondary/30 p-5 sm:p-6">
              {submitError && <p role="alert" className="mb-3 text-sm text-destructive">{submitError}</p>}
              {touched && Object.keys(errors).length > 0 && <p role="alert" className="mb-3 text-sm text-destructive">Please fix the highlighted fields.</p>}
              <button type="submit" disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-70">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Computing routes…" : "Optimize Routes"}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-4"><DisclaimerBar /></div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionHeading({ n, id, children }: { n: string; id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-sm font-semibold">
      <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-accent-foreground">{n}</span>
      {children}
    </h2>
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
