import type { DateKey, DateKeyRange, DateRange } from "./types";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
/** Google Sheets serial day 0. */
const SHEETS_EPOCH_UTC = Date.UTC(1899, 11, 30);

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

function buildKey(year: number, month: number, day: number): DateKey | null {
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Uses local calendar components so a picker date never shifts a day across time zones. */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  return match !== null && buildKey(+match[1], +match[2], +match[3]) !== null;
}

/** Local midnight for the given key. */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function keyToUtc(key: DateKey): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = new Date(keyToUtc(key) + days * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function daysInclusive(from: DateKey, to: DateKey): number {
  return Math.round((keyToUtc(to) - keyToUtc(from)) / MS_PER_DAY) + 1;
}

export function overlapDays(a: DateKeyRange, b: DateKeyRange): number {
  const start = a.from > b.from ? a.from : b.from;
  const end = a.to < b.to ? a.to : b.to;
  return start > end ? 0 : daysInclusive(start, end);
}

export function toDateKeyRange(range: DateRange | DateKeyRange): DateKeyRange {
  const from = typeof range.from === "string" ? range.from : toDateKey(range.from);
  const to = typeof range.to === "string" ? range.to : toDateKey(range.to);
  return { from, to };
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parses the date formats that show up in a hand-maintained sheet:
 * ISO (`2026-11-03`, with or without time), slash or dash day-first (`03/11/2026`,
 * swapped to month-first only when the day-first reading is impossible),
 * month names (`3 Nov 2026`, `Nov 3, 2026`), and Sheets serial numbers.
 */
export function parseSheetDate(value: unknown): DateKey | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(SHEETS_EPOCH_UTC + Math.floor(value) * MS_PER_DAY);
    return buildKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateKey(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) return buildKey(+iso[1], +iso[2], +iso[3]);

  const numeric = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})\b/.exec(text);
  if (numeric) {
    const a = +numeric[1];
    const b = +numeric[2];
    const year = numeric[3].length === 2 ? 2000 + +numeric[3] : +numeric[3];
    return buildKey(year, b, a) ?? buildKey(year, a, b);
  }

  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([a-z]{3})[a-z]*\.?,?[\s\-]+(\d{4})/i.exec(text);
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()];
    return month ? buildKey(+dayFirst[3], month, +dayFirst[1]) : null;
  }

  const monthFirst = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i.exec(text);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    return month ? buildKey(+monthFirst[3], month, +monthFirst[2]) : null;
  }

  return null;
}

/**
 * Event dates in the call-center log often omit the year (`29th Sep`, `10Oct`, `5-Sep`).
 * Falls back to `fallbackYear` from the inquiry date. Month-only values and "Not Decide" stay empty.
 */
export function parseEventDate(value: unknown, fallbackYear?: number): DateKey | null {
  const direct = parseSheetDate(value);
  if (direct) return direct;
  if (!fallbackYear) return null;

  const raw = String(value ?? "").trim();
  if (!raw || /^(not\s*decide|tbd|n\/?a|na|-)$/i.test(raw)) return null;

  const compact = raw.replace(/(\d)(?:st|nd|rd|th)\b/gi, "$1");
  const match = /^(\d{1,2})[\s\-]*([a-z]{3,})/i.exec(compact);
  if (!match) return null;
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  return month ? buildKey(fallbackYear, month, +match[1]) : null;
}

/** Parses `2026-10`, `Oct 2026`, or `October 2026` into the month's first and last day. */
export function parseSheetMonth(value: unknown): DateKeyRange | null {
  const text = String(value ?? "").trim();
  if (!text) return null;

  let year: number | undefined;
  let month: number | undefined;

  const iso = /^(\d{4})-(\d{1,2})$/.exec(text);
  const named = /^([a-z]{3})[a-z]*\.?[\s\-,]+(\d{4})$/i.exec(text);
  if (iso) {
    year = +iso[1];
    month = +iso[2];
  } else if (named) {
    year = +named[2];
    month = MONTHS[named[1].toLowerCase()];
  }

  if (!year || !month || month < 1 || month > 12) return null;
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`,
  };
}
