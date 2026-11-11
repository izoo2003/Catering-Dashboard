import { describe, expect, it } from "vitest";

import { buildChannelRoi, computeCateringEda, getLeadStage } from "./eda";
import { generateMockDataset } from "./mock-data";
import type { CateringLead } from "./types";

function lead(id: string, overrides: Partial<CateringLead>): CateringLead {
  return {
    id,
    clientName: `Client ${id}`,
    phone: "",
    inquiryDate: "2026-10-05",
    channel: "WhatsApp/Ads",
    initialStatus: "Interested",
    quotationStatus: "Pending Quotation",
    finalOutcome: "In Progress",
    lostCategory: null,
    lostReasonDetail: null,
    eventDate: null,
    guestCount: null,
    quotedAmountPKR: null,
    ...overrides,
  };
}

const wasted = { quotationStatus: "Not Sent", finalOutcome: "Lost" } as const;

const leads: CateringLead[] = [
  lead("1", { initialStatus: "No Answer", ...wasted }),
  lead("2", { initialStatus: "Not Interested", ...wasted }),
  lead("3", {}),
  lead("4", { quotationStatus: "Quotation Sent" }),
  lead("5", { quotationStatus: "Quotation Sent", finalOutcome: "Won" }),
  lead("6", { quotationStatus: "Quotation Sent", finalOutcome: "Lost", lostCategory: "Call Center / Follow-up", lostReasonDetail: "Price too high" }),
  lead("7", { finalOutcome: "Lost", lostCategory: "Management Side", lostReasonDetail: "Location issue" }),
  lead("8", { channel: "Website", quotationStatus: "Quotation Sent", finalOutcome: "Won" }),
  lead("9", { channel: "Website", initialStatus: "No Answer", ...wasted }),
  lead("10", { inquiryDate: "2026-10-20", quotationStatus: "Quotation Sent", finalOutcome: "Won" }),
];

const spend = [
  { periodStart: "2026-10-01", periodEnd: "2026-10-31", whatsappAdsSpendPKR: 310_000, websiteSpendPKR: 62_000 },
  { periodStart: "2026-11-01", periodEnd: "2026-11-30", whatsappAdsSpendPKR: 999_999, websiteSpendPKR: 99_999 },
];

describe("computeCateringEda", () => {
  const eda = computeCateringEda({ leads, spend }, { from: "2026-10-01", to: "2026-10-15" });

  it("counts every state inside the range", () => {
    expect(eda.range.days).toBe(15);
    expect(eda.counts.totalLeads).toEqual({ total: 9, whatsappAds: 7, website: 2 });
    expect(eda.counts.wastedLeads).toEqual({ total: 3, whatsappAds: 2, website: 1, noAnswer: 2, notInterested: 1 });
    expect(eda.counts.qualityLeads).toEqual({ total: 2, whatsappAds: 2, website: 0 });
    expect(eda.counts.pendingQuotation.total).toBe(1);
    expect(eda.counts.quotationsSent).toEqual({ total: 1, whatsappAds: 1, website: 0 });
    expect(eda.counts.activeFollowUp.total).toBe(2);
    expect(eda.counts.leadsWon).toEqual({ total: 2, whatsappAds: 1, website: 1 });
    expect(eda.counts.leadsLost.total).toBe(2);
    expect(eda.counts.totalSpendPKR).toBe(180_000);
  });

  it("splits the quality and lost rosters", () => {
    const ids = (list: CateringLead[]) => list.map((l) => l.id).sort();
    expect(ids(eda.qualityRoster.pendingQuotationClients)).toEqual(["3"]);
    expect(ids(eda.qualityRoster.sentQuotationClients)).toEqual(["4"]);
    expect(ids(eda.wonRoster)).toEqual(["5", "8"]);
    expect(ids(eda.lostRoster.managementSide)).toEqual(["7"]);
    expect(ids(eda.lostRoster.callCenterFollowUp)).toEqual(["6"]);
    expect(eda.lostRoster.reasonBreakdown).toHaveLength(2);
  });

  it("lists every quoted client, open, won, or lost, and the wasted roster", () => {
    const ids = (list: CateringLead[]) => list.map((l) => l.id).sort();
    expect(ids(eda.qualityRoster.quotedClients)).toEqual(["4", "5", "6", "8"]);
    expect(ids(eda.wastedRoster)).toEqual(["1", "2", "9"]);
    expect(eda.wastedRoster).toHaveLength(eda.counts.wastedLeads.total);
  });

  it("builds a cumulative all-channel funnel that narrows", () => {
    expect(eda.funnel.totalLeads).toEqual({ total: 9, whatsappAds: 7, website: 2 });
    expect(eda.funnel.qualityLeads).toEqual({ total: 6, whatsappAds: 5, website: 1 });
    expect(eda.funnel.quotationsSent).toEqual({ total: 4, whatsappAds: 3, website: 1 });
    expect(eda.funnel.leadsWon).toEqual({ total: 2, whatsappAds: 1, website: 1 });
    expect(eda.funnel.totalLeads.total).toBeGreaterThanOrEqual(eda.funnel.qualityLeads.total);
    expect(eda.funnel.qualityLeads.total).toBeGreaterThanOrEqual(eda.funnel.quotationsSent.total);
    expect(eda.funnel.quotationsSent.total).toBeGreaterThanOrEqual(eda.funnel.leadsWon.total);
  });

  it("splits lead quality so the rows add up to every enquiry", () => {
    expect(eda.leadQuality).toEqual({ noAnswer: 2, notInterested: 1, quality: 6, total: 9 });
    expect(eda.leadQuality.noAnswer + eda.leadQuality.notInterested + eda.leadQuality.quality).toBe(eda.leadQuality.total);
  });

  it("measures the conversion loop on the cumulative funnel", () => {
    expect(eda.conversionLoop).toEqual({
      qualityPctOfTotal: 66.7,
      quotationsSentPctOfQuality: 66.7,
      wonPctOfQuotationsSent: 50,
      overallWonPctOfTotal: 22.2,
    });
  });

  it("prorates spend into the channel ROI table", () => {
    expect(eda.channelRoi).toEqual([
      { key: "whatsappAds", label: "WhatsApp / Social Ads", spendPKR: 150_000, leads: 7, costPerLeadPKR: 21_429, leadsWon: 1, costPerWonLeadPKR: 150_000 },
      { key: "website", label: "Website Leads", spendPKR: 30_000, leads: 2, costPerLeadPKR: 15_000, leadsWon: 1, costPerWonLeadPKR: 30_000 },
      { key: "total", label: "Total", spendPKR: 180_000, leads: 9, costPerLeadPKR: 20_000, leadsWon: 2, costPerWonLeadPKR: 90_000 },
    ]);
  });

  it("counts won and lost from their own tabs when those registers are passed", () => {
    const wonOnly = [lead("w", { finalOutcome: "Won", quotationStatus: "Quotation Sent", channel: "Website" })];
    const lostOnly = [lead("l", { finalOutcome: "Lost", lostCategory: "Management Side", lostReasonDetail: "Date overlap" })];
    const split = computeCateringEda({ leads, won: wonOnly, lost: lostOnly, spend }, { from: "2026-10-01", to: "2026-10-15" });
    expect(split.counts.totalLeads.total).toBe(9);
    expect(split.counts.leadsWon).toEqual({ total: 1, whatsappAds: 0, website: 1 });
    expect(split.counts.leadsLost.total).toBe(1);
    expect(split.wonRoster.map((item) => item.id)).toEqual(["w"]);
    expect(split.lostRoster.managementSide.map((item) => item.id)).toEqual(["l"]);
  });

  it("raises earlier funnel stages when a won client is only on the Won tab", () => {
    const extraWon = lead("w", {
      phone: "03001112222",
      channel: "Website",
      quotationStatus: "Quotation Sent",
      finalOutcome: "Won",
    });
    const result = computeCateringEda(
      { leads: [lead("1", { initialStatus: "No Answer", ...wasted })], won: [extraWon], lost: [], spend },
      { from: "2026-10-01", to: "2026-10-15" },
    );
    expect(result.counts.totalLeads.total).toBe(1);
    expect(result.funnel.leadsWon).toEqual({ total: 1, whatsappAds: 0, website: 1 });
    expect(result.funnel.totalLeads.total).toBeGreaterThanOrEqual(result.funnel.qualityLeads.total);
    expect(result.funnel.qualityLeads.total).toBeGreaterThanOrEqual(result.funnel.quotationsSent.total);
    expect(result.funnel.quotationsSent.total).toBeGreaterThanOrEqual(result.funnel.leadsWon.total);
    expect(result.funnel.quotationsSent.website).toBeGreaterThanOrEqual(1);
  });

  it("lists a quoted client once when the Won tab closes an open enquiry row", () => {
    const open = lead("open", { phone: "0321-8234000", quotationStatus: "Quotation Sent" });
    const booked = lead("booked", { phone: "+92 321 8234000", quotationStatus: "Quotation Sent", finalOutcome: "Won" });
    const result = computeCateringEda({ leads: [open], won: [booked], spend }, { from: "2026-10-01", to: "2026-10-15" });
    expect(result.qualityRoster.quotedClients.map((item) => item.id)).toEqual(["booked"]);
  });

  it("returns nulls instead of dividing by zero", () => {
    const empty = computeCateringEda({ leads, spend }, { from: "2027-01-01", to: "2027-01-31" });
    expect(empty.counts.totalLeads.total).toBe(0);
    expect(empty.conversionLoop.qualityPctOfTotal).toBeNull();
    expect(empty.funnel.totalLeads.total).toBe(0);
    expect(empty.leadQuality).toEqual({ noAnswer: 0, notInterested: 0, quality: 0, total: 0 });
    expect(empty.channelRoi[2]).toMatchObject({ spendPKR: 0, costPerLeadPKR: null, costPerWonLeadPKR: null });
  });
});

describe("buildChannelRoi", () => {
  const counts = {
    totalLeads: { total: 50, whatsappAds: 40, website: 10 },
    leadsWon: { total: 5, whatsappAds: 4, website: 1 },
  };

  it("recomputes cost per lead and per won lead from overridden spend", () => {
    expect(buildChannelRoi(counts, { whatsappAds: 200_000, website: 50_000 })).toEqual([
      { key: "whatsappAds", label: "WhatsApp / Social Ads", spendPKR: 200_000, leads: 40, costPerLeadPKR: 5_000, leadsWon: 4, costPerWonLeadPKR: 50_000 },
      { key: "website", label: "Website Leads", spendPKR: 50_000, leads: 10, costPerLeadPKR: 5_000, leadsWon: 1, costPerWonLeadPKR: 50_000 },
      { key: "total", label: "Total", spendPKR: 250_000, leads: 50, costPerLeadPKR: 5_000, leadsWon: 5, costPerWonLeadPKR: 50_000 },
    ]);
  });

  it("returns null costs when a channel has no won leads", () => {
    const noWins = { ...counts, leadsWon: { total: 0, whatsappAds: 0, website: 0 } };
    expect(buildChannelRoi(noWins, { whatsappAds: 1_000, website: 0 })[2]).toMatchObject({
      costPerLeadPKR: 20,
      costPerWonLeadPKR: null,
    });
  });
});

describe("generateMockDataset", () => {
  const mock = generateMockDataset({ endDate: "2026-11-11" });

  it("is deterministic", () => {
    expect(generateMockDataset({ endDate: "2026-11-11" })).toEqual(mock);
  });

  it("only produces leads that fit the state machine", () => {
    for (const l of mock.leads) {
      const stage = getLeadStage(l);
      if (stage === "Won") expect(l).toMatchObject({ initialStatus: "Interested", quotationStatus: "Quotation Sent" });
      if (stage === "Wasted") expect(l).toMatchObject({ quotationStatus: "Not Sent", lostCategory: null });
      if (stage === "Lost") expect(l.lostCategory).not.toBeNull();
      if (l.lostReasonDetail === "Guests under 30") expect(l.guestCount).toBeLessThan(30);
    }
  });

  it("keeps quality leads equal to the two roster tabs", () => {
    const eda = computeCateringEda(mock, { from: "2026-05-01", to: "2026-11-11" });
    const { pendingQuotationClients, sentQuotationClients } = eda.qualityRoster;
    expect(pendingQuotationClients.length).toBe(eda.counts.pendingQuotation.total);
    expect(sentQuotationClients.length).toBe(eda.counts.quotationsSent.total);
    expect(pendingQuotationClients.length + sentQuotationClients.length).toBe(eda.counts.qualityLeads.total);
    expect(
      eda.counts.wastedLeads.total +
        eda.counts.qualityLeads.total +
        eda.counts.leadsWon.total +
        eda.counts.leadsLost.total,
    ).toBe(eda.counts.totalLeads.total);
    expect(eda.counts.totalSpendPKR).toBeGreaterThan(0);
  });
});
