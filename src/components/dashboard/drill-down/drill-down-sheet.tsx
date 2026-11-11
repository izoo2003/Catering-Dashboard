"use client";

import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatRangeLabel } from "@/lib/format";
import type { CateringEda, DateKey } from "@/lib/leads/types";

import type { DrillDown } from "../kpi-strip";
import { LostLeadsPanel } from "./lost-leads-panel";
import { QualityLeadsPanel, type QualityTab } from "./quality-leads-panel";
import { QuotedLeadsPanel } from "./quoted-leads-panel";
import { WastedLeadsPanel } from "./wasted-leads-panel";
import { WonLeadsPanel } from "./won-leads-panel";

const HEADINGS: Record<DrillDown, { eyebrow: string; title: string; description: string }> = {
  quality: {
    eyebrow: "Quality Leads",
    title: "Follow-Up & Quotation Pipeline",
    description: "Interested clients in the call-center loop, split by quotation status.",
  },
  wasted: {
    eyebrow: "Wasted Leads",
    title: "Unanswered & Not Interested",
    description: "Inquiries that never answered or replied, or said they were not interested in catering.",
  },
  quoted: {
    eyebrow: "Quotations Sent",
    title: "Quotes Awaiting a Decision",
    description: "Interested clients who already received a quotation and have not booked or been marked lost.",
  },
  lost: {
    eyebrow: "Leads Lost",
    title: "Call Center Post-Quotation Loss Analysis",
    description: "Clients who did not convert, with the recorded loss reason and call notes.",
  },
  won: {
    eyebrow: "Leads Won",
    title: "Confirmed Bookings",
    description: "Clients who confirmed a booking, from phone, WhatsApp, ads, and the website.",
  },
};

interface LeadDrillDownSheetProps {
  eda: CateringEda | null;
  drillDown: DrillDown | null;
  /** Tab to show when the Quality Leads drawer opens. */
  qualityTab: QualityTab;
  /** Used for event-date urgency on the Pending Quotation tab. */
  today: DateKey | null;
  onOpenChange: (open: boolean) => void;
}

export function LeadDrillDownSheet({ eda, drillDown, qualityTab, today, onOpenChange }: LeadDrillDownSheetProps) {
  // Keeps the last panel rendered while the sheet animates closed.
  const [shown, setShown] = useState(drillDown);
  if (drillDown && drillDown !== shown) setShown(drillDown);

  const open = drillDown !== null && eda !== null;
  const heading = shown ? HEADINGS[shown] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 data-[side=right]:sm:max-w-5xl">
        {eda && shown && heading && (
          <>
            <SheetHeader className="gap-1 border-b px-6 pt-6 pb-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-gold-ink uppercase">{heading.eyebrow}</p>
              <SheetTitle className="pr-8 font-serif text-2xl font-semibold text-primary">{heading.title}</SheetTitle>
              <SheetDescription>
                {heading.description}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatRangeLabel(eda.range.from, eda.range.to)}
                </span>
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-5 px-6 py-5">
                {shown === "quality" && (
                  <QualityLeadsPanel
                    key={`${eda.range.from}-${eda.range.to}-${qualityTab}`}
                    roster={eda.qualityRoster}
                    today={today}
                    initialTab={qualityTab}
                  />
                )}
                {shown === "wasted" && <WastedLeadsPanel key={eda.range.from + eda.range.to} leads={eda.wastedRoster} />}
                {shown === "quoted" && (
                  <QuotedLeadsPanel key={eda.range.from + eda.range.to} leads={eda.qualityRoster.sentQuotationClients} />
                )}
                {shown === "lost" && <LostLeadsPanel key={eda.range.from + eda.range.to} roster={eda.lostRoster} />}
                {shown === "won" && <WonLeadsPanel key={eda.range.from + eda.range.to} leads={eda.wonRoster} />}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
