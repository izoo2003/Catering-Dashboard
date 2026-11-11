"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";
import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCateringEda, useCateringEda } from "@/hooks/use-catering-eda";
import {
  readSpendOverride,
  saveSpendOverride,
  useSpendOverride,
  type SpendOverride,
} from "@/hooks/use-spend-overrides";
import { toDateKey } from "@/lib/leads/dates";
import { buildChannelRoi } from "@/lib/leads/eda";
import type { CateringEda, ChannelRoiRow, DateKey, DateKeyRange } from "@/lib/leads/types";

import { DashboardFilterBar } from "./dashboard-filter-bar";
import { DashboardHeader } from "./dashboard-header";
import { LeadDrillDownSheet } from "./drill-down/drill-down-sheet";
import type { QualityTab } from "./drill-down/quality-leads-panel";
import { EdaBentoGrid } from "./eda/eda-bento-grid";
import { KpiStrip, type DrillDown } from "./kpi-strip";
import { PeriodRangeDialog } from "./report/period-range-dialog";
import { PeriodReportDialog } from "./report/period-report-dialog";

type ReportView = "dashboard" | "analysis";

interface ReportSnapshot {
  eda: CateringEda;
  roi: ChannelRoiRow[];
  spendAdjusted: boolean;
}

const subscribeNever = () => () => {};

/** Today in the browser's time zone; `null` while server rendering, so the calendar never mismatches on hydration. */
function useToday(): DateKey | null {
  return useSyncExternalStore(subscribeNever, () => toDateKey(new Date()), () => null);
}

export function DashboardShell() {
  const today = useToday();
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [qualityTab, setQualityTab] = useState<QualityTab>("pending");
  const [view, setView] = useState<ReportView>("dashboard");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const reportRequest = useRef<AbortController | null>(null);

  const { eda, meta, error, refresh } = useCateringEda("all");

  const dashboardRange = eda ? { from: eda.range.from, to: eda.range.to } : null;
  const spendOverride = useSpendOverride(dashboardRange);
  const sheetSpend = eda && {
    whatsappAds: eda.channelRoi.find((row) => row.key === "whatsappAds")?.spendPKR ?? 0,
    website: eda.channelRoi.find((row) => row.key === "website")?.spendPKR ?? 0,
  };
  const roi =
    eda && sheetSpend
      ? buildChannelRoi(eda.counts, {
          whatsappAds: spendOverride.whatsappAds ?? sheetSpend.whatsappAds,
          website: spendOverride.website ?? sheetSpend.website,
        })
      : null;
  const spendAdjusted = spendOverride.whatsappAds !== null || spendOverride.website !== null;

  function handleSpendChange(next: SpendOverride) {
    if (dashboardRange) saveSpendOverride(dashboardRange, next);
  }

  function openDrillDown(target: DrillDown, tab?: QualityTab) {
    setDrillDown(target);
    if (target === "quality") setQualityTab(tab ?? "pending");
  }

  function handleRangeOpenChange(open: boolean) {
    if (!open) {
      reportRequest.current?.abort();
      reportRequest.current = null;
      setReportLoading(false);
      setReportError(null);
    }
    setRangeOpen(open);
  }

  async function handleReportRange(range: DateKeyRange) {
    reportRequest.current?.abort();
    const controller = new AbortController();
    reportRequest.current = controller;
    setReportLoading(true);
    setReportError(null);

    try {
      const response = await fetchCateringEda(range, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const sheet = {
        whatsappAds: response.eda.channelRoi.find((row) => row.key === "whatsappAds")?.spendPKR ?? 0,
        website: response.eda.channelRoi.find((row) => row.key === "website")?.spendPKR ?? 0,
      };
      const override = readSpendOverride(range);
      setReport({
        eda: response.eda,
        roi: buildChannelRoi(response.eda.counts, {
          whatsappAds: override.whatsappAds ?? sheet.whatsappAds,
          website: override.website ?? sheet.website,
        }),
        spendAdjusted: override.whatsappAds !== null || override.website !== null,
      });
      setRangeOpen(false);
      setReportOpen(true);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setReportError(cause instanceof Error ? cause.message : "Could not build the period report.");
    } finally {
      if (!controller.signal.aborted) setReportLoading(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div data-dashboard="" className="flex flex-1 flex-col">
        <DashboardHeader meta={meta} />

        <DashboardFilterBar
          spend={spendOverride}
          sheetSpend={sheetSpend ?? null}
          onSpendChange={handleSpendChange}
          spendDisabled={!dashboardRange}
          onGenerate={() => handleRangeOpenChange(true)}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>Could not load inquiries</AlertTitle>
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

        {today && (
          <PeriodRangeDialog
            open={rangeOpen}
            onOpenChange={handleRangeOpenChange}
            today={today}
            isLoading={reportLoading}
            error={reportError}
            onGenerate={handleReportRange}
          />
        )}

        {report && (
          <PeriodReportDialog
            eda={report.eda}
            roi={report.roi}
            spendAdjusted={report.spendAdjusted}
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
