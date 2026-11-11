"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";
import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCateringEda } from "@/hooks/use-catering-eda";
import {
  isSameSpendOverride,
  saveSpendOverride,
  useSpendOverride,
  type SpendOverride,
} from "@/hooks/use-spend-overrides";
import { fromDateKey, toDateKey } from "@/lib/leads/dates";
import { buildChannelRoi } from "@/lib/leads/eda";
import { rangeForPreset, type DatePreset } from "@/lib/leads/presets";
import type { DateKey, DateKeyRange } from "@/lib/leads/types";

import { DashboardFilterBar } from "./dashboard-filter-bar";
import { DashboardHeader } from "./dashboard-header";
import type { DraftRange } from "./date-range-filter";
import { LeadDrillDownSheet } from "./drill-down/drill-down-sheet";
import type { QualityTab } from "./drill-down/quality-leads-panel";
import { EdaBentoGrid } from "./eda/eda-bento-grid";
import { KpiStrip, type DrillDown } from "./kpi-strip";
import { PeriodReportDialog } from "./report/period-report-dialog";

interface DraftFilters {
  range: DraftRange;
  preset: DatePreset;
  /** `null` until the user edits spend; then it replaces the saved override on generate. */
  spendEdits: SpendOverride | null;
}

const DEFAULT_PRESET = "last-30-days";

type ReportView = "dashboard" | "analysis";

const subscribeNever = () => () => {};

/** Today in the browser's time zone; `null` while server rendering, so presets never mismatch on hydration. */
function useToday(): DateKey | null {
  return useSyncExternalStore(subscribeNever, () => toDateKey(new Date()), () => null);
}

const sameRange = (a: DateKeyRange, b: DateKeyRange) => a.from === b.from && a.to === b.to;

export function DashboardShell() {
  const today = useToday();
  const [draftState, setDraft] = useState<DraftFilters | null>(null);
  const [appliedState, setApplied] = useState<DateKeyRange | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [qualityTab, setQualityTab] = useState<QualityTab>("pending");
  const [view, setView] = useState<ReportView>("dashboard");
  const [reportRequested, setReportRequested] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const defaultRange = today ? rangeForPreset(DEFAULT_PRESET, today) : null;
  const draft = draftState ?? (defaultRange && { range: defaultRange, preset: DEFAULT_PRESET, spendEdits: null });
  const applied = appliedState ?? defaultRange;
  const draftRange = draft?.range.from && draft.range.to ? { from: draft.range.from, to: draft.range.to } : null;

  const { eda, meta, error, isLoading, refresh } = useCateringEda(
    applied ? { from: fromDateKey(applied.from), to: fromDateKey(applied.to) } : undefined,
  );

  const savedDraftSpend = useSpendOverride(draftRange);
  const edaSpendOverride = useSpendOverride(eda ? { from: eda.range.from, to: eda.range.to } : null);

  const sheetSpend = eda && {
    whatsappAds: eda.channelRoi.find((row) => row.key === "whatsappAds")?.spendPKR ?? 0,
    website: eda.channelRoi.find((row) => row.key === "website")?.spendPKR ?? 0,
  };
  const roi =
    eda && sheetSpend
      ? buildChannelRoi(eda.counts, {
          whatsappAds: edaSpendOverride.whatsappAds ?? sheetSpend.whatsappAds,
          website: edaSpendOverride.website ?? sheetSpend.website,
        })
      : null;
  const spendAdjusted = edaSpendOverride.whatsappAds !== null || edaSpendOverride.website !== null;

  const rangeChanged = !draftRange || !applied || !sameRange(draftRange, applied);
  const spendChanged = draft?.spendEdits != null && !isSameSpendOverride(draft.spendEdits, savedDraftSpend);
  const hasUnappliedChanges = rangeChanged || spendChanged;

  function handleRangeChange(range: DraftRange, preset: DatePreset) {
    if (draft) setDraft({ ...draft, range, preset });
  }

  function handleSpendChange(spendEdits: SpendOverride) {
    if (draft) setDraft({ ...draft, spendEdits });
  }

  function openDrillDown(target: DrillDown, tab?: QualityTab) {
    setDrillDown(target);
    if (target === "quality") setQualityTab(tab ?? "pending");
  }

  function handleGenerate() {
    if (!draft || !draftRange) return;
    setReportRequested(true);
    if (!hasUnappliedChanges) {
      refresh();
      return;
    }
    if (draft.spendEdits) saveSpendOverride(draftRange, draft.spendEdits);
    setApplied(draftRange);
    setDraft({ ...draft, spendEdits: null });
    setDrillDown(null);
  }

  useEffect(() => {
    if (!reportRequested || isLoading || error || !eda || !roi || !applied) return;
    if (!sameRange({ from: eda.range.from, to: eda.range.to }, applied)) return;
    setReportOpen(true);
    setReportRequested(false);
  }, [applied, eda, error, isLoading, reportRequested, roi]);

  return (
    <MotionConfig reducedMotion="user">
      <div data-dashboard="" className="flex flex-1 flex-col">
        <DashboardHeader period={eda?.range ?? applied} meta={meta} />

        {today && draft ? (
          <DashboardFilterBar
            today={today}
            range={draft.range}
            preset={draft.preset}
            onRangeChange={handleRangeChange}
            spend={draft.spendEdits ?? savedDraftSpend}
            sheetSpend={draftRange && eda && sameRange(draftRange, eda.range) ? sheetSpend : null}
            onSpendChange={handleSpendChange}
            hasUnappliedChanges={hasUnappliedChanges}
            canGenerate={draftRange !== null}
            isLoading={isLoading}
            onGenerate={handleGenerate}
          />
        ) : (
          <div className="border-y">
            <div className="mx-auto flex w-full max-w-7xl gap-2 px-4 py-3 sm:px-6 lg:px-10">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="ml-auto h-9 w-52" />
            </div>
          </div>
        )}

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>Could not load the period report</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={refresh}>
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          )}

          <Tabs
            value={view}
            onValueChange={(next) => {
              setView(next as ReportView);
              setDrillDown(null);
            }}
            className="gap-6"
          >
            <TabsList variant="line" className="h-9">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="analysis">Graphical Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <KpiStrip
                eda={eda}
                roi={roi}
                spendAdjusted={spendAdjusted}
                activeDrillDown={drillDown}
                onDrillDown={(target) => {
                  setDrillDown((current) => (current === target ? null : target));
                  if (target === "quality") setQualityTab("pending");
                }}
              />
            </TabsContent>

            <TabsContent value="analysis">
              <EdaBentoGrid
                eda={eda}
                roi={roi}
                spendAdjusted={spendAdjusted}
                onOpenQuality={(tab) => openDrillDown("quality", tab)}
                onOpenLost={() => openDrillDown("lost")}
              />
            </TabsContent>
          </Tabs>
        </main>

        {eda && roi && (
          <PeriodReportDialog
            eda={eda}
            roi={roi}
            spendAdjusted={spendAdjusted}
            today={today}
            open={reportOpen}
            onOpenChange={setReportOpen}
          />
        )}

        <LeadDrillDownSheet
          eda={eda}
          drillDown={drillDown}
          qualityTab={qualityTab}
          today={today}
          onOpenChange={(open) => {
            if (!open) setDrillDown(null);
          }}
        />
      </div>
    </MotionConfig>
  );
}
