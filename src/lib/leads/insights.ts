import { formatNumber, formatPct } from "../format";

import { percentage } from "./eda";
import type { LossSummary } from "./roster";
import type { LeadQualityBreakdown, LostLeadsRoster, LostReasonCount } from "./types";

const plural = (n: number) => `${formatNumber(n)} lost lead${n === 1 ? "" : "s"}`;

/** `50%` when exact, otherwise `More than 62%` using the percentage rounded down. */
export function wastedShareLabel(pct: number): string {
  return Number.isInteger(pct) ? `${pct}%` : `More than ${Math.floor(pct)}%`;
}

/** Share of leads that never reached a quotation. `null` when the period has no leads. */
export function wastedCallout(leadQuality: LeadQualityBreakdown): string | null {
  if (leadQuality.total === 0) return null;
  const missed = leadQuality.noAnswer + leadQuality.notInterested;
  const pct = percentage(missed, leadQuality.total);
  if (pct === null) return null;
  return `${wastedShareLabel(pct)} of leads (${formatNumber(missed)} of ${formatNumber(leadQuality.total)}) did not reach the quotation stage because they did not answer or were not interested in catering.`;
}

/** Which side of the loss split is the bottleneck for this period. */
export function lossHeadline(summary: LossSummary): { title: string; description: string } {
  const { total, gap, callCenter, management } = summary;
  if (total === 0) {
    return { title: "No lost leads in this period", description: "Every quoted client is still open or has booked." };
  }
  if (gap > 0) {
    return {
      title: "Call center follow-up losses exceed management-side losses",
      description: `${plural(gap)} more on the call center side. Follow-up issues account for ${formatPct(callCenter.sharePct)} of all losses, which faster quotes and follow-ups can recover.`,
    };
  }
  if (gap < 0) {
    return {
      title: "Management-side losses lead this period",
      description: `${plural(-gap)} more from location, date overlap, or guest minimums. Management constraints account for ${formatPct(management.sharePct)} of all losses.`,
    };
  }
  return {
    title: "Losses are evenly split",
    description: `Call center follow-up and management constraints each account for ${plural(callCenter.count)}.`,
  };
}

/** Call-center loss reasons, most common first. */
export function callCenterReasons(lostRoster: LostLeadsRoster): LostReasonCount[] {
  return lostRoster.reasonBreakdown.filter((entry) => entry.category === "Call Center / Follow-up");
}
