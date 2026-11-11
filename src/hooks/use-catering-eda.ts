"use client";

import { useCallback, useEffect, useState } from "react";

import { toDateKey, toDateKeyRange } from "@/lib/leads/dates";
import type { CateringEdaResponse, DateKeyRange, DateRange } from "@/lib/leads/types";

export async function fetchCateringEda(
  range: DateRange | DateKeyRange | "all",
  { refresh = false, signal }: { refresh?: boolean; signal?: AbortSignal } = {},
): Promise<CateringEdaResponse> {
  const params = new URLSearchParams();
  if (range === "all") {
    params.set("all", "1");
  } else {
    const { from, to } = toDateKeyRange(range);
    params.set("from", from);
    params.set("to", to);
  }
  if (refresh) params.set("refresh", "1");

  const response = await fetch(`/api/catering/eda?${params}`, { signal, cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new Error(message ?? `Request failed (${response.status})`);
  }
  return body as CateringEdaResponse;
}

type Result =
  | { key: string; data: CateringEdaResponse; error: null }
  | { key: string; data: null; error: string };

/**
 * Loads catering EDA from the API. `"all"` covers every inquiry. A partial range waits
 * until both ends are set; the last result stays on screen until the next one arrives.
 */
export function useCateringEda(range: Partial<DateRange> | "all" | undefined) {
  const all = range === "all";
  const from = !all && range?.from ? toDateKey(range.from) : null;
  const to = !all && range?.to ? toDateKey(range.to) : null;

  const [refreshCount, setRefreshCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<CateringEdaResponse | null>(null);

  const requestKey = all ? `all|${refreshCount}` : from && to ? `${from}|${to}|${refreshCount}` : null;

  useEffect(() => {
    const query = all ? ("all" as const) : from && to ? { from, to } : null;
    if (!requestKey || !query) return;
    const controller = new AbortController();

    fetchCateringEda(query, { refresh: refreshCount > 0, signal: controller.signal }).then(
      (data) => {
        setResult({ key: requestKey, data, error: null });
        setLastData(data);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          data: null,
          error: error instanceof Error ? error.message : "Could not load catering leads.",
        });
      },
    );

    return () => controller.abort();
  }, [all, from, to, requestKey, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((n) => n + 1), []);
  const settled = result !== null && result.key === requestKey;

  return {
    eda: lastData?.eda ?? null,
    meta: lastData?.meta ?? null,
    error: settled ? result.error : null,
    isLoading: requestKey !== null && !settled,
    refresh,
  };
}
