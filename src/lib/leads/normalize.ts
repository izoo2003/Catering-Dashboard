import { parseEventDate, parseSheetDate, parseSheetMonth } from "./dates";
import type {
  CateringLead,
  ChannelSpendPeriod,
  FinalOutcome,
  InitialStatus,
  LeadChannel,
  LostCategory,
  QuotationStatus,
} from "./types";

type SheetRow = readonly unknown[];

export class SheetSchemaError extends Error {
  constructor(sheet: string, missing: string[]) {
    super(`${sheet} sheet is missing required column(s): ${missing.join(", ")}`);
    this.name = "SheetSchemaError";
  }
}

const LEAD_COLUMNS = {
  id: ["id", "lead id", "lead #", "lead no", "s no", "#"],
  clientName: ["client name", "client", "customer name", "customer", "name"],
  phone: ["phone", "phone number", "contact", "contact number", "mobile", "whatsapp number"],
  inquiryDate: ["inquiry date", "enquiry date", "lead date", "date", "created at", "timestamp"],
  channel: ["channel", "source", "lead source", "lead channel", "medium"],
  initialStatus: ["initial status", "status", "call status", "lead status", "response"],
  quotationStatus: ["quotation status", "quote status", "quotation sent", "quotation"],
  finalOutcome: ["final outcome", "outcome", "booking status", "result"],
  lostCategory: ["lost category", "loss category", "loss side", "lost side"],
  lostReasonDetail: ["lost reason detail", "lost reason", "loss reason", "reason"],
  eventDate: ["event date", "function date"],
  guestCount: ["guest count", "guests", "no of guests", "no. of guests", "pax", "headcount"],
  quotedAmountPKR: ["quoted amount pkr", "quoted amount", "quote amount", "quotation amount", "amount pkr"],
  quotationSentDate: ["quotation sent date", "quotation date", "quote date", "date sent", "quote sent date"],
  brand: ["brand"],
  email: ["email", "email address"],
  location: ["location", "area", "venue"],
  notes: ["notes", "notes / call center remarks", "call center remarks", "remarks"],
  handledBy: ["handled by", "agent"],
} satisfies Record<keyof CateringLead, string[]>;

const REQUIRED_LEAD_COLUMNS = ["inquiryDate", "channel"] as const;

const SPEND_COLUMNS = {
  periodStart: ["period start", "start date", "from", "start"],
  periodEnd: ["period end", "end date", "to", "end"],
  month: ["month", "period"],
  whatsappAdsSpendPKR: [
    "whatsapp ads spend pkr", "whatsapp ads spend", "ads spend pkr", "ads spend",
    "social ads spend", "whatsapp social ads spend", "meta spend",
  ],
  websiteSpendPKR: ["website spend pkr", "website spend", "web spend", "seo spend"],
};

const normalizeHeader = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9#]/g, "");

function indexColumns<K extends string>(
  header: SheetRow,
  aliases: Record<K, string[]>,
): Partial<Record<K, number>> {
  const positions = new Map<string, number>();
  header.forEach((cell, i) => {
    const key = normalizeHeader(cell);
    if (key && !positions.has(key)) positions.set(key, i);
  });

  const index: Partial<Record<K, number>> = {};
  for (const field of Object.keys(aliases) as K[]) {
    for (const alias of aliases[field]) {
      const position = positions.get(normalizeHeader(alias));
      if (position !== undefined) {
        index[field] = position;
        break;
      }
    }
  }
  return index;
}

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

export function parseAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = text(value).replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeChannel(value: unknown): LeadChannel | null {
  const v = text(value).toLowerCase();
  if (!v) return null;
  if (/web|site|online\s*form/.test(v)) return "Website";
  if (/whats|wa\b|ad|social|facebook|fb|insta|ig\b|meta|phone|call|tiktok/.test(v)) {
    return "WhatsApp/Ads";
  }
  return null;
}

export function normalizeInitialStatus(value: unknown): InitialStatus | null {
  const v = text(value).toLowerCase();
  if (!v) return null;
  if (/not\s*interest|no\s*interest|uninterest/.test(v)) return "Not Interested";
  if (/no\s*answer|no\s*reply|no\s*response|unreachable|not\s*respond|useless|did\s*not\s*(answer|reply)/.test(v)) {
    return "No Answer";
  }
  if (/interest/.test(v)) return "Interested";
  return null;
}

export function normalizeQuotationStatus(value: unknown): QuotationStatus | null {
  const v = text(value).toLowerCase();
  if (!v) return null;
  if (/not\s*sent|^no$|none/.test(v)) return "Not Sent";
  if (/pending|to\s*send|awaiting|need/.test(v)) return "Pending Quotation";
  if (/sent|quoted|shared|yes/.test(v)) return "Quotation Sent";
  return null;
}

export function normalizeFinalOutcome(value: unknown): FinalOutcome | null {
  const v = text(value).toLowerCase();
  if (!v) return null;
  if (/not\s*convert|already\s*booked|booked\s*else|elsewhere|management\s*not|managment\s*not/.test(v)) {
    return "Lost";
  }
  if (/not\s*(yet\s*)?(confirm|book)/.test(v)) return "In Progress";
  if (/won|confirm|book|converted/.test(v)) return "Won";
  if (/lost|cancel|declin|rejected|closed\s*lost/.test(v)) return "Lost";
  if (/progress|open|follow|pending|active/.test(v)) return "In Progress";
  return null;
}

const MANAGEMENT_REASON = /locat|venue|area|distance|city|date|overlap|clash|availab|fully\s*booked|guest|minimum|under\s*\d+|capacity|pax/;
const CALL_CENTER_REASON = /price|pric|budget|expens|cost|respon|reply|ghost|competit|another|other\s*caterer|delay|late|follow/;

export function normalizeLostCategory(category: unknown, reason: unknown): LostCategory | null {
  const c = text(category).toLowerCase();
  if (/manag/.test(c)) return "Management Side";
  if (/call|follow|centre|center|sales/.test(c)) return "Call Center / Follow-up";

  const r = text(reason).toLowerCase();
  if (/booked\s*else|elsewhere|other\s*(vendor|cater|brand)/.test(r)) return "Call Center / Follow-up";
  if (/budget|price|no\s*respons|no\s*repl|not\s*intrest|not\s*interest|event\s*(is\s*)?cancel/.test(r)) {
    return "Call Center / Follow-up";
  }
  if (/already\s*booked|out\s*of\s*radius|radius|management|managment|guest\s*count|too\s*small|under\s*\d+/.test(r)) {
    return "Management Side";
  }
  if (CALL_CENTER_REASON.test(r)) return "Call Center / Follow-up";
  if (MANAGEMENT_REASON.test(r)) return "Management Side";
  return null;
}

class WarningLog {
  private counts = new Map<string, number>();

  add(message: string) {
    this.counts.set(message, (this.counts.get(message) ?? 0) + 1);
  }

  list(): string[] {
    return [...this.counts].map(([message, n]) => `${n} row${n === 1 ? "" : "s"}: ${message}`);
  }
}

const isBlankRow = (row: SheetRow) => row.every((cell) => text(cell) === "");

const MONTH_BANNER = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-]+\d{2,4}$/i;

export type LeadRegister = "enquiries" | "won" | "lost";

/** A section label such as `Sep-26`, used only as a heading between groups of leads. */
function sectionLabel(row: SheetRow): string | null {
  const filled = row.map(text).filter(Boolean);
  return filled.length === 1 && MONTH_BANNER.test(filled[0]) ? filled[0] : null;
}

function looksLikeHeader(row: SheetRow): boolean {
  const keys = new Set(row.map((cell) => normalizeHeader(cell)).filter(Boolean));
  const hasDate = keys.has("date") || keys.has("inquirydate") || keys.has("leaddate");
  const hasPerson = keys.has("customername") || keys.has("clientname") || keys.has("name");
  return hasDate && hasPerson;
}

interface SheetSection {
  header: SheetRow;
  section: string;
  rows: SheetRow[];
}

/**
 * Each month block can repeat the header, and the Won tab changes columns between months.
 * A new header starts a new section so later rows are read with their own columns.
 */
function unwrapSections(values: readonly SheetRow[]): SheetSection[] {
  let header: SheetRow | null = null;
  let section = "";
  let current: SheetSection | null = null;
  const sections: SheetSection[] = [];

  for (const row of values) {
    if (isBlankRow(row)) continue;
    const banner = sectionLabel(row);
    if (banner) {
      section = banner;
      current = null;
      continue;
    }
    if (looksLikeHeader(row)) {
      header = row;
      current = null;
      continue;
    }
    if (!header) continue;
    if (!current) {
      current = { header, section, rows: [] };
      sections.push(current);
    }
    current.rows.push(row);
  }

  return sections;
}

/** The call-center Status column uses one word for several different stages. */
export function interpretSheetStatus(value: unknown): {
  initialStatus: InitialStatus;
  finalOutcome: FinalOutcome;
  quotationHint?: QuotationStatus;
} | null {
  const v = text(value).toLowerCase();
  if (!v) return null;
  if (/no\s*answer|no\s*reply|no\s*respons|unreachable/.test(v)) {
    return { initialStatus: "No Answer", finalOutcome: "Lost" };
  }
  if (/not\s*interest|no\s*interest|uninterest/.test(v)) {
    return { initialStatus: "Not Interested", finalOutcome: "Lost" };
  }
  if (/follow/.test(v)) return { initialStatus: "Interested", finalOutcome: "In Progress" };
  if (/need\s*quot|quot\w*\s*pend/.test(v)) {
    return { initialStatus: "Interested", finalOutcome: "In Progress", quotationHint: "Pending Quotation" };
  }
  if (/^quotations?\s*sent$/.test(v)) {
    return { initialStatus: "Interested", finalOutcome: "In Progress", quotationHint: "Quotation Sent" };
  }
  if (/insterest|interest/.test(v)) return { initialStatus: "Interested", finalOutcome: "In Progress" };
  if (/not\s*convert|already\s*booked|booked\s*else|elsewhere|management\s*not|managment\s*not/.test(v)) {
    return { initialStatus: "Interested", finalOutcome: "Lost" };
  }
  if (/^won$|matured|converted/.test(v)) return { initialStatus: "Interested", finalOutcome: "Won" };
  return null;
}

function parseGuestCount(value: unknown): number | null {
  const firstLine = text(value).split(/[\n\r]/)[0] ?? "";
  return parseAmount(firstLine);
}

function dedupeWonLeads(leads: CateringLead[]): { leads: CateringLead[]; removed: number } {
  const seen = new Set<string>();
  const kept: CateringLead[] = [];
  let removed = 0;
  for (const lead of leads) {
    const phone = lead.phone.replace(/\D/g, "").slice(-10);
    const key = phone ? `${phone}|${lead.eventDate ?? lead.inquiryDate}` : "";
    if (key && seen.has(key)) {
      removed += 1;
      continue;
    }
    if (key) seen.add(key);
    kept.push(lead);
  }
  return { leads: kept, removed };
}

/**
 * A column named "Status" is the initial response on some sheets and the final booking
 * result on the call-center log. Whichever vocabulary the cells use wins.
 */
function usesCallCenterStatus(rows: readonly SheetRow[], index: number): boolean {
  let filled = 0;
  let recognized = 0;
  for (const row of rows) {
    if (!text(row[index])) continue;
    filled += 1;
    if (interpretSheetStatus(row[index])) recognized += 1;
  }
  return filled > 0 && recognized / filled >= 0.6;
}

function statusColumnKind(rows: readonly SheetRow[], index: number): "initial" | "outcome" {
  let initial = 0;
  let outcome = 0;
  for (const row of rows) {
    const value = row[index];
    if (normalizeInitialStatus(value)) initial += 1;
    if (normalizeFinalOutcome(value)) outcome += 1;
  }
  return outcome > initial ? "outcome" : "initial";
}

/**
 * Converts raw sheet rows into leads that respect the lead state machine.
 * Won leads were interested and quoted. An interested lead still open with no quotation is pending.
 * A lost lead whose quotation was never sent stays "Not Sent" and is counted as Lost, not Quality.
 * Leads that never became interested are closed as `Lost` with no loss category, and the EDA counts them as Wasted.
 */
export function normalizeLeadRows(
  values: readonly SheetRow[],
  options?: { register?: LeadRegister },
): {
  leads: CateringLead[];
  warnings: string[];
} {
  const register = options?.register ?? "enquiries";
  const sections = unwrapSections(values);
  if (sections.length === 0) throw new SheetSchemaError("Leads", ["a header row with Date and Customer Name"]);

  const log = new WarningLog();
  const leads: CateringLead[] = [];
  let sequence = 0;

  // Serial numbers repeat within a sheet and across the Won / Lost tabs, but ids must be unique.
  const idPrefix = register === "enquiries" ? "" : `${register}-`;
  const idCounts = new Map<string, number>();
  const uniqueId = (base: string) => {
    const n = (idCounts.get(base) ?? 0) + 1;
    idCounts.set(base, n);
    return n === 1 ? idPrefix + base : `${idPrefix}${base}-${n}`;
  };

  for (const section of sections) {
    const col = indexColumns(section.header, LEAD_COLUMNS);
    if (register !== "won" && col.initialStatus !== undefined && col.finalOutcome === undefined) {
      const callCenterStatus = usesCallCenterStatus(section.rows, col.initialStatus);
      if (!callCenterStatus && statusColumnKind(section.rows, col.initialStatus) === "outcome") {
        col.finalOutcome = col.initialStatus;
        delete col.initialStatus;
      }
    }

    const missing = REQUIRED_LEAD_COLUMNS.filter((field) => col[field] === undefined);
    if (missing.length > 0) throw new SheetSchemaError("Leads", missing);

    const cell = (row: SheetRow, field: keyof typeof LEAD_COLUMNS) =>
      col[field] === undefined ? undefined : row[col[field]];
    const optionalText = (row: SheetRow, field: keyof typeof LEAD_COLUMNS) => text(cell(row, field)) || null;

    for (const row of section.rows) {
    sequence += 1;
    const inquiryDate = parseSheetDate(cell(row, "inquiryDate"));
    if (!inquiryDate) {
      log.add("skipped, inquiry date missing or unreadable");
      continue;
    }

    let channel = normalizeChannel(cell(row, "channel"));
    if (!channel) {
      log.add("channel not recognised, counted as WhatsApp/Ads");
      channel = "WhatsApp/Ads";
    }

    const interpreted = register !== "won" && col.finalOutcome === undefined
      ? interpretSheetStatus(cell(row, "initialStatus"))
      : null;

    let finalOutcome = interpreted?.finalOutcome ?? normalizeFinalOutcome(cell(row, "finalOutcome")) ?? "In Progress";
    let initialStatus = interpreted?.initialStatus ?? normalizeInitialStatus(cell(row, "initialStatus"));
    if (!initialStatus) {
      if (register === "won" || finalOutcome !== "In Progress" || normalizeQuotationStatus(cell(row, "quotationStatus"))) {
        initialStatus = "Interested";
      } else {
        log.add("initial status blank or not recognised, counted as No Answer");
        initialStatus = "No Answer";
      }
    }

    let quotationStatus =
      normalizeQuotationStatus(cell(row, "quotationStatus")) ?? interpreted?.quotationHint ?? "Not Sent";
    let lostReasonDetail = text(cell(row, "lostReasonDetail")).replace(/\s+/g, " ") || null;
    let lostCategory: LostCategory | null = null;

    if (finalOutcome === "Won") {
      initialStatus = "Interested";
      quotationStatus = "Quotation Sent";
      lostReasonDetail = null;
    } else if (initialStatus !== "Interested") {
      quotationStatus = "Not Sent";
      finalOutcome = "Lost";
      lostReasonDetail = null;
    } else {
      if (quotationStatus === "Not Sent" && finalOutcome !== "Lost") quotationStatus = "Pending Quotation";
      if (finalOutcome === "Lost") {
        lostCategory = normalizeLostCategory(cell(row, "lostCategory"), lostReasonDetail);
        if (!lostCategory) {
          log.add("lost without a recognisable reason, counted as Call Center / Follow-up loss");
          lostCategory = "Call Center / Follow-up";
          lostReasonDetail ??= "Reason not recorded";
        }
      } else {
        lostReasonDetail = null;
      }
    }

    if (register === "won") {
      initialStatus = "Interested";
      quotationStatus = "Quotation Sent";
      finalOutcome = "Won";
      lostCategory = null;
      lostReasonDetail = null;
    }

    const guestCount = parseGuestCount(cell(row, "guestCount"));
    const serial = text(cell(row, "id"));
    const sectionName = section.section;

    leads.push({
      id: uniqueId(sectionName && serial ? `${sectionName}-${serial}` : serial || `${sectionName || "row"}-${sequence}`),
      clientName: text(cell(row, "clientName")).replace(/\s+/g, " ") || "Unnamed client",
      phone: text(cell(row, "phone")).replace(/\s+/g, " "),
      inquiryDate,
      channel,
      initialStatus,
      quotationStatus,
      finalOutcome,
      lostCategory,
      lostReasonDetail,
      eventDate: parseEventDate(cell(row, "eventDate"), Number(inquiryDate.slice(0, 4))),
      guestCount: guestCount === null ? null : Math.round(guestCount),
      quotedAmountPKR: parseAmount(cell(row, "quotedAmountPKR")),
      quotationSentDate: quotationStatus === "Quotation Sent" ? parseSheetDate(cell(row, "quotationSentDate")) : null,
      brand: optionalText(row, "brand"),
      email: optionalText(row, "email"),
      location: optionalText(row, "location"),
      notes: optionalText(row, "notes")?.replace(/\s+/g, " ") ?? null,
      handledBy: optionalText(row, "handledBy"),
    });
    }
  }

  if (register === "won") {
    const deduped = dedupeWonLeads(leads);
    const warnings = log.list();
    if (deduped.removed > 0) {
      warnings.push(`${deduped.removed} duplicate won booking${deduped.removed === 1 ? "" : "s"} removed`);
    }
    return { leads: deduped.leads, warnings };
  }

  return { leads, warnings: log.list() };
}

/**
 * Reads the spend sheet. Each row needs either a `Month` (`2026-10` / `Oct 2026`)
 * or a `Period Start` + `Period End` pair.
 */
export function normalizeSpendRows(values: readonly SheetRow[]): {
  spend: ChannelSpendPeriod[];
  warnings: string[];
} {
  const [header = [], ...rows] = values;
  const col = indexColumns(header, SPEND_COLUMNS);

  const hasPeriod = col.month !== undefined || (col.periodStart !== undefined && col.periodEnd !== undefined);
  const hasAmount = col.whatsappAdsSpendPKR !== undefined || col.websiteSpendPKR !== undefined;
  if (!hasPeriod || !hasAmount) {
    const missing = [
      ...(hasPeriod ? [] : ["Month (or Period Start + Period End)"]),
      ...(hasAmount ? [] : ["WhatsApp Ads Spend PKR and/or Website Spend PKR"]),
    ];
    throw new SheetSchemaError("Spend", missing);
  }

  const log = new WarningLog();
  const spend: ChannelSpendPeriod[] = [];
  const cell = (row: SheetRow, field: keyof typeof SPEND_COLUMNS) =>
    col[field] === undefined ? undefined : row[col[field]];

  for (const row of rows) {
    if (isBlankRow(row)) continue;

    const start = parseSheetDate(cell(row, "periodStart"));
    const end = parseSheetDate(cell(row, "periodEnd"));
    const period = start && end ? { from: start, to: end } : parseSheetMonth(cell(row, "month"));

    if (!period || period.from > period.to) {
      log.add("skipped, spend period missing or invalid");
      continue;
    }

    spend.push({
      periodStart: period.from,
      periodEnd: period.to,
      whatsappAdsSpendPKR: parseAmount(cell(row, "whatsappAdsSpendPKR")) ?? 0,
      websiteSpendPKR: parseAmount(cell(row, "websiteSpendPKR")) ?? 0,
    });
  }

  return { spend, warnings: log.list() };
}
