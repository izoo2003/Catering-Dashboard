"use client";

import { FileChartColumnIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { SpendOverride } from "@/hooks/use-spend-overrides";
import type { DatePreset } from "@/lib/leads/presets";
import type { DateKey } from "@/lib/leads/types";

import { ChannelSpendPopover } from "./channel-spend-popover";
import { DateRangeFilter, type DraftRange } from "./date-range-filter";

interface DashboardFilterBarProps {
  today: DateKey;
  range: DraftRange;
  preset: DatePreset;
  onRangeChange: (range: DraftRange, preset: DatePreset) => void;
  spend: SpendOverride;
  sheetSpend: { whatsappAds: number; website: number } | null;
  onSpendChange: (spend: SpendOverride) => void;
  hasUnappliedChanges: boolean;
  canGenerate: boolean;
  isLoading: boolean;
  onGenerate: () => void;
}

export function DashboardFilterBar({
  today,
  range,
  preset,
  onRangeChange,
  spend,
  sheetSpend,
  onSpendChange,
  hasUnappliedChanges,
  canGenerate,
  isLoading,
  onGenerate,
}: DashboardFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 border-y bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-10">
        <DateRangeFilter range={range} preset={preset} today={today} onChange={onRangeChange} />
        <ChannelSpendPopover value={spend} sheetSpend={sheetSpend} onChange={onSpendChange} />

        <div className="ml-auto flex items-center gap-3">
          {hasUnappliedChanges && (
            <span className="hidden items-center gap-1.5 text-sm text-gold-ink sm:flex">
              <span className="size-1.5 rounded-full bg-gold" aria-hidden />
              Changes not applied
            </span>
          )}
          <Button size="lg" onClick={onGenerate} disabled={!canGenerate || isLoading}>
            {isLoading ? <Spinner data-icon="inline-start" /> : <FileChartColumnIcon data-icon="inline-start" />}
            Generate Period Report
            {hasUnappliedChanges && <span className="sr-only">(changes not applied)</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
