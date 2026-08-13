/** Catalogue vocabulary — mirrors the product spec's filters. */

export const STYLES = [
  "Vinyasa",
  "Ashtanga",
  "Yin",
  "Hatha",
  "Power",
  "Restorative",
  "Kundalini",
  "Prenatal",
  "Other",
] as const;

export const CONTENT_TYPES = [
  "Sequence",
  "Class Plan",
  "Workshop",
  "Meditation",
  "Training Material",
  "Other",
] as const;

export const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All Levels",
] as const;

export const DURATIONS = [15, 30, 45, 60, 75, 90, 120] as const;

export const TEACHABILITY = [
  {
    value: "ready",
    label: "Ready to Teach",
    hint: "teach it as-is, tomorrow",
  },
  {
    value: "adapt",
    label: "Needs Adaptation",
    hint: "solid base — make it yours",
  },
  {
    value: "inspiration",
    label: "Inspiration Only",
    hint: "ideas and structure to build from",
  },
] as const;

export type TeachabilityValue = (typeof TEACHABILITY)[number]["value"];

export function teachabilityLabel(value: string | null): string | null {
  return TEACHABILITY.find((t) => t.value === value)?.label ?? null;
}

export function durationLabel(minutes: number | null): string | null {
  if (!minutes) return null;
  return minutes >= 120 ? "2 hr+" : `${minutes} min`;
}
