"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber, formatPKR } from "@/lib/format";
import { EMPTY_FILTERS, filterRoster, isFiltered } from "@/lib/leads/roster";
import type { CateringLead } from "@/lib/leads/types";

import { ChannelBadge, TabCount } from "./lead-badges";
import { ClientCell, PhoneCell, RosterTable, type RosterColumn } from "./roster-table";
import { RosterToolbar } from "./roster-toolbar";

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;

const COLUMNS: RosterColumn[] = [
  { header: "Client Name", cell: (lead) => <ClientCell lead={lead} /> },
  { header: "Phone", cell: (lead) => <PhoneCell lead={lead} /> },
  { header: "Channel", cell: (lead) => <ChannelBadge channel={lead.channel} /> },
  { header: "Inquiry Date", cell: (lead) => formatDate(lead.inquiryDate) },
  { header: "Event Date", cell: (lead) => (lead.eventDate ? formatDate(lead.eventDate) : muted("Not given")) },
  {
    header: "Guests",
    align: "right",
    cell: (lead) => (lead.guestCount === null ? muted("—") : formatNumber(lead.guestCount)),
  },
  {
    header: "Quoted Amount",
    align: "right",
    cell: (lead) => <span className="font-medium text-foreground">{formatPKR(lead.quotedAmountPKR)}</span>,
  },
];

export function WonLeadsPanel({ leads }: { leads: readonly CateringLead[] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const all = filterRoster(leads, filters);
  const whatsapp = all.filter((lead) => lead.channel === "WhatsApp/Ads");
  const website = all.filter((lead) => lead.channel === "Website");

  const tabs = [
    { value: "all", label: "All won", leads: all, caption: "Confirmed bookings" },
    {
      value: "whatsapp",
      label: "WhatsApp / Ads",
      leads: whatsapp,
      caption: "Bookings from phone, WhatsApp, and ads",
    },
    { value: "website", label: "Website", leads: website, caption: "Bookings from the website" },
  ];

  return (
    <>
      <p className="text-muted-foreground">Confirmed bookings, newest inquiry first.</p>
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
