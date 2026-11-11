import { InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPct } from "@/lib/format";
import { percentage } from "@/lib/leads/eda";
import { wastedCallout, wastedShareLabel } from "@/lib/leads/insights";
import type { LeadQualityBreakdown } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

const TONES = {
  lost: "[&_[data-slot=progress-indicator]]:bg-lost",
  gold: "[&_[data-slot=progress-indicator]]:bg-gold",
  forest: "[&_[data-slot=progress-indicator]]:bg-primary",
} as const;

interface LeadQualityCardProps {
  leadQuality: LeadQualityBreakdown;
}

export function LeadQualityCard({ leadQuality }: LeadQualityCardProps) {
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
    <Card className="h-full">
      <SectionHeading
        eyebrow="Lead quality"
        title="Lead Quality Breakdown"
        description="Where enquiries stopped, including website leads. Shares are of every lead in this period."
      />
      <CardContent className="flex flex-col gap-4">
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
                        className={cn("w-full", TONES[row.tone])}
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
      </CardContent>
    </Card>
  );
}
