"use client";

import {
  BanknoteIcon,
  CircleOffIcon,
  FileTextIcon,
  PartyPopperIcon,
  SparklesIcon,
  UserXIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPKR, formatPct } from "@/lib/format";
import { percentage } from "@/lib/leads/eda";
import type { CateringEda, ChannelRoiRow } from "@/lib/leads/types";

import { KpiCard } from "./kpi-card";

export type DrillDown = "quality" | "wasted" | "lost";

interface KpiStripProps {
  eda: CateringEda | null;
  /** Channel ROI with any spend overrides already applied. */
  roi: ChannelRoiRow[] | null;
  spendAdjusted: boolean;
  activeDrillDown: DrillDown | null;
  onDrillDown: (target: DrillDown) => void;
}

const STAGGER = 0.06;

function Breakdown({ items }: { items: [label: string, value: number][] }) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map(([label, value]) => (
        <div key={label} className="flex gap-1.5">
          <dt>{label}</dt>
          <dd className="font-semibold text-foreground tabular-nums">{formatNumber(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function KpiStrip({ eda, roi, spendAdjusted, activeDrillDown, onDrillDown }: KpiStripProps) {
  if (!eda || !roi) {
    return (
      <section aria-label="Key metrics" aria-busy className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className={i === 6 ? "h-44 rounded-xl sm:col-span-2" : "h-44 rounded-xl"} />
        ))}
      </section>
    );
  }

  const { counts, lostRoster } = eda;
  const total = roi.find((row) => row.key === "total")!;
  const ads = roi.find((row) => row.key === "whatsappAds")!;
  const website = roi.find((row) => row.key === "website")!;
  const wastedPct = percentage(counts.wastedLeads.whatsappAds, counts.totalLeads.whatsappAds);
  const quotedPct = percentage(counts.quotationsSent.total, counts.qualityLeads.total);

  const cards = [
    <KpiCard key="total" title="Total Leads" icon={UsersIcon} value={counts.totalLeads.total}>
      <Badge variant="secondary" className="tabular-nums">
        {formatNumber(counts.totalLeads.whatsappAds)} Ads/WhatsApp + {formatNumber(counts.totalLeads.website)} Website
      </Badge>
    </KpiCard>,

    <KpiCard
      key="wasted"
      title="Wasted Leads"
      icon={CircleOffIcon}
      tone="wasted"
      value={counts.wastedLeads.total}
      action={{
        hint: "Click to view wasted leads →",
        label: "Wasted Leads: view client roster",
        active: activeDrillDown === "wasted",
        onClick: () => onDrillDown("wasted"),
      }}
      badge={
        <Badge variant="destructive" className="tabular-nums">
          {formatPct(wastedPct)} of ad leads
        </Badge>
      }
    >
      <Breakdown
        items={[
          ["No Answer", counts.wastedLeads.noAnswer],
          ["Not Interested", counts.wastedLeads.notInterested],
        ]}
      />
    </KpiCard>,

    <KpiCard
      key="quality"
      title="Quality Leads"
      icon={SparklesIcon}
      tone="gold"
      value={counts.qualityLeads.total}
      action={{
        hint: "Click to view client roster →",
        label: "Quality Leads: view client roster",
        active: activeDrillDown === "quality",
        onClick: () => onDrillDown("quality"),
      }}
    >
      <Breakdown
        items={[
          ["Pending quotation", counts.pendingQuotation.total],
          ["Quotation sent", counts.quotationsSent.total],
        ]}
      />
    </KpiCard>,

    <KpiCard
      key="quoted"
      title="Quotations Sent"
      icon={FileTextIcon}
      value={counts.quotationsSent.total}
      badge={
        <Badge variant="outline" className="tabular-nums">
          {formatPct(quotedPct)} of Quality Leads
        </Badge>
      }
    >
      <p className="text-sm text-muted-foreground">Interested clients awaiting a decision on their quote.</p>
    </KpiCard>,

    <KpiCard
      key="lost"
      title="Leads Lost"
      icon={UserXIcon}
      tone="wasted"
      value={counts.leadsLost.total}
      action={{
        hint: "Click to inspect call center reasons →",
        label: "Leads Lost: inspect loss reasons",
        active: activeDrillDown === "lost",
        onClick: () => onDrillDown("lost"),
      }}
    >
      <Breakdown
        items={[
          ["Management", lostRoster.managementSide.length],
          ["Call center", lostRoster.callCenterFollowUp.length],
        ]}
      />
    </KpiCard>,

    <KpiCard key="won" title="Leads Won" icon={PartyPopperIcon} tone="won" value={counts.leadsWon.total}>
      <Badge className="bg-won-soft text-won tabular-nums">
        {formatNumber(counts.leadsWon.whatsappAds)} Phone/WhatsApp, {formatNumber(counts.leadsWon.website)} Website
      </Badge>
    </KpiCard>,

    <KpiCard
      key="spend"
      title="Total Spend"
      icon={BanknoteIcon}
      prefix="PKR"
      value={total.spendPKR}
      badge={spendAdjusted ? <Badge variant="secondary">Adjusted</Badge> : undefined}
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="tabular-nums">
          CPL {formatPKR(total.costPerLeadPKR)}
        </Badge>
        <Badge variant="outline" className="tabular-nums">
          Cost / Won {formatPKR(total.costPerWonLeadPKR)}
        </Badge>
      </div>
      {total.spendPKR === 0 && !spendAdjusted ? (
        <p className="text-sm text-muted-foreground">No spend recorded. Add it under Channel Spend.</p>
      ) : (
        <Breakdown
          items={[
            ["WhatsApp / Social PKR", ads.spendPKR],
            ["Website PKR", website.spendPKR],
          ]}
        />
      )}
    </KpiCard>,
  ];

  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <BlurFade key={card.key} delay={i * STAGGER} className={card.key === "spend" ? "h-full sm:col-span-2" : "h-full"}>
          {card}
        </BlurFade>
      ))}
    </section>
  );
}
