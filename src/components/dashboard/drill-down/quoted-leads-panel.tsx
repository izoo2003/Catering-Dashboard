"use client";

import { useState } from "react";

import { formatDate, formatPKR } from "@/lib/format";
import { EMPTY_FILTERS, filterRoster, followUpStatus, isFiltered } from "@/lib/leads/roster";
import type { CateringLead } from "@/lib/leads/types";

import { ChannelBadge, FollowUpBadge } from "./lead-badges";
import { ClientCell, PhoneCell, RosterTable, type RosterColumn } from "./roster-table";
import { RosterToolbar } from "./roster-toolbar";

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;

const COLUMNS: RosterColumn[] = [
  { header: "Client Name", cell: (lead) => <ClientCell lead={lead} /> },
  { header: "Phone", cell: (lead) => <PhoneCell lead={lead} /> },
  { header: "Channel", cell: (lead) => <ChannelBadge channel={lead.channel} /> },
  {
    header: "Quoted Amount",
    align: "right",
    cell: (lead) => <span className="font-medium text-foreground">{formatPKR(lead.quotedAmountPKR)}</span>,
  },
  { header: "Date Sent", cell: (lead) => formatDate(lead.quotationSentDate) },
  { header: "Event Date", cell: (lead) => (lead.eventDate ? formatDate(lead.eventDate) : muted("Not given")) },
  { header: "Follow-up Status", cell: (lead) => <FollowUpBadge status={followUpStatus(lead)} /> },
];

export function QuotedLeadsPanel({ leads }: { leads: readonly CateringLead[] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const visible = filterRoster(leads, filters);

  return (
    <>
      <p className="text-muted-foreground">
        Interested clients who already received a quotation and are still waiting on a decision.
      </p>
      <RosterToolbar filters={filters} onChange={setFilters} />
      <RosterTable
        caption="Clients who received a quotation and are still awaiting a decision"
        leads={visible}
        columns={COLUMNS}
        filtered={isFiltered(filters)}
      />
    </>
  );
}
