"use client";

import { HeadsetIcon, ScaleIcon, TriangleAlertIcon } from "lucide-react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatPct } from "@/lib/format";
import { callCenterReasons, lossHeadline } from "@/lib/leads/insights";
import { lossSummary } from "@/lib/leads/roster";
import type { LostLeadsRoster } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

const chartConfig = {
  count: { label: "Lost leads", color: "var(--lost)" },
} satisfies ChartConfig;

interface LostReasonsCardProps {
  lostRoster: LostLeadsRoster;
  onOpenLost: () => void;
}

export function LostReasonsCard({ lostRoster, onOpenLost }: LostReasonsCardProps) {
  const summary = lossSummary(lostRoster);
  const { title, description } = lossHeadline(summary);
  const reasons = callCenterReasons(lostRoster);
  const callCenterWidth = summary.callCenter.sharePct ?? 0;

  return (
    <Card className="h-full">
      <SectionHeading
        eyebrow="After quotation"
        title="Why Leads Were Lost"
        description="Quoted clients who did not book, split between management constraints and call center follow-up."
      />
      <CardContent className="flex flex-col gap-4">
        <Alert variant={summary.callCenterExceeds ? "destructive" : "default"}>
          {summary.callCenterExceeds ? <TriangleAlertIcon /> : <ScaleIcon />}
          <AlertTitle className="font-semibold">{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>

        {summary.total > 0 && (
          <div
            role="img"
            aria-label={`Call center ${formatPct(summary.callCenter.sharePct)}, management ${formatPct(summary.management.sharePct)} of losses`}
            className="flex h-2 overflow-hidden rounded-full bg-gold-soft"
          >
            <div className="bg-lost" style={{ width: `${callCenterWidth}%` }} />
            <div className="flex-1 bg-gold" />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <LossStat
            title="Management side"
            hint="Location issue, date overlap, or guests under 30."
            icon={ScaleIcon}
            count={summary.management.count}
            share={summary.management.sharePct}
            tone="gold"
          />
          <LossStat
            title="Call center follow-up"
            hint="Unresponsive after quote, pricing, a competitor, or a delayed follow-up."
            icon={HeadsetIcon}
            count={summary.callCenter.count}
            share={summary.callCenter.sharePct}
            tone="lost"
          />
        </div>

        {reasons.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No call center reasons recorded</EmptyTitle>
              <EmptyDescription>Loss reasons appear here once a quoted lead is marked lost by the call center.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Call center reasons</p>
            <ChartContainer
              config={chartConfig}
              aria-label="Call center loss reasons"
              className="aspect-auto w-full"
              style={{ height: Math.max(160, reasons.length * 40) }}
            >
              <BarChart
                accessibilityLayer
                data={reasons}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="reason"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={168}
                  tickFormatter={(reason: string) => (reason.length > 26 ? `${reason.slice(0, 24)}…` : reason)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                  {reasons.map((reason) => (
                    <Cell key={reason.reason} fill="var(--color-count)" />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onOpenLost}>
          View lost leads
        </Button>
      </CardFooter>
    </Card>
  );
}

function LossStat({
  title,
  hint,
  icon: Icon,
  count,
  share,
  tone,
}: {
  title: string;
  hint: string;
  icon: typeof ScaleIcon;
  count: number;
  share: number | null;
  tone: "gold" | "lost";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            tone === "lost" ? "bg-lost-soft text-lost" : "bg-gold-soft text-gold-ink",
          )}
        >
          <Icon aria-hidden />
        </span>
        {title}
      </p>
      <p className={cn("flex items-baseline gap-2 text-3xl font-semibold tabular-nums", tone === "lost" ? "text-lost" : "text-primary")}>
        <NumberTicker value={count} className="tracking-tight text-current" />
        <span className="text-sm font-medium text-muted-foreground">{formatPct(share)} of losses</span>
      </p>
      <p className="text-muted-foreground">{hint}</p>
    </div>
  );
}
