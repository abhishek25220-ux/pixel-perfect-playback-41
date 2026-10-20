// Sample cargo + wagon rules. Illustrative only, not official tariffs.

export const CARGO_TYPES = ["cement", "coal", "foodgrains", "ironore", "container"] as const;
export type CargoType = (typeof CARGO_TYPES)[number];

export const WAGON_PREFS = ["open", "covered", "flat", "auto"] as const;
export type WagonPref = (typeof WAGON_PREFS)[number];
export type WagonType = Exclude<WagonPref, "auto">;

export const CARGO_LABEL: Record<CargoType, string> = {
  cement: "Cement (Bulk)",
  coal: "Coal",
  foodgrains: "Food Grains",
  ironore: "Iron Ore",
  container: "Containerized Goods",
};

export const WAGON_LABEL: Record<WagonPref, string> = {
  open: "Open Wagon",
  covered: "Covered Wagon",
  flat: "Flat Wagon",
  auto: "Auto Recommend",
};

/** Sample base rate in INR per tonne-km. */
export const CARGO_RATE: Record<CargoType, number> = {
  cement: 1.45,
  coal: 1.3,
  foodgrains: 1.55,
  ironore: 1.35,
  container: 1.8,
};

/** Sample handling cost per tonne at each transfer point. */
export const TRANSFER_HANDLING_PER_TONNE = 45;

export const WAGON_CAPACITY_T: Record<WagonType, number> = { open: 60, covered: 58, flat: 40 };

const RECOMMENDED: Record<CargoType, WagonType> = {
  cement: "covered",
  coal: "open",
  foodgrains: "covered",
  ironore: "open",
  container: "flat",
};

const COMPATIBLE: Record<CargoType, WagonType[]> = {
  cement: ["covered", "open"],
  coal: ["open"],
  foodgrains: ["covered"],
  ironore: ["open"],
  container: ["flat"],
};

export interface WagonAdvice {
  wagon: WagonType;
  wagonCount: number;
  note?: string;
}

export function recommendWagon(cargo: CargoType, pref: WagonPref, tonnes: number): WagonAdvice {
  const recommended = RECOMMENDED[cargo];
  let wagon: WagonType = recommended;
  let note: string | undefined;
  if (pref !== "auto") {
    if (COMPATIBLE[cargo].includes(pref)) {
      wagon = pref;
      if (pref !== recommended)
        note = `${WAGON_LABEL[pref]} works for ${CARGO_LABEL[cargo]}, but a ${WAGON_LABEL[recommended]} gives better weather protection.`;
    } else {
      note = `${WAGON_LABEL[pref]} is not suited to ${CARGO_LABEL[cargo]}; suggesting ${WAGON_LABEL[recommended]} instead.`;
    }
  }
  const wagonCount = Math.max(1, Math.ceil(tonnes / WAGON_CAPACITY_T[wagon]));
  return { wagon, wagonCount, note };
}
