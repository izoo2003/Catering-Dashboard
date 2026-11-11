import { fromDateKey } from "./leads/dates";
import type { DateKey } from "./leads/types";

const EM_DASH = "—";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return integer.format(value);
}

export function formatPKR(value: number | null): string {
  return value === null ? EM_DASH : `PKR ${integer.format(value)}`;
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** `5 Oct 2026`, or an em dash when the date is missing. */
export function formatDate(key: DateKey | null | undefined): string {
  return key ? dayMonthYear.format(fromDateKey(key)) : EM_DASH;
}

/** `1 Oct – 31 Oct 2026`, or with both years when the range crosses a year. */
export function formatRangeLabel(from: DateKey, to?: DateKey): string {
  const start = fromDateKey(from);
  if (!to) return `${dayMonthYear.format(start)} – …`;
  const end = fromDateKey(to);
  if (from === to) return dayMonthYear.format(start);
  const startLabel = start.getFullYear() === end.getFullYear() ? dayMonth.format(start) : dayMonthYear.format(start);
  return `${startLabel} – ${dayMonthYear.format(end)}`;
}

/** Expects a 0–100 percentage, as returned by `percentage()`. */
export function formatPct(value: number | null): string {
  return value === null ? EM_DASH : `${value.toFixed(1).replace(/\.0$/, "")}%`;
}
