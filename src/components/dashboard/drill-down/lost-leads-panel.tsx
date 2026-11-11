"use client";

import { useState } from "react";
import { HeadsetIcon, ScaleIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR, formatPct } from "@/lib/format";
import { lossHeadline } from "@/lib/leads/insights";
import {
  EMPTY_FILTERS,
  filterRoster,
  isFiltered,
  lossSummary,
  type LossSide,
  type LossSummary,
} from "@/lib/leads/roster";
import type { LostLeadsRoster } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

import { LossCategoryBadge, TabCount } from "./lead-badges";
import { ClientCell, PhoneCell, RosterTable, type RosterColumn } from "./roster-table";
import { RosterToolbar } from "./roster-toolbar";

const COLUMNS: RosterColumn[] = [
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

interface LossStatProps {
  title: string;
  hint: string;
  icon: LucideIcon;
  side: LossSide;
  tone: "lost" | "gold";
}

function LossStat({ title, hint, icon: Icon, side, tone }: LossStatProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md",
              tone === "lost" ? "bg-lost-soft text-lost" : "bg-gold-soft text-gold-ink",
            )}
          >
            <Icon aria-hidden />
          </span>
          {title}
        </CardDescription>
        <CardTitle
          className={cn(
            "flex items-baseline gap-2 font-sans text-3xl font-semibold tabular-nums",
            tone === "lost" ? "text-lost" : "text-primary",
          )}
        >
          <NumberTicker value={side.count} className="tracking-tight text-current" />
          <span className="text-sm font-medium text-muted-foreground">{formatPct(side.sharePct)} of losses</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p className="text-muted-foreground">{hint}</p>
        {side.quotedPKR > 0 ? (
          <p className="font-medium text-foreground tabular-nums">{formatPKR(side.quotedPKR)} in quotes lost</p>
        ) : (
          <p className="text-muted-foreground">No quoted amounts recorded</p>
        )}
      </CardContent>
    </Card>
  );
}

function LossSummaryBanner({ summary }: { summary: LossSummary }) {
  const { title, description } = lossHeadline(summary);
  const callCenterWidth = summary.callCenter.sharePct ?? 0;

  return (
    <BlurFade className="flex flex-col gap-3">
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
          title="Call Center / Follow-up"
          hint="Unresponsive after quote, pricing objections, competitor chosen, or delayed follow-up."
          icon={HeadsetIcon}
          side={summary.callCenter}
          tone="lost"
        />
        <LossStat
          title="Management Side"
          hint="Location issue, date overlap, or guest count under the minimum."
          icon={ScaleIcon}
          side={summary.management}
          tone="gold"
        />
      </div>
    </BlurFade>
  );
}

export function LostLeadsPanel({ roster }: { roster: LostLeadsRoster }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const callCenter = filterRoster(roster.callCenterFollowUp, filters);
  const management = filterRoster(roster.managementSide, filters);
  const all = filterRoster([...roster.callCenterFollowUp, ...roster.managementSide], filters).sort(
    (a, b) => b.inquiryDate.localeCompare(a.inquiryDate) || a.clientName.localeCompare(b.clientName),
  );

  const tabs = [
    { value: "all", label: "All Lost Leads", leads: all, caption: "All lost leads" },
    {
      value: "call-center",
      label: "Call Center Follow-up Loss",
      leads: callCenter,
      caption: "Leads lost to call center follow-up issues",
    },
    {
      value: "management",
      label: "Management Side (Location / Date Overlap / <30 Guests)",
      leads: management,
      caption: "Leads lost to management-side constraints",
    },
  ];

  return (
    <>
      <LossSummaryBanner summary={lossSummary(roster)} />

      <RosterToolbar filters={filters} onChange={setFilters} placeholder="Search name, phone, reason, or notes" />

      <Tabs defaultValue="all" className="gap-4">
        <TabsList className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <TabCount value={tab.leads.length} />
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <RosterTable caption={tab.caption} leads={tab.leads} columns={COLUMNS} filtered={isFiltered(filters)} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
