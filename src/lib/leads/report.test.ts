import { describe, expect, it } from "vitest";

import { lossSummary } from "./roster";
import { executiveSummary, periodConclusion } from "./report";
import type { ChannelRoiRow, ChannelSplit, LostLeadsRoster } from "./types";

const split = (total: number, whatsappAds: number, website: number): ChannelSplit => ({
  total,
  whatsappAds,
  website,
});

const row = (partial: Partial<ChannelRoiRow> & Pick<ChannelRoiRow, "key" | "label">): ChannelRoiRow => ({
  spendPKR: 0,
  leads: 0,
  costPerLeadPKR: null,
  leadsWon: 0,
  costPerWonLeadPKR: null,
  ...partial,
});

const lost = (callCenter: number, management: number): LostLeadsRoster => ({
  callCenterFollowUp: Array.from({ length: callCenter }, (_, i) => ({ id: `c${i}`, quotedAmountPKR: 0 }) as never),
  managementSide: Array.from({ length: management }, (_, i) => ({ id: `m${i}`, quotedAmountPKR: 0 }) as never),
  reasonBreakdown: [],
});

describe("executiveSummary", () => {
  it("narrates channel volume, screening, wins, and spend", () => {
    expect(
      executiveSummary({
        rangeLabel: "1 Oct – 31 Oct 2026",
        total: split(120, 90, 30),
        qualityScreened: 45,
        quotationsSent: 28,
        won: split(8, 5, 3),
        adsSpend: 400_000,
        websiteSpend: 50_000,
      }),
    ).toBe(
      "For 1 Oct – 31 Oct 2026, Colette received 120 catering inquiries: 90 via WhatsApp, social, and ads, and 30 via the website. The call center screened 45 quality leads and sent 28 quotations. 8 bookings were confirmed (5 from WhatsApp and ads, 3 from the website). Period spend was PKR 450,000: PKR 400,000 on WhatsApp and social ads and PKR 50,000 on the website.",
    );
  });

  it("uses singular wording for a single inquiry and booking", () => {
    expect(
      executiveSummary({
        rangeLabel: "5 Oct 2026",
        total: split(1, 0, 1),
        qualityScreened: 1,
        quotationsSent: 1,
        won: split(1, 0, 1),
        adsSpend: 0,
        websiteSpend: 0,
      }),
    ).toBe(
      "For 5 Oct 2026, Colette received 1 catering inquiry: 0 via WhatsApp, social, and ads, and 1 via the website. The call center screened 1 quality lead and sent 1 quotation. 1 booking was confirmed (0 from WhatsApp and ads, 1 from the website). Period spend was PKR 0: PKR 0 on WhatsApp and social ads and PKR 0 on the website.",
    );
  });

  it("returns a single sentence when the period has no leads", () => {
    expect(
      executiveSummary({
        rangeLabel: "1 Oct – 31 Oct 2026",
        total: split(0, 0, 0),
        qualityScreened: 0,
        quotationsSent: 0,
        won: split(0, 0, 0),
        adsSpend: 0,
        websiteSpend: 0,
      }),
    ).toBe("No catering inquiries were recorded for 1 Oct – 31 Oct 2026.");
  });
});

describe("periodConclusion", () => {
  const ads = row({
    key: "whatsappAds",
    label: "WhatsApp / Social Ads",
    spendPKR: 400_000,
    leads: 90,
    costPerLeadPKR: 4444,
    leadsWon: 5,
    costPerWonLeadPKR: 80_000,
  });
  const website = row({
    key: "website",
    label: "Website Leads",
    spendPKR: 50_000,
    leads: 30,
    costPerLeadPKR: 1667,
    leadsWon: 3,
    costPerWonLeadPKR: 16_667,
  });

  it("compares volume and cost, then names call center follow-up when those losses lead", () => {
    expect(
      periodConclusion({
        ads,
        website,
        wonPctOfQuotations: 28.6,
        loss: lossSummary(lost(3, 1)),
      }),
    ).toBe(
      "WhatsApp and social ads brought 90 leads at PKR 4,444 per lead. The website brought 30 leads at PKR 1,667 per lead. Bookings from WhatsApp and social ads cost PKR 80,000 each. Bookings from the website cost PKR 16,667 each. 28.6% of quotations became confirmed bookings. 2 lost leads more on the call center side. Follow-up issues account for 75% of all losses, which faster quotes and follow-ups can recover. The next period should tighten call center follow-up after a quotation is sent.",
    );
  });

  it("states that neither channel recorded leads", () => {
    expect(
      periodConclusion({
        ads: row({ key: "whatsappAds", label: "WhatsApp / Social Ads" }),
        website: row({ key: "website", label: "Website Leads" }),
        wonPctOfQuotations: null,
        loss: lossSummary(lost(0, 0)),
      }),
    ).toBe(
      "Neither WhatsApp and social ads nor the website recorded leads in this period. There is no cost per lead or cost per won lead to compare, and call center follow-up can resume when inquiries arrive.",
    );
  });

  it("says when a channel has no confirmed bookings", () => {
    expect(
      periodConclusion({
        ads: { ...ads, leadsWon: 0, costPerWonLeadPKR: null },
        website: { ...website, leadsWon: 0, costPerWonLeadPKR: null },
        wonPctOfQuotations: null,
        loss: lossSummary(lost(0, 0)),
      }),
    ).toBe(
      "WhatsApp and social ads brought 90 leads at PKR 4,444 per lead. The website brought 30 leads at PKR 1,667 per lead. WhatsApp and social ads had no confirmed bookings. The website had no confirmed bookings. No quotations were sent, so a booking rate is not available yet. No quoted leads were lost. The next period can focus on moving screened leads through to a quotation and a confirmed booking.",
    );
  });

  it("says when spend was not recorded instead of a zero cost", () => {
    expect(
      periodConclusion({
        ads: { ...ads, spendPKR: 0, costPerLeadPKR: 0, costPerWonLeadPKR: 0 },
        website: { ...website, spendPKR: 0, costPerLeadPKR: 0, costPerWonLeadPKR: 0 },
        wonPctOfQuotations: 28.6,
        loss: lossSummary(lost(3, 1)),
      }),
    ).toContain("WhatsApp and social ads brought 90 leads with no spend recorded.");
    expect(
      periodConclusion({
        ads: { ...ads, spendPKR: 0, costPerLeadPKR: 0, costPerWonLeadPKR: 0 },
        website: { ...website, spendPKR: 0, costPerLeadPKR: 0, costPerWonLeadPKR: 0 },
        wonPctOfQuotations: 28.6,
        loss: lossSummary(lost(3, 1)),
      }),
    ).toContain("The website confirmed 3 bookings with no spend recorded.");
  });
});
