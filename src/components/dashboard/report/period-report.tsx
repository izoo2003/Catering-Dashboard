"use client";

import type { ReactNode } from "react";
import { InfoIcon, ScaleIcon, TriangleAlertIcon } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChannelBadge,
  FollowUpBadge,
  LossCategoryBadge,
  QuoteStatusBadge,
} from "@/components/dashboard/drill-down/lead-badges";
import { ClientCell, PhoneCell, RosterTable, type RosterColumn } from "@/components/dashboard/drill-down/roster-table";
import { formatDate, formatNumber, formatPKR, formatPct, formatRangeLabel } from "@/lib/format";
import { percentage } from "@/lib/leads/eda";
import { lossHeadline, wastedCallout, wastedShareLabel } from "@/lib/leads/insights";
import { executiveSummary, periodConclusion } from "@/lib/leads/report";
import { daysUntilEvent, followUpStatus, lossSummary } from "@/lib/leads/roster";
import type { CateringEda, CateringLead, ChannelRoiRow, DateKey, FunnelCounts } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const funnelConfig = {
  total: { label: "Total leads", color: "var(--funnel-navy)" },
  quality: { label: "Quality leads", color: "var(--funnel-slate)" },
  quoted: { label: "Quotations sent", color: "var(--gold)" },
  won: { label: "Leads won", color: "var(--won)" },
} satisfies ChartConfig;

const costConfig = {
  whatsappAds: { label: "WhatsApp / Ads", color: "var(--primary)" },
  website: { label: "Website", color: "var(--gold)" },
} satisfies ChartConfig;

const QUALITY_TONES = {
  lost: "[&_[data-slot=progress-indicator]]:bg-lost",
  gold: "[&_[data-slot=progress-indicator]]:bg-gold",
  forest: "[&_[data-slot=progress-indicator]]:bg-primary",
} as const;

interface PeriodReportProps {
  eda: CateringEda;
  roi: ChannelRoiRow[];
  spendAdjusted: boolean;
  today: DateKey | null;
  includeAppendix: boolean;
}

export function PeriodReport({ eda, roi, spendAdjusted, today, includeAppendix }: PeriodReportProps) {
  const rangeLabel = formatRangeLabel(eda.range.from, eda.range.to);
  const ads = roi.find((row) => row.key === "whatsappAds")!;
  const website = roi.find((row) => row.key === "website")!;
  const total = roi.find((row) => row.key === "total")!;
  const summary = executiveSummary({
    rangeLabel,
    total: eda.counts.totalLeads,
    qualityScreened: eda.funnel.qualityLeads.total,
    quotationsSent: eda.funnel.quotationsSent.total,
    won: eda.funnel.leadsWon,
    adsSpend: ads.spendPKR,
    websiteSpend: website.spendPKR,
  });
  const conclusion = periodConclusion({
    ads,
    website,
    wonPctOfQuotations: eda.conversionLoop.wonPctOfQuotationsSent,
    loss: lossSummary(eda.lostRoster),
  });

  const ribbon = [
    { label: "Total leads", value: eda.counts.totalLeads.total, tone: "text-primary" },
    { label: "Quality leads", value: eda.funnel.qualityLeads.total, tone: "text-primary" },
    { label: "Quotations sent", value: eda.funnel.quotationsSent.total, tone: "text-primary" },
    { label: "Leads won", value: eda.funnel.leadsWon.total, tone: "text-won" },
    { label: "Total spend", value: total.spendPKR, tone: "text-primary", prefix: "PKR", adjusted: spendAdjusted },
  ];

  return (
    <article className="flex flex-col gap-10">
      <header className="report-keep flex flex-col gap-5">
        <p className="text-xs font-semibold tracking-[0.28em] text-gold-ink uppercase">Catering performance</p>
        <DialogTitle className="text-3xl leading-tight font-medium text-balance text-primary sm:text-4xl">
          <span className="font-semibold tracking-[0.06em]">COLETTE CATERING</span> <span className="text-gold">—</span>{" "}
          <span className="font-normal italic">{rangeLabel} Catering Performance Report</span>
        </DialogTitle>
        <div className="flex items-center gap-2" aria-hidden>
          <Separator className="bg-gold data-horizontal:w-16" />
          <span className="size-1.5 rotate-45 bg-gold" />
          <Separator className="bg-gold/40 data-horizontal:w-8" />
        </div>
        <DialogDescription>
          Quality leads and quotations sent count every lead that reached that stage, including those later won or lost.
        </DialogDescription>

        <dl className="report-ribbon grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ribbon.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-3">
              <dt className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{metric.label}</dt>
              <dd className={cn("flex flex-wrap items-baseline gap-1.5 text-2xl font-semibold tabular-nums", metric.tone)}>
                {metric.prefix && <span className="text-sm font-medium tracking-normal">{metric.prefix}</span>}
                <NumberTicker value={metric.value} startValue={metric.value} className="tracking-tight text-current" />
                {metric.adjusted && <Badge variant="secondary">Adjusted</Badge>}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <ReportSection index={1} title="Executive Summary" delay={0.05}>
        <p className="text-base leading-relaxed text-foreground">{summary}</p>
      </ReportSection>

      <ReportSection
        index={2}
        title="Catering Ads Performance"
        description="From the first inquiry to a confirmed booking, across WhatsApp, social, ads, and the website."
        delay={0.1}
      >
        <FunnelChart funnel={eda.funnel} />
      </ReportSection>

      <ReportSection
        index={3}
        title="Lead Quality Breakdown"
        description="Where enquiries stopped. Shares are of every lead in this period."
        delay={0.15}
      >
        <LeadQualityTable eda={eda} />
      </ReportSection>

      <ReportSection
        index={4}
        title="Leads in Loop with the Call Center Team"
        description="How interested leads move from the call center to a quotation and a confirmed booking."
        delay={0.2}
      >
        <ConversionTable eda={eda} />
      </ReportSection>

      <ReportSection
        index={5}
        title="Why Leads Were Lost After Quotation Sent"
        description="Quoted clients who did not book, split between management constraints and call center follow-up."
        delay={0.25}
      >
        <LossTable eda={eda} />
      </ReportSection>

      <ReportSection
        index={6}
        title="Spending vs. Results"
        description="Spend, cost per lead, and cost per confirmed booking for WhatsApp and social ads against the website."
        delay={0.3}
        flow
      >
        <RoiSection roi={roi} spendAdjusted={spendAdjusted} ads={ads} website={website} />
      </ReportSection>

      <ReportSection index={7} title="Conclusion" delay={0.35}>
        <p className="text-base leading-relaxed text-foreground">{conclusion}</p>
      </ReportSection>

      {includeAppendix && <Appendix eda={eda} today={today} />}
    </article>
  );
}

function ReportSection({
  index,
  title,
  description,
  delay,
  flow = false,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  delay: number;
  flow?: boolean;
  children: ReactNode;
}) {
  return (
    <BlurFade delay={delay} className="report-reveal">
      <section className={cn("report-section flex flex-col gap-4", flow && "report-section-flow")}>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-medium text-primary">
            <span className="text-gold-ink tabular-nums">{index}.</span> {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </section>
    </BlurFade>
  );
}

function FunnelChart({ funnel }: { funnel: FunnelCounts }) {
  const data = [
    { stage: "total" as const, label: "Total leads", value: funnel.totalLeads.total },
    { stage: "quality" as const, label: "Quality leads", value: funnel.qualityLeads.total },
    { stage: "quoted" as const, label: "Quotations sent", value: funnel.quotationsSent.total },
    { stage: "won" as const, label: "Leads won", value: funnel.leadsWon.total },
  ];
  const max = Math.max(...data.map((row) => row.value), 0);
  const total = funnel.totalLeads.total;

  return (
    <div className="report-chart">
      <ChartContainer config={funnelConfig} aria-label="Catering ads performance, from first inquiry to confirmed booking" className="aspect-auto h-64 w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 28, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
          <YAxis hide domain={max === 0 ? [0, 1] : [0, "auto"]} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="stage" />} />
          <Bar dataKey="value" radius={4}>
            {data.map((row) => (
              <Cell key={row.stage} fill={`var(--color-${row.stage})`} />
            ))}
            <LabelList dataKey="value" content={(props) => <CountLabel {...props} total={total} />} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function CountLabel({
  x,
  y,
  width,
  value,
  total,
}: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: unknown;
  total: number;
}) {
  const count = asNumber(value);
  if (count === null || x == null || y == null || width == null) return null;
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 8}
      textAnchor="middle"
      className="fill-foreground text-[11px] tabular-nums"
    >
      {formatNumber(count)} · {formatPct(percentage(count, total))}
    </text>
  );
}

function LeadQualityTable({ eda }: { eda: CateringEda }) {
  const { leadQuality } = eda;
  const callout = wastedCallout(leadQuality);
  const missed = leadQuality.noAnswer + leadQuality.notInterested;
  const missedPct = percentage(missed, leadQuality.total);
  const rows = [
    { key: "noAnswer", label: "No answer (useless leads from ads)", count: leadQuality.noAnswer, tone: "lost" },
    { key: "notInterested", label: "Not interested in catering", count: leadQuality.notInterested, tone: "lost" },
    { key: "quality", label: "Quality leads (interested / follow-up)", count: leadQuality.quality, tone: "gold" },
    { key: "total", label: "Total leads", count: leadQuality.total, tone: "forest" },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableCaption className="sr-only">Lead quality breakdown with counts and share of total leads</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="w-40 text-right">Share %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const share = percentage(row.count, leadQuality.total);
            return (
              <TableRow key={row.key} className={row.key === "total" ? "font-semibold" : undefined}>
                <TableCell className="whitespace-normal">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-right tabular-nums">{formatPct(share)}</span>
                    <Progress
                      value={share ?? 0}
                      aria-label={`${row.label}: ${formatPct(share)} of leads`}
                      className={cn("w-full", QUALITY_TONES[row.tone])}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {callout && missedPct !== null && (
        <Alert>
          <InfoIcon />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Did not reach quotation
            <Badge variant="secondary" className="tabular-nums">
              {wastedShareLabel(missedPct)}
            </Badge>
          </AlertTitle>
          <AlertDescription>{callout}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ConversionTable({ eda }: { eda: CateringEda }) {
  const { funnel, conversionLoop } = eda;
  const rows = [
    {
      key: "quality",
      stage: "Quality leads filtered by call center",
      basis: "of total leads",
      count: funnel.qualityLeads.total,
      pct: conversionLoop.qualityPctOfTotal,
    },
    {
      key: "quoted",
      stage: "Quotations sent",
      basis: "of quality leads",
      count: funnel.quotationsSent.total,
      pct: conversionLoop.quotationsSentPctOfQuality,
    },
    {
      key: "won",
      stage: "Leads won confirmed",
      basis: "of quotations sent",
      count: funnel.leadsWon.total,
      pct: conversionLoop.wonPctOfQuotationsSent,
    },
  ];

  return (
    <Table>
      <TableCaption className="sr-only">Call center conversion from quality leads to confirmed bookings</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Stage</TableHead>
          <TableHead className="text-right">Count</TableHead>
          <TableHead className="text-right">Conversion %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="whitespace-normal">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{row.stage}</span>
                <span className="text-muted-foreground">{row.basis}</span>
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatPct(row.pct)}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={3} className="p-0">
            <Separator />
          </TableCell>
        </TableRow>
        <TableRow className="font-semibold hover:bg-transparent">
          <TableCell className="whitespace-normal">
            <span className="flex flex-col gap-0.5">
              <span>Overall: won from total leads</span>
              <span className="font-normal text-muted-foreground">of total leads</span>
            </span>
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatNumber(funnel.leadsWon.total)}</TableCell>
          <TableCell className="text-right">
            <Badge className="bg-won-soft text-won tabular-nums">{formatPct(conversionLoop.overallWonPctOfTotal)}</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function LossTable({ eda }: { eda: CateringEda }) {
  const summary = lossSummary(eda.lostRoster);
  const { title, description } = lossHeadline(summary);
  const callCenterWidth = summary.callCenter.sharePct ?? 0;
  const rows = [
    {
      key: "management",
      label: "Management side",
      hint: "Location issue, date overlap, or guest count under the minimum.",
      count: summary.management.count,
      share: summary.management.sharePct,
    },
    {
      key: "call-center",
      label: "Call center / follow-up",
      hint: "Unresponsive after quote, pricing objections, competitor chosen, or delayed follow-up.",
      count: summary.callCenter.count,
      share: summary.callCenter.sharePct,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
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

      <Table>
        <TableCaption className="sr-only">Management-side losses compared with call center follow-up losses</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Lost leads</TableHead>
            <TableHead className="text-right">Share of losses</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="whitespace-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">{row.hint}</span>
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPct(row.share)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(summary.total)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatPct(percentage(summary.total, summary.total))}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function RoiSection({
  roi,
  spendAdjusted,
  ads,
  website,
}: {
  roi: ChannelRoiRow[];
  spendAdjusted: boolean;
  ads: ChannelRoiRow;
  website: ChannelRoiRow;
}) {
  return (
    <div className="flex flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CostChart title="Cost per lead (PKR)" label="Cost per lead by channel" ads={ads.costPerLeadPKR} website={website.costPerLeadPKR} />
        <CostChart
          title="Cost per won lead (PKR)"
          label="Cost per won lead by channel"
          ads={ads.costPerWonLeadPKR}
          website={website.costPerWonLeadPKR}
        />
      </div>
    </div>
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
    <div className="report-chart flex flex-col gap-2">
      <p className="font-medium text-foreground">{title}</p>
      <ChartContainer config={costConfig} aria-label={label} className="aspect-auto h-52 w-full">
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
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 8}
      textAnchor="middle"
      className="fill-foreground text-[11px] tabular-nums"
    >
      {formatPKR(asNumber(value))}
    </text>
  );
}

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;

function Appendix({ eda, today }: { eda: CateringEda; today: DateKey | null }) {
  const pendingColumns: RosterColumn[] = [
    { header: "Client Name", cell: (lead) => <ClientCell lead={lead} /> },
    { header: "Phone", cell: (lead) => <PhoneCell lead={lead} /> },
    { header: "Channel", cell: (lead) => <ChannelBadge channel={lead.channel} /> },
    { header: "Inquiry Date", cell: (lead) => formatDate(lead.inquiryDate) },
    { header: "Event Date", cell: (lead) => (lead.eventDate ? formatDate(lead.eventDate) : muted("Not given")) },
    {
      header: "Est. Guests",
      align: "right",
      cell: (lead) => (lead.guestCount === null ? muted("—") : formatNumber(lead.guestCount)),
    },
    { header: "Assigned Rep", cell: (lead) => lead.handledBy ?? muted("Unassigned") },
    {
      header: "Status",
      cell: (lead) => <QuoteStatusBadge daysToEvent={today ? daysUntilEvent(lead, today) : null} />,
    },
  ];

  const quotedColumns: RosterColumn[] = [
    { header: "Client Name", cell: (lead) => <ClientCell lead={lead} /> },
    { header: "Phone", cell: (lead) => <PhoneCell lead={lead} /> },
    {
      header: "Quoted Amount",
      align: "right",
      cell: (lead) => <span className="font-medium text-foreground">{formatPKR(lead.quotedAmountPKR)}</span>,
    },
    { header: "Date Sent", cell: (lead) => formatDate(lead.quotationSentDate) },
    { header: "Follow-up Status", cell: (lead) => <FollowUpBadge status={followUpStatus(lead)} /> },
  ];

  const lostColumns: RosterColumn[] = [
    { header: "Client Name", cell: (lead) => <ClientCell lead={lead} /> },
    { header: "Phone", cell: (lead) => <PhoneCell lead={lead} /> },
    {
      header: "Quoted Amount",
      align: "right",
      cell: (lead) => <span className="font-medium text-foreground">{formatPKR(lead.quotedAmountPKR)}</span>,
    },
    { header: "Loss Category", cell: (lead) => <LossCategoryBadge category={lead.lostCategory} /> },
    {
      header: "Reason / Call Notes",
      wrap: true,
      cell: (lead) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{lead.lostReasonDetail ?? "Reason not recorded"}</span>
          {lead.notes && <span className="text-muted-foreground">{lead.notes}</span>}
        </div>
      ),
    },
  ];

  const lostLeads = [...eda.lostRoster.callCenterFollowUp, ...eda.lostRoster.managementSide].sort(newestFirst);

  return (
    <BlurFade delay={0.4} className="report-reveal">
      <section className="report-appendix flex flex-col gap-8 border-t pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-medium text-primary">Appendix</h2>
          <p className="text-sm text-muted-foreground">
            Quality leads roster, pending quotation against quotation sent, and the lost client call log.
          </p>
        </div>

        <AppendixTable
          title="Pending quotation"
          description="Interested clients who still need a quotation."
          caption="Interested clients who still need a quotation"
          leads={eda.qualityRoster.pendingQuotationClients}
          columns={pendingColumns}
        />
        <AppendixTable
          title="Quotation sent"
          description="Clients who received a quotation, including those later won or lost."
          caption="Clients who have received a quotation"
          leads={eda.qualityRoster.quotedClients}
          columns={quotedColumns}
        />
        <AppendixTable
          title="Lost client call log"
          description="Quoted clients who did not book, with the recorded reason and call notes."
          caption="Lost clients and their call notes"
          leads={lostLeads}
          columns={lostColumns}
        />
      </section>
    </BlurFade>
  );
}

function AppendixTable({
  title,
  description,
  caption,
  leads,
  columns,
}: {
  title: string;
  description: string;
  caption: string;
  leads: readonly CateringLead[];
  columns: readonly RosterColumn[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-medium text-primary">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <RosterTable caption={caption} leads={leads} columns={columns} filtered={false} />
    </div>
  );
}

const newestFirst = (a: CateringLead, b: CateringLead) =>
  b.inquiryDate.localeCompare(a.inquiryDate) || a.clientName.localeCompare(b.clientName);

function asNumber(value: unknown): number | null {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(count) ? count : null;
}
