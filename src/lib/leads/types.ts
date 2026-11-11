export const LEAD_CHANNELS = ["WhatsApp/Ads", "Website"] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export const INITIAL_STATUSES = ["No Answer", "Not Interested", "Interested"] as const;
export type InitialStatus = (typeof INITIAL_STATUSES)[number];

export const QUOTATION_STATUSES = ["Not Sent", "Pending Quotation", "Quotation Sent"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const FINAL_OUTCOMES = ["In Progress", "Won", "Lost"] as const;
export type FinalOutcome = (typeof FINAL_OUTCOMES)[number];

export const LOST_CATEGORIES = ["Management Side", "Call Center / Follow-up"] as const;
export type LostCategory = (typeof LOST_CATEGORIES)[number];

/** A calendar date in `YYYY-MM-DD` form, compared as a string. */
export type DateKey = string;

export interface CateringLead {
  id: string;
  clientName: string;
  phone: string;
  inquiryDate: DateKey;
  channel: LeadChannel;
  initialStatus: InitialStatus;
  quotationStatus: QuotationStatus;
  finalOutcome: FinalOutcome;
  lostCategory: LostCategory | null;
  lostReasonDetail: string | null;
  eventDate: DateKey | null;
  guestCount: number | null;
  quotedAmountPKR: number | null;
  /** Present when the sheet has a quotation date column. */
  quotationSentDate?: DateKey | null;
  /** Present when the sheet has these call-center columns. */
  brand?: string | null;
  email?: string | null;
  location?: string | null;
  notes?: string | null;
  handledBy?: string | null;
}

/** Spend for one period, prorated by day when a filter range only partly overlaps it. */
export interface ChannelSpendPeriod {
  periodStart: DateKey;
  periodEnd: DateKey;
  whatsappAdsSpendPKR: number;
  websiteSpendPKR: number;
}

export type LeadDataSource = "google-sheets" | "mock";

export interface LeadDataset {
  /** All Catering Enquiries. Mock data uses this as the only register. */
  leads: CateringLead[];
  /** Won leads tab. When omitted, won rows are taken from `leads`. */
  won?: CateringLead[];
  /** Lost leads tab. When omitted, lost rows are taken from `leads`. */
  lost?: CateringLead[];
  spend: ChannelSpendPeriod[];
  source: LeadDataSource;
  fetchedAt: string;
  warnings: string[];
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateKeyRange {
  from: DateKey;
  to: DateKey;
}

export type LeadStage = "Wasted" | "Pending Quotation" | "Quotation Sent" | "Won" | "Lost";

export interface ChannelSplit {
  total: number;
  whatsappAds: number;
  website: number;
}

export interface TopLevelCounts {
  totalLeads: ChannelSplit;
  wastedLeads: ChannelSplit & { noAnswer: number; notInterested: number };
  /** Open follow-up: interested, still in progress, quotation pending or sent. */
  qualityLeads: ChannelSplit;
  /** Interested leads that never received a quotation; matches the Pending Quotation roster. */
  pendingQuotation: ChannelSplit;
  /** Interested leads that received a quotation; matches the Quotation Sent roster. */
  quotationsSent: ChannelSplit;
  /** Interested leads with no final outcome yet. */
  activeFollowUp: ChannelSplit;
  leadsWon: ChannelSplit;
  leadsLost: ChannelSplit;
  totalSpendPKR: number;
}

export type FollowUpStatus = "Awaiting Reply" | "Won" | "Lost";

export interface QualityLeadsRoster {
  pendingQuotationClients: CateringLead[];
  /** Open quoted leads only; matches the Quotations Sent KPI. */
  sentQuotationClients: CateringLead[];
  /** Every client quoted in the range, whether still awaiting a reply, won, or lost. */
  quotedClients: CateringLead[];
}

export interface LostReasonCount {
  category: LostCategory;
  reason: string;
  count: number;
}

export interface LostLeadsRoster {
  managementSide: CateringLead[];
  callCenterFollowUp: CateringLead[];
  reasonBreakdown: LostReasonCount[];
}

/** Percentages on a 0–100 scale; `null` when the denominator is zero. */
export interface ConversionLoop {
  /** Quality leads that reached the call center, as a share of all leads. */
  qualityPctOfTotal: number | null;
  quotationsSentPctOfQuality: number | null;
  wonPctOfQuotationsSent: number | null;
  /** Confirmed bookings as a share of all leads. */
  overallWonPctOfTotal: number | null;
}

/** Cumulative stage counts across every channel. Each stage is at least as large as the next. */
export interface FunnelCounts {
  totalLeads: ChannelSplit;
  /** Interested leads with any outcome: still open, won, or lost. */
  qualityLeads: ChannelSplit;
  /** Every client who received a quotation, including those later won or lost. */
  quotationsSent: ChannelSplit;
  leadsWon: ChannelSplit;
}

/** How incoming leads split between wasted and quality, counted on the enquiry register. */
export interface LeadQualityBreakdown {
  noAnswer: number;
  notInterested: number;
  /** Total leads minus wasted leads. */
  quality: number;
  total: number;
}

export type RoiRowKey = "whatsappAds" | "website" | "total";

export interface ChannelRoiRow {
  key: RoiRowKey;
  label: "WhatsApp / Social Ads" | "Website Leads" | "Total";
  spendPKR: number;
  leads: number;
  /** `null` when there are no leads in the range. */
  costPerLeadPKR: number | null;
  leadsWon: number;
  /** `null` when there are no won leads in the range. */
  costPerWonLeadPKR: number | null;
}

export interface CateringEda {
  range: DateKeyRange & { days: number };
  counts: TopLevelCounts;
  qualityRoster: QualityLeadsRoster;
  /** Leads that never answered or said they were not interested. */
  wastedRoster: CateringLead[];
  /** Confirmed bookings from the Won tab, or won rows inside `leads` when there is no separate tab. */
  wonRoster: CateringLead[];
  lostRoster: LostLeadsRoster;
  /** Cumulative, all-channel stages. A lead counts at every stage it reached. */
  funnel: FunnelCounts;
  /** No answer, not interested, and quality, as shares of all enquiry leads. */
  leadQuality: LeadQualityBreakdown;
  /** Measured on `funnel`, so each step is a share of the stage before it. */
  conversionLoop: ConversionLoop;
  channelRoi: ChannelRoiRow[];
}

export interface CateringEdaMeta {
  source: LeadDataSource;
  fetchedAt: string;
  warnings: string[];
  /** Earliest and latest inquiry dates across the whole dataset, before filtering. */
  coverage: DateKeyRange | null;
}

export interface CateringEdaResponse {
  meta: CateringEdaMeta;
  eda: CateringEda;
}
