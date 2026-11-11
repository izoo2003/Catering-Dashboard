import type { ReactNode } from "react";
import { InboxIcon, SearchXIcon } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CateringLead } from "@/lib/leads/types";

export interface RosterColumn {
  header: string;
  cell: (lead: CateringLead) => ReactNode;
  align?: "right";
  /** Lets long text such as call notes wrap instead of widening the table. */
  wrap?: boolean;
}

interface RosterTableProps {
  caption: string;
  leads: readonly CateringLead[];
  columns: readonly RosterColumn[];
  /** Whether a search or channel filter is narrowing the list; changes the empty-state message. */
  filtered: boolean;
}

export function RosterTable({ caption, leads, columns, filtered }: RosterTableProps) {
  if (leads.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">{filtered ? <SearchXIcon aria-hidden /> : <InboxIcon aria-hidden />}</EmptyMedia>
          <EmptyTitle>{filtered ? "No clients match these filters" : "No clients in this list"}</EmptyTitle>
          <EmptyDescription>
            {filtered
              ? "Clear the search or switch channels to see more clients."
              : "None of the inquiries are in this list."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table className="tabular-nums">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.header}
                className={cn(
                  "text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-4",
                  column.align === "right" && "text-right",
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              {columns.map((column) => (
                <TableCell
                  key={column.header}
                  className={cn(
                    "first:pl-4 last:pr-4",
                    column.align === "right" && "text-right",
                    column.wrap && "min-w-64 whitespace-normal",
                  )}
                >
                  {column.cell(lead)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ClientCell({ lead }: { lead: CateringLead }) {
  return <span className="font-medium text-foreground">{lead.clientName}</span>;
}

export function PhoneCell({ lead }: { lead: CateringLead }) {
  if (!lead.phone) return <span className="text-muted-foreground">—</span>;
  return (
    <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="text-foreground underline-offset-4 hover:underline">
      {lead.phone}
    </a>
  );
}
