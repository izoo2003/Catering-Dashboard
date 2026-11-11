import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPct } from "@/lib/format";
import type { ConversionLoop, FunnelCounts } from "@/lib/leads/types";

import { SectionHeading } from "./section-heading";

interface ConversionLoopCardProps {
  funnel: FunnelCounts;
  conversionLoop: ConversionLoop;
}

export function ConversionLoopCard({ funnel, conversionLoop }: ConversionLoopCardProps) {
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
    <Card className="h-full">
      <SectionHeading
        eyebrow="Call center"
        title="Leads in Loop with Call Center Team"
        description="How interested leads move from the call center to a quotation and a confirmed booking."
      />
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
