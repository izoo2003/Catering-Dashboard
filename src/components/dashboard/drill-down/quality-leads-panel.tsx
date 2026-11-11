"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber, formatPKR } from "@/lib/format";
import { daysUntilEvent, EMPTY_FILTERS, filterRoster, followUpStatus, isFiltered } from "@/lib/leads/roster";
import type { DateKey, QualityLeadsRoster } from "@/lib/leads/types";

import { ChannelBadge, FollowUpBadge, QuoteStatusBadge, TabCount } from "./lead-badges";
import { ClientCell, PhoneCell, RosterTable, type RosterColumn } from "./roster-table";
import { RosterToolbar } from "./roster-toolbar";

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;

export type QualityTab = "pending" | "quoted";

interface QualityLeadsPanelProps {
  roster: QualityLeadsRoster;
  today: DateKey | null;
  /** Tab selected when the drawer opens. Changing it remounts the panel. */
  initialTab?: QualityTab;
}

export function QualityLeadsPanel({ roster, today, initialTab = "pending" }: QualityLeadsPanelProps) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const pending = filterRoster(roster.pendingQuotationClients, filters);
  const quoted = filterRoster(roster.quotedClients, filters);
  const quotedWon = quoted.filter((lead) => lead.finalOutcome === "Won").length;
  const quotedLost = quoted.filter((lead) => lead.finalOutcome === "Lost").length;

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

  return (
    <>
      <RosterToolbar filters={filters} onChange={setFilters} />

      <Tabs defaultValue={initialTab} className="gap-4">
        <TabsList className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="pending">
            Pending Quotation
            <TabCount value={pending.length} />
          </TabsTrigger>
          <TabsTrigger value="quoted">
            Quotation Sent
            <TabCount value={quoted.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            Needs quotation sent. Interested clients still waiting for a quote, newest inquiry first.
          </p>
          <RosterTable
            caption="Interested clients who still need a quotation"
            leads={pending}
            columns={pendingColumns}
            filtered={isFiltered(filters)}
          />
        </TabsContent>

        <TabsContent value="quoted" className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            Already quoted. Includes clients who later won ({formatNumber(quotedWon)}) or were lost (
            {formatNumber(quotedLost)}), so this count can be higher than the Quality Leads card.
          </p>
          <RosterTable
            caption="Clients who have received a quotation"
            leads={quoted}
            columns={quotedColumns}
            filtered={isFiltered(filters)}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
