import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { STATIONS } from "./data";
import { CARGO_TYPES, WAGON_PREFS } from "./cargo";

const MODEL = "openai/gpt-6-astra";
const stationIds = STATIONS.map((s) => s.id) as [string, ...string[]];

export const extractionSchema = z.object({
  origin: z.enum(stationIds).nullable(),
  destination: z.enum(stationIds).nullable(),
  cargo: z.enum(CARGO_TYPES).nullable(),
  tonnes: z.number().nullable(),
  wagonPref: z.enum(WAGON_PREFS),
  priority: z.enum(["cost", "fast", "balanced"]),
  deadlineHours: z.number().nullable(),
  budgetInr: z.number().nullable(),
  constraints: z.array(z.string()),
  missing: z.array(z.string()),
  rationale: z.string(),
});
export type Extraction = z.infer<typeof extractionSchema>;

export type ExtractResult = { ok: true; data: Extraction } | { ok: false; error: string };

const INSTRUCTIONS = `You are a freight planning assistant for an Indian Railways route-optimization prototype.
Extract routing constraints from the planner's plain-language shipment description.
Map places to the nearest station id from this list only: ${STATIONS.map((s) => `${s.id} (${s.name})`).join(", ")}. If a place is not covered or not stated, use null and add it to "missing".
cargo must be one of: cement, coal, foodgrains, ironore, container (null if unclear). tonnes: convert units to metric tonnes (null if absent).
wagonPref: open, covered, flat, or auto if not specified.
priority: "cost" if they emphasise cheapness/budget, "fast" if urgency/deadline, else "balanced".
deadlineHours / budgetInr: numeric if stated, else null.
constraints: short bullet strings of other requirements (e.g. weather protection, avoid transfers).
rationale: 1-3 sentences explaining the recommended priority and wagon choice. Never invent official prices or live availability.`;

export const extractShipment = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => {
    const text = String(d?.text ?? "").trim();
    if (text.length < 10) throw new Error("Please describe the shipment in a bit more detail.");
    if (text.length > 2000) throw new Error("Description is too long (max 2000 characters).");
    return { text };
  })
  .handler(async ({ data }): Promise<ExtractResult> => {
    const { streamText, Output } = await import("ai");
    const { createGatewayProvider } = await import("./ai.server");
    try {
      const provider = await createGatewayProvider();
      const result = streamText({
        model: provider.responses(MODEL),
        instructions: INSTRUCTIONS,
        messages: [{ role: "user", content: data.text }],
        output: Output.object({ schema: extractionSchema }),
        maxRetries: 0,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const out = await result.output;
      return { ok: true, data: extractionSchema.parse(out) };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("extractShipment failed", status, e);
      if (status === 429) return { ok: false, error: "AI is busy right now. Please wait a moment and try again." };
      if (status === 402) return { ok: false, error: "AI credits are used up for this workspace. Add credits to continue." };
      if (status === 403) return { ok: false, error: "AI access is blocked for this workspace." };
      return { ok: false, error: "Could not interpret the description. Please try again or use the manual form." };
    }
  });
