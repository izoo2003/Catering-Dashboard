"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPKR } from "@/lib/format";
import type { ChannelRoiRow } from "@/lib/leads/types";

import { SectionHeading } from "./section-heading";

const chartConfig = {
  whatsappAds: { label: "WhatsApp / Ads", color: "var(--primary)" },
  website: { label: "Website", color: "var(--gold)" },
} satisfies ChartConfig;

interface ChannelRoiCardProps {
  roi: ChannelRoiRow[];
  spendAdjusted: boolean;
}

export function ChannelRoiCard({ roi, spendAdjusted }: ChannelRoiCardProps) {
  const ads = roi.find((row) => row.key === "whatsappAds");
  const website = roi.find((row) => row.key === "website");

  return (
    <Card className="h-full">
      <SectionHeading
        eyebrow="Channel ROI"
        title="Spending vs. Results"
        description="Spend, cost per lead, and cost per confirmed booking for WhatsApp and social ads against the website."
      />
      <CardContent className="flex flex-col gap-6">
        <Table>
          <TableCaption className="sr-only">Channel spend, leads, cost per lead, leads won, and cost per won lead</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Spend (PKR)</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Cost per lead</TableHead>
              <TableHead className="text-right">Leads won</TableHead>
              <TableHead className="text-right">Cost per won lead</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roi.map((row) => (
              <TableRow key={row.key} className={row.key === "total" ? "bg-muted/40 font-semibold" : undefined}>
                <TableCell className="whitespace-normal">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {row.label}
                    {row.key === "total" && spendAdjusted && <Badge variant="secondary">Adjusted</Badge>}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPKR(row.spendPKR)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.leads)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPKR(row.costPerLeadPKR)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.leadsWon)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPKR(row.costPerWonLeadPKR)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {ads && website && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CostChart
              title="Cost per lead (PKR)"
              label="Cost per lead by channel"
              ads={ads.costPerLeadPKR}
              website={website.costPerLeadPKR}
            />
            <CostChart
              title="Cost per won lead (PKR)"
              label="Cost per won lead by channel"
              ads={ads.costPerWonLeadPKR}
              website={website.costPerWonLeadPKR}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CostChart({
  title,
  label,
  ads,
  website,
}: {
  title: string;
  label: string;
  ads: number | null;
  website: number | null;
}) {
  const data = [
    { channel: "whatsappAds" as const, label: "WhatsApp / Ads", cost: ads },
    { channel: "website" as const, label: "Website", cost: website },
  ];
  const max = Math.max(ads ?? 0, website ?? 0);

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-foreground">{title}</p>
      <ChartContainer config={chartConfig} aria-label={label} className="aspect-auto h-52 w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 28, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis hide domain={max === 0 ? [0, 1] : [0, "auto"]} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent nameKey="channel" formatter={(value) => formatPKR(typeof value === "number" ? value : null)} />}
          />
          <Bar dataKey="cost" radius={4}>
            {data.map((row) => (
              <Cell key={row.channel} fill={`var(--color-${row.channel})`} />
            ))}
            <LabelList dataKey="cost" content={(props) => <CostLabel {...props} />} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function CostLabel({
  x,
  y,
  width,
  value,
}: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: unknown;
}) {
  if (x == null || y == null || width == null) return null;
  const amount = typeof value === "number" ? value : null;
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 8}
      textAnchor="middle"
      className="fill-foreground text-[11px] tabular-nums"
    >
      {formatPKR(amount)}
    </text>
  );
}
