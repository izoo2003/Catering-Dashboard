"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { DateKeyRange } from "@/lib/leads/types";

/** Per-channel spend for one date range. `null` means "use the Spend sheet value". */
export interface SpendOverride {
  whatsappAds: number | null;
  website: number | null;
}

export const NO_SPEND_OVERRIDE: SpendOverride = { whatsappAds: null, website: null };

const storageKey = ({ from, to }: DateKeyRange) => `colette:spend:${from}|${to}`;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const toAmount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;

function parse(raw: string | null): SpendOverride {
  if (!raw) return NO_SPEND_OVERRIDE;
  try {
    const value = JSON.parse(raw) as Partial<SpendOverride>;
    return { whatsappAds: toAmount(value.whatsappAds), website: toAmount(value.website) };
  } catch {
    return NO_SPEND_OVERRIDE;
  }
}

export function isSameSpendOverride(a: SpendOverride, b: SpendOverride) {
  return a.whatsappAds === b.whatsappAds && a.website === b.website;
}

export function readSpendOverride(range: DateKeyRange): SpendOverride {
  if (typeof window === "undefined") return NO_SPEND_OVERRIDE;
  return parse(localStorage.getItem(storageKey(range)));
}

export function saveSpendOverride(range: DateKeyRange, override: SpendOverride) {
  const key = storageKey(range);
  if (override.whatsappAds === null && override.website === null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(override));
  listeners.forEach((listener) => listener());
}

/** The saved override for `range`; reads as no override during server rendering. */
export function useSpendOverride(range: DateKeyRange | null): SpendOverride {
  const key = range ? storageKey(range) : null;
  const raw = useSyncExternalStore(
    subscribe,
    useCallback(() => (key ? localStorage.getItem(key) : null), [key]),
    () => null,
  );
  return useMemo(() => parse(raw), [raw]);
}
