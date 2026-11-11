import { addDays, lastDayOfMonth } from "./dates";
import type { DateKey, DateKeyRange } from "./types";

export const DATE_PRESETS = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number]["value"];

const pad = (n: number) => String(n).padStart(2, "0");

/** `today` is a `YYYY-MM-DD` key, so presets never depend on the caller's time zone. */
export function rangeForPreset(preset: Exclude<DatePreset, "custom">, today: DateKey): DateKeyRange {
  const [year, month] = today.split("-").map(Number);

  if (preset === "this-month") {
    return { from: `${year}-${pad(month)}-01`, to: today };
  }
  if (preset === "last-month") {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    return {
      from: `${prevYear}-${pad(prevMonth)}-01`,
      to: `${prevYear}-${pad(prevMonth)}-${pad(lastDayOfMonth(prevYear, prevMonth))}`,
    };
  }
  return { from: addDays(today, -29), to: today };
}
