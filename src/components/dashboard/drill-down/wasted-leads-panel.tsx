"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { EMPTY_FILTERS, filterRoster, isFiltered } from "@/lib/leads/roster";
import type { CateringLead } from "@/lib/leads/types";

import { ChannelBadge, TabCount, WastedReasonBadge } from "./lead-badges";
import { ClientCell, PhoneCell, RosterTable, type RosterColumn } from "./roster-table";
import { RosterToolbar } from "./roster-toolbar";

const COLUMNS: RosterColumn[] = [
  { header: "Client", cell: (lead) => <ClientCell lead={lead} /> },
  { header: "Phone", cell: (lead) => <PhoneCell lead={lead} /> },
  { header: "Channel", cell: (lead) => <ChannelBadge channel={lead.channel} /> },
  { header: "Inquiry Date", cell: (lead) => formatDate(lead.inquiryDate) },
  { header: "Reason", cell: (lead) => <WastedReasonBadge status={lead.initialStatus} /> },
  {
    header: "Call Notes",
    wrap: true,
    cell: (lead) => lead.notes ?? <span className="text-muted-foreground">No notes recorded</span>,
  },
];

export function WastedLeadsPanel({ leads }: { leads: readonly CateringLead[] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const all = filterRoster(leads, filters);
  const noAnswer = all.filter((lead) => lead.initialStatus === "No Answer");
  const notInterested = all.filter((lead) => lead.initialStatus === "Not Interested");

  const tabs = [
    { value: "all", label: "All Wasted", leads: all, caption: "All wasted leads" },
    { value: "no-answer", label: "No Answer", leads: noAnswer, caption: "Leads that did not answer or reply" },
    {
      value: "not-interested",
      label: "Not Interested",
      leads: notInterested,
      caption: "Leads not interested in catering",
    },
  ];

  return (
    <>
      <RosterToolbar filters={filters} onChange={setFilters} />

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
