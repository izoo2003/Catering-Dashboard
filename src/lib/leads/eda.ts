import { daysInclusive, overlapDays } from "./dates";
import type {
  CateringEda,
  CateringLead,
  ChannelRoiRow,
  ChannelSpendPeriod,
  ChannelSplit,
  ConversionLoop,
  DateKeyRange,
  FunnelCounts,
  LeadDataset,
  LeadQualityBreakdown,
  LeadStage,
  LostReasonCount,
  RoiRowKey,
  TopLevelCounts,
} from "./types";

export function getLeadStage(lead: CateringLead): LeadStage {
  if (lead.finalOutcome === "Won") return "Won";
  if (lead.initialStatus !== "Interested") return "Wasted";
  if (lead.finalOutcome === "Lost") return "Lost";
  return lead.quotationStatus === "Quotation Sent" ? "Quotation Sent" : "Pending Quotation";
}

/** Still in the call-center follow-up loop, with a quotation pending or already sent. */
export const isQualityLead = (lead: CateringLead) =>
  lead.initialStatus === "Interested" &&
  lead.finalOutcome === "In Progress" &&
  lead.quotationStatus !== "Not Sent";

export function filterLeadsByRange(leads: readonly CateringLead[], range: DateKeyRange): CateringLead[] {
  return leads.filter((lead) => lead.inquiryDate >= range.from && lead.inquiryDate <= range.to);
}

function split(leads: readonly CateringLead[], predicate: (lead: CateringLead) => boolean): ChannelSplit {
  const result: ChannelSplit = { total: 0, whatsappAds: 0, website: 0 };
  for (const lead of leads) {
    if (!predicate(lead)) continue;
    result.total += 1;
    if (lead.channel === "Website") result.website += 1;
    else result.whatsappAds += 1;
  }
  return result;
}

/** Spend for periods that partly overlap the range is prorated by day. */
export function spendForRange(
  spend: readonly ChannelSpendPeriod[],
  range: DateKeyRange,
): { whatsappAds: number; website: number; total: number } {
  let whatsappAds = 0;
  let website = 0;
  for (const period of spend) {
    const periodRange = { from: period.periodStart, to: period.periodEnd };
    const overlap = overlapDays(periodRange, range);
    if (overlap === 0) continue;
    const share = overlap / daysInclusive(period.periodStart, period.periodEnd);
    whatsappAds += period.whatsappAdsSpendPKR * share;
    website += period.websiteSpendPKR * share;
  }
  whatsappAds = Math.round(whatsappAds);
  website = Math.round(website);
  return { whatsappAds, website, total: whatsappAds + website };
}

export function percentage(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10;
}

const perUnit = (spend: number, units: number) => (units === 0 ? null : Math.round(spend / units));

const phoneKey = (lead: CateringLead) => lead.phone.replace(/\D/g, "").slice(-10);

const newestFirst = (a: CateringLead, b: CateringLead) =>
  b.inquiryDate.localeCompare(a.inquiryDate) || a.clientName.localeCompare(b.clientName);

export function computeCateringEda(
  dataset: Pick<LeadDataset, "leads" | "spend"> & Partial<Pick<LeadDataset, "won" | "lost">>,
  range: DateKeyRange,
): CateringEda {
  const leads = filterLeadsByRange(dataset.leads, range);
  const stage = new Map(leads.map((lead) => [lead, getLeadStage(lead)]));
  const inStage = (...stages: LeadStage[]) => (lead: CateringLead) => stages.includes(stage.get(lead)!);
  const wonLeads = filterLeadsByRange(dataset.won ?? leads.filter(inStage("Won")), range);
  const lostLeads = filterLeadsByRange(dataset.lost ?? leads.filter(inStage("Lost")), range);

  const totalLeads = split(leads, () => true);
  const wasted = split(leads, inStage("Wasted"));
  const qualityLeads = split(leads, isQualityLead);
  const pendingQuotation = split(
    leads,
    (lead) => isQualityLead(lead) && lead.quotationStatus === "Pending Quotation",
  );
  const quotationsSent = split(
    leads,
    (lead) => isQualityLead(lead) && lead.quotationStatus === "Quotation Sent",
  );
  const activeFollowUp = split(leads, inStage("Pending Quotation", "Quotation Sent"));
  const leadsWon = split(wonLeads, () => true);
  const leadsLost = split(lostLeads, () => true);
  const spend = spendForRange(dataset.spend, range);

  const interested = leads.filter(isQualityLead).sort(newestFirst);
  const lost = [...lostLeads].sort(newestFirst);
  const won = [...wonLeads].sort(newestFirst);
  // The Won and Lost tabs can close a client whose enquiry row still reads "Quotation Sent".
  const closedQuotes = [...won, ...lost.filter((l) => l.quotationStatus === "Quotation Sent")];
  const closedPhones = new Set(closedQuotes.map(phoneKey).filter(Boolean));
  const quotedClients = [
    ...interested.filter((l) => l.quotationStatus === "Quotation Sent" && !closedPhones.has(phoneKey(l))),
    ...closedQuotes,
  ].sort(newestFirst);

  const reasonCounts = new Map<string, LostReasonCount>();
  for (const lead of lost) {
    const category = lead.lostCategory ?? "Call Center / Follow-up";
    const reason = lead.lostReasonDetail ?? "Reason not recorded";
    const key = `${category}\u0000${reason.toLowerCase()}`;
    const entry = reasonCounts.get(key) ?? { category, reason, count: 0 };
    entry.count += 1;
    reasonCounts.set(key, entry);
  }

  const noAnswer = leads.filter((lead) => stage.get(lead) === "Wasted" && lead.initialStatus === "No Answer").length;
  const notInterested = leads.filter((lead) => stage.get(lead) === "Wasted" && lead.initialStatus === "Not Interested").length;
  const funnel = buildFunnel({
    totalLeads,
    qualityReached: uniqueLeads([
      ...leads.filter((lead) => lead.initialStatus === "Interested"),
      ...won,
      ...lost,
    ]),
    quotedClients,
    leadsWon,
  });
  const leadQuality: LeadQualityBreakdown = {
    noAnswer,
    notInterested,
    quality: totalLeads.total - wasted.total,
    total: totalLeads.total,
  };
  const conversionLoop: ConversionLoop = {
    qualityPctOfTotal: percentage(funnel.qualityLeads.total, funnel.totalLeads.total),
    quotationsSentPctOfQuality: percentage(funnel.quotationsSent.total, funnel.qualityLeads.total),
    wonPctOfQuotationsSent: percentage(funnel.leadsWon.total, funnel.quotationsSent.total),
    overallWonPctOfTotal: percentage(funnel.leadsWon.total, funnel.totalLeads.total),
  };

  return {
    range: { ...range, days: daysInclusive(range.from, range.to) },
    counts: {
      totalLeads,
      wastedLeads: { ...wasted, noAnswer, notInterested },
      qualityLeads,
      pendingQuotation,
      quotationsSent,
      activeFollowUp,
      leadsWon,
      leadsLost,
      totalSpendPKR: spend.total,
    },
    qualityRoster: {
      pendingQuotationClients: interested.filter((l) => l.quotationStatus === "Pending Quotation"),
      sentQuotationClients: interested.filter((l) => l.quotationStatus === "Quotation Sent"),
      quotedClients,
    },
    wastedRoster: leads.filter(inStage("Wasted")).sort(newestFirst),
    wonRoster: won,
    lostRoster: {
      managementSide: lost.filter((l) => l.lostCategory === "Management Side"),
      callCenterFollowUp: lost.filter((l) => l.lostCategory !== "Management Side"),
      reasonBreakdown: [...reasonCounts.values()].sort((a, b) => b.count - a.count),
    },
    funnel,
    leadQuality,
    conversionLoop,
    channelRoi: buildChannelRoi({ totalLeads, leadsWon }, spend),
  };
}

/** Raises a stage so it is at least as large as the next one, channel by channel. */
function atLeast(stage: ChannelSplit, floor: ChannelSplit): ChannelSplit {
  const whatsappAds = Math.max(stage.whatsappAds, floor.whatsappAds);
  const website = Math.max(stage.website, floor.website);
  return { whatsappAds, website, total: whatsappAds + website };
}

function uniqueLeads(leads: readonly CateringLead[]): CateringLead[] {
  const seen = new Set<string>();
  const result: CateringLead[] = [];
  for (const lead of leads) {
    const key = phoneKey(lead) || `id:${lead.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(lead);
  }
  return result;
}

/**
 * Cumulative funnel. Won and Lost tab rows that never appear in the enquiry
 * register still count, and earlier stages are raised so the funnel narrows.
 */
function buildFunnel(input: {
  totalLeads: ChannelSplit;
  qualityReached: readonly CateringLead[];
  quotedClients: readonly CateringLead[];
  leadsWon: ChannelSplit;
}): FunnelCounts {
  const leadsWon = input.leadsWon;
  const quotationsSent = atLeast(split(input.quotedClients, () => true), leadsWon);
  const qualityLeads = atLeast(split(input.qualityReached, () => true), quotationsSent);
  return {
    totalLeads: atLeast(input.totalLeads, qualityLeads),
    qualityLeads,
    quotationsSent,
    leadsWon,
  };
}

/** Spend, Cost Per Lead, and Cost Per Won Lead for each channel and the total. */
export function buildChannelRoi(
  counts: Pick<TopLevelCounts, "totalLeads" | "leadsWon">,
  spend: { whatsappAds: number; website: number },
): ChannelRoiRow[] {
  const row = (key: RoiRowKey, label: ChannelRoiRow["label"], spendPKR: number): ChannelRoiRow => {
    const leadCount = counts.totalLeads[key];
    const won = counts.leadsWon[key];
    return {
      key,
      label,
      spendPKR,
      leads: leadCount,
      costPerLeadPKR: perUnit(spendPKR, leadCount),
      leadsWon: won,
      costPerWonLeadPKR: perUnit(spendPKR, won),
    };
  };
  return [
    row("whatsappAds", "WhatsApp / Social Ads", spend.whatsappAds),
    row("website", "Website Leads", spend.website),
    row("total", "Total", spend.whatsappAds + spend.website),
  ];
}

export function datasetCoverage(leads: readonly CateringLead[]): DateKeyRange | null {
  if (leads.length === 0) return null;
  let from = leads[0].inquiryDate;
  let to = from;
  for (const { inquiryDate } of leads) {
    if (inquiryDate < from) from = inquiryDate;
    if (inquiryDate > to) to = inquiryDate;
  }
  return { from, to };
}
