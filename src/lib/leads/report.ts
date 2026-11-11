import { formatNumber, formatPKR, formatPct } from "../format";

import { lossHeadline } from "./insights";
import type { LossSummary } from "./roster";
import type { ChannelRoiRow, ChannelSplit } from "./types";

export interface ExecutiveSummaryInput {
  rangeLabel: string;
  total: ChannelSplit;
  qualityScreened: number;
  quotationsSent: number;
  won: ChannelSplit;
  adsSpend: number;
  websiteSpend: number;
}

const noun = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** One paragraph for the period, or a single sentence when nothing came in. */
export function executiveSummary(input: ExecutiveSummaryInput): string {
  if (input.total.total === 0) {
    return `No catering inquiries were recorded for ${input.rangeLabel}.`;
  }

  const bookings =
    input.won.total === 1
      ? "1 booking was confirmed"
      : `${formatNumber(input.won.total)} bookings were confirmed`;

  return `For ${input.rangeLabel}, Colette received ${formatNumber(input.total.total)} catering ${noun(input.total.total, "inquiry", "inquiries")}: ${formatNumber(input.total.whatsappAds)} via WhatsApp, social, and ads, and ${formatNumber(input.total.website)} via the website. The call center screened ${formatNumber(input.qualityScreened)} quality ${noun(input.qualityScreened, "lead", "leads")} and sent ${formatNumber(input.quotationsSent)} ${noun(input.quotationsSent, "quotation", "quotations")}. ${bookings} (${formatNumber(input.won.whatsappAds)} from WhatsApp and ads, ${formatNumber(input.won.website)} from the website). Period spend was ${formatPKR(input.adsSpend + input.websiteSpend)}: ${formatPKR(input.adsSpend)} on WhatsApp and social ads and ${formatPKR(input.websiteSpend)} on the website.`;
}

export interface PeriodConclusionInput {
  ads: ChannelRoiRow;
  website: ChannelRoiRow;
  wonPctOfQuotations: number | null;
  loss: LossSummary;
}

function leadSentence(row: ChannelRoiRow, subject: string): string {
  if (row.leads === 0) return `${subject} recorded no leads.`;
  const leads = `${formatNumber(row.leads)} ${noun(row.leads, "lead", "leads")}`;
  if (row.spendPKR === 0) return `${subject} brought ${leads} with no spend recorded.`;
  return `${subject} brought ${leads} at ${formatPKR(row.costPerLeadPKR)} per lead.`;
}

function wonSentence(row: ChannelRoiRow, name: string): string {
  const subject = name.charAt(0).toUpperCase() + name.slice(1);
  if (row.leadsWon === 0) return `${subject} had no confirmed bookings.`;
  if (row.spendPKR === 0) {
    return `${subject} confirmed ${formatNumber(row.leadsWon)} ${noun(row.leadsWon, "booking", "bookings")} with no spend recorded.`;
  }
  return `Bookings from ${name} cost ${formatPKR(row.costPerWonLeadPKR)} each.`;
}

function followUpTakeaway(wonPctOfQuotations: number | null, loss: LossSummary): string {
  const rate =
    wonPctOfQuotations === null
      ? "No quotations were sent, so a booking rate is not available yet."
      : `${formatPct(wonPctOfQuotations)} of quotations became confirmed bookings.`;

  if (loss.total === 0) {
    return `${rate} No quoted leads were lost. The next period can focus on moving screened leads through to a quotation and a confirmed booking.`;
  }

  const { description } = lossHeadline(loss);
  if (loss.gap > 0) {
    return `${rate} ${description} The next period should tighten call center follow-up after a quotation is sent.`;
  }
  if (loss.gap < 0) {
    return `${rate} ${description} Call center follow-up can still recover leads lost to pricing, silence, or a competitor.`;
  }
  return `${rate} ${description} The next period should keep call center follow-up level with management constraints.`;
}

/** Volume, cost per lead, and cost per won lead, then the follow-up opportunity. */
export function periodConclusion(input: PeriodConclusionInput): string {
  if (input.ads.leads + input.website.leads === 0) {
    return "Neither WhatsApp and social ads nor the website recorded leads in this period. There is no cost per lead or cost per won lead to compare, and call center follow-up can resume when inquiries arrive.";
  }

  return [
    leadSentence(input.ads, "WhatsApp and social ads"),
    leadSentence(input.website, "The website"),
    wonSentence(input.ads, "WhatsApp and social ads"),
    wonSentence(input.website, "the website"),
    followUpTakeaway(input.wonPctOfQuotations, input.loss),
  ].join(" ");
}
