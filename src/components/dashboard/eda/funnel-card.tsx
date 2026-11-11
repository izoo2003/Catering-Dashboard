"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatNumber, formatPct } from "@/lib/format";
import { percentage } from "@/lib/leads/eda";
import type { FunnelCounts } from "@/lib/leads/types";

import type { QualityTab } from "../drill-down/quality-leads-panel";
import { SectionHeading } from "./section-heading";

const chartConfig = {
  total: { label: "Total leads (WhatsApp / social / ads)", color: "var(--funnel-navy)" },
  quality: { label: "Quality leads (call center)", color: "var(--funnel-slate)" },
  quoted: { label: "Quotations sent", color: "var(--gold)" },
  won: { label: "Leads won", color: "var(--won)" },
} satisfies ChartConfig;

interface FunnelRow {
  stage: keyof typeof chartConfig;
  label: string;
  value: number;
}

interface FunnelCardProps {
  funnel: FunnelCounts;
  onOpenQuality: (tab: QualityTab) => void;
}

export function FunnelCard({ funnel, onOpenQuality }: FunnelCardProps) {
  const total = funnel.totalLeads.total;
  const data: FunnelRow[] = [
    { stage: "total", label: "Total leads", value: funnel.totalLeads.total },
    { stage: "quality", label: "Quality leads", value: funnel.qualityLeads.total },
    { stage: "quoted", label: "Quotations sent", value: funnel.quotationsSent.total },
    { stage: "won", label: "Leads won", value: funnel.leadsWon.total },
  ];

  function openFromBar(stage: string | undefined) {
    if (stage === "quality") onOpenQuality("pending");
    if (stage === "quoted") onOpenQuality("quoted");
  }

  return (
    <Card className="h-full">
      <SectionHeading
        eyebrow="Funnel"
        title="Catering Ads Performance"
        description="Every lead counts at each stage it reached, across WhatsApp, social, ads, and the website. Select Quality leads or Quotations sent to open that roster."
      />
      <CardContent>
        <ChartContainer config={chartConfig} aria-label="Catering ads performance funnel" className="aspect-auto h-64 w-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 4, left: 8 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={128} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="stage" />} />
            <Bar
              dataKey="value"
              radius={4}
              onClick={(bar) => openFromBar(bar.payload?.stage)}
            >
              {data.map((row) => (
                <Cell
                  key={row.stage}
                  fill={`var(--color-${row.stage})`}
                  className={row.stage === "quality" || row.stage === "quoted" ? "cursor-pointer" : undefined}
                />
              ))}
              <LabelList
                dataKey="value"
                content={(props) => <FunnelLabel {...props} total={total} />}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button variant="outline" onClick={() => onOpenQuality("pending")}>
          Quality leads
        </Button>
        <Button variant="outline" onClick={() => onOpenQuality("quoted")}>
          Quotations sent
        </Button>
      </CardFooter>
    </Card>
  );
}

function FunnelLabel({
  x,
  y,
  width,
  height,
  value,
  total,
}: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
  total: number;
}) {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(count) || x == null || y == null || width == null || height == null) return null;
  return (
    <text
      x={Number(x) + Number(width) + 8}
      y={Number(y) + Number(height) / 2}
      dominantBaseline="central"
      className="fill-foreground text-[11px] tabular-nums"
    >
      {formatNumber(count)} · {formatPct(percentage(count, total))}
    </text>
  );
}
