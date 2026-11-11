"use client";

import { FileChartColumnIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SpendOverride } from "@/hooks/use-spend-overrides";

import { ChannelSpendPopover } from "./channel-spend-popover";

interface DashboardFilterBarProps {
  spend: SpendOverride;
  sheetSpend: { whatsappAds: number; website: number } | null;
  onSpendChange: (spend: SpendOverride) => void;
  spendDisabled: boolean;
  onGenerate: () => void;
}

export function DashboardFilterBar({
  spend,
  sheetSpend,
  onSpendChange,
  spendDisabled,
  onGenerate,
}: DashboardFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 border-y bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-10">
        <ChannelSpendPopover
          value={spend}
          sheetSpend={sheetSpend}
          onChange={onSpendChange}
          disabled={spendDisabled}
        />

        <div className="ml-auto flex items-center gap-3">
          <Button size="lg" onClick={onGenerate}>
            <FileChartColumnIcon data-icon="inline-start" />
            Generate Period Report
          </Button>
        </div>
      </div>
    </div>
  );
}
