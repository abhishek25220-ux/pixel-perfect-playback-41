import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { extractShipment, type Extraction } from "@/lib/rail/ai.functions";
import { ALL_STATIONS, validateInput } from "@/lib/rail/optimizer";
import { CARGO_LABEL, CARGO_TYPES, WAGON_LABEL, WAGON_PREFS, type CargoType, type WagonPref } from "@/lib/rail/cargo";
import type { ShipmentSearch } from "@/lib/rail/search";
import type { Strategy } from "@/lib/rail/optimizer";

const fieldCls = "mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";
const PRIORITY_LABEL: Record<Strategy, string> = { cost: "Lowest cost", fast: "Fastest", balanced: "Balanced" };
const SAMPLE = "Transport 800 tonnes of food grains from Delhi to Mumbai, prefer covered wagons, keep costs low, and deliver within 36 hours.";

type Draft = { origin: string; destination: string; cargo: CargoType | ""; tonnes: string; wagonPref: WagonPref; priority: Strategy; deadlineHours: string; budgetInr: string };

export function FreightCopilot({ onConfirm, busy }: { onConfirm: (s: ShipmentSearch) => void; busy: boolean }) {
  const extract = useServerFn(extractShipment);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notes, setNotes] = useState<{ missing: string[]; constraints: string[]; rationale: string } | null>(null);

  async function interpret() {
    if (text.trim().length < 10) { setStatus("error"); setError("Please describe the shipment in a bit more detail."); return; }
    setStatus("loading"); setError(null);
    try {
      const res = await extract({ data: { text } });
      if (!res.ok) { setStatus("error"); setError(`${res.error} You can still use Manual Entry instead.`); return; }
      const x: Extraction = res.data;
      setDraft({
        origin: x.origin ?? "", destination: x.destination ?? "", cargo: x.cargo ?? "",
        tonnes: x.tonnes != null ? String(x.tonnes) : "", wagonPref: x.wagonPref, priority: x.priority,
        deadlineHours: x.deadlineHours != null ? String(x.deadlineHours) : "", budgetInr: x.budgetInr != null ? String(x.budgetInr) : "",
      });
      setNotes({ missing: x.missing, constraints: x.constraints, rationale: x.rationale });
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(`${e instanceof Error && e.message ? e.message : "AI assistant is unavailable right now."} You can still use Manual Entry instead.`);
    }
  }

  const errors: Record<string, string> = {};
  if (draft) {
    if (!draft.origin) errors.origin = "Origin missing or not in the supported network";
    if (!draft.destination) errors.destination = "Destination missing or not in the supported network";
    if (!draft.cargo) errors.cargo = "Choose a cargo type";
    if (draft.deadlineHours && !(Number(draft.deadlineHours) > 0)) errors.deadlineHours = "Must be a positive number";
    if (draft.budgetInr && !(Number(draft.budgetInr) > 0)) errors.budgetInr = "Must be a positive number";
    if (draft.origin && draft.destination && draft.cargo) {
      Object.assign(errors, validateInput({ origin: draft.origin, destination: draft.destination, cargo: draft.cargo, tonnes: Number(draft.tonnes), wagonPref: draft.wagonPref }));
    } else if (!(Number(draft.tonnes) > 0)) errors.tonnes = "Enter a quantity greater than 0";
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  function confirm() {
    if (!draft || Object.keys(errors).length || !draft.cargo) return;
    onConfirm({
      origin: draft.origin, destination: draft.destination, cargo: draft.cargo, tonnes: Number(draft.tonnes), wagonPref: draft.wagonPref,
      priority: draft.priority,
      ...(draft.deadlineHours ? { deadlineHours: Number(draft.deadlineHours) } : {}),
      ...(draft.budgetInr ? { budgetInr: Number(draft.budgetInr) } : {}),
    });
  }

  return (
    <section aria-labelledby="copilot-title" className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 id="copilot-title" className="font-semibold">AI Freight Copilot</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Describe your shipment in plain words. Review the extracted details, then confirm to optimize.</p>
      <textarea aria-label="Shipment description" rows={3} maxLength={2000} className={fieldCls} placeholder={SAMPLE} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={interpret} disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-70">
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "loading" ? "Reading shipment…" : "Extract details"}
        </button>
        <button type="button" onClick={() => setText(SAMPLE)} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Try sample</button>
      </div>

      {status === "error" && error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </p>
      )}

      {status === "ready" && draft && notes && (
        <div className="mt-5 rounded-xl border bg-secondary/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Details extracted — please review and edit</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <F label="Origin" error={errors.origin}>
              <select aria-label="Copilot origin" className={fieldCls} value={draft.origin} aria-invalid={!!errors.origin} onChange={(e) => set("origin", e.target.value)}>
                <option value="">— Select —</option>
                {ALL_STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </F>
            <F label="Destination" error={errors.destination}>
              <select aria-label="Copilot destination" className={fieldCls} value={draft.destination} aria-invalid={!!errors.destination} onChange={(e) => set("destination", e.target.value)}>
                <option value="">— Select —</option>
                {ALL_STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </F>
            <F label="Cargo type" error={errors.cargo}>
              <select aria-label="Copilot cargo" className={fieldCls} value={draft.cargo} aria-invalid={!!errors.cargo} onChange={(e) => set("cargo", e.target.value as CargoType)}>
                <option value="">— Select —</option>
                {CARGO_TYPES.map((c) => <option key={c} value={c}>{CARGO_LABEL[c]}</option>)}
              </select>
            </F>
            <F label="Quantity (tonnes)" error={errors.tonnes}>
              <input aria-label="Copilot tonnes" type="number" min={1} className={fieldCls} value={draft.tonnes} aria-invalid={!!errors.tonnes} onChange={(e) => set("tonnes", e.target.value)} />
            </F>
            <F label="Wagon preference">
              <select aria-label="Copilot wagon" className={fieldCls} value={draft.wagonPref} onChange={(e) => set("wagonPref", e.target.value as WagonPref)}>
                {WAGON_PREFS.map((w) => <option key={w} value={w}>{WAGON_LABEL[w]}</option>)}
              </select>
            </F>
            <F label="Priority">
              <select aria-label="Copilot priority" className={fieldCls} value={draft.priority} onChange={(e) => set("priority", e.target.value as Strategy)}>
                {(Object.keys(PRIORITY_LABEL) as Strategy[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </F>
            <F label="Deadline (hours, optional)" error={errors.deadlineHours}>
              <input aria-label="Copilot deadline" type="number" min={1} className={fieldCls} value={draft.deadlineHours} onChange={(e) => set("deadlineHours", e.target.value)} />
            </F>
            <F label="Budget (INR, optional)" error={errors.budgetInr}>
              <input aria-label="Copilot budget" type="number" min={1} className={fieldCls} value={draft.budgetInr} onChange={(e) => set("budgetInr", e.target.value)} />
            </F>
          </div>
          {notes.missing.length > 0 && <p className="mt-3 text-sm text-destructive">Missing or unsupported: {notes.missing.join(", ")}</p>}
          {notes.constraints.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Other requirements: {notes.constraints.join("; ")}</p>}
          {notes.rationale && <p className="mt-2 text-sm text-muted-foreground">{notes.rationale}</p>}
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={confirm} disabled={busy || Object.keys(errors).length > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm &amp; optimize
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs font-normal text-destructive">{error}</span>}
    </label>
  );
}
