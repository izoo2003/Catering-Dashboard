import { describe, expect, it } from "vitest";

import { daysUntilEvent, EMPTY_FILTERS, filterRoster, followUpStatus, lossSummary } from "./roster";
import type { CateringLead } from "./types";

function lead(id: string, overrides: Partial<CateringLead> = {}): CateringLead {
  return {
    id,
    clientName: `Client ${id}`,
    phone: "",
    inquiryDate: "2026-10-05",
    channel: "WhatsApp/Ads",
    initialStatus: "Interested",
    quotationStatus: "Quotation Sent",
    finalOutcome: "In Progress",
    lostCategory: null,
    lostReasonDetail: null,
    eventDate: null,
    guestCount: null,
    quotedAmountPKR: null,
    ...overrides,
  };
}

describe("filterRoster", () => {
  const leads = [
    lead("1", { clientName: "Ayesha Khan", phone: "+92 300 1234567" }),
    lead("2", { clientName: "Engro Corp HR", channel: "Website", notes: "Asked for live BBQ station" }),
    lead("3", { clientName: "Bilal Raza", lostReasonDetail: "Price too high" }),
  ];
  const ids = (list: CateringLead[]) => list.map((l) => l.id);

  it("returns everything with empty filters", () => {
    expect(ids(filterRoster(leads, EMPTY_FILTERS))).toEqual(["1", "2", "3"]);
  });

  it("matches name case-insensitively, phone by digits, and notes or reason text", () => {
    expect(ids(filterRoster(leads, { query: "ayesha", channel: "all" }))).toEqual(["1"]);
    expect(ids(filterRoster(leads, { query: "0300-123", channel: "all" }))).toEqual(["1"]);
    expect(ids(filterRoster(leads, { query: "1234567", channel: "all" }))).toEqual(["1"]);
    expect(ids(filterRoster(leads, { query: "bbq", channel: "all" }))).toEqual(["2"]);
    expect(ids(filterRoster(leads, { query: "price", channel: "all" }))).toEqual(["3"]);
  });

  it("filters by channel", () => {
    expect(ids(filterRoster(leads, { query: "", channel: "Website" }))).toEqual(["2"]);
    expect(ids(filterRoster(leads, { query: "ayesha", channel: "Website" }))).toEqual([]);
  });
});

describe("followUpStatus", () => {
  it("maps the final outcome onto the follow-up status", () => {
    expect(followUpStatus(lead("a"))).toBe("Awaiting Reply");
    expect(followUpStatus(lead("b", { finalOutcome: "Won" }))).toBe("Won");
    expect(followUpStatus(lead("c", { finalOutcome: "Lost" }))).toBe("Lost");
  });
});

describe("daysUntilEvent", () => {
  it("counts days from today and goes negative after the event", () => {
    expect(daysUntilEvent(lead("a", { eventDate: "2026-11-25" }), "2026-11-11")).toBe(14);
    expect(daysUntilEvent(lead("b", { eventDate: "2026-11-11" }), "2026-11-11")).toBe(0);
    expect(daysUntilEvent(lead("c", { eventDate: "2026-11-01" }), "2026-11-11")).toBe(-10);
    expect(daysUntilEvent(lead("d"), "2026-11-11")).toBeNull();
  });
});

describe("lossSummary", () => {
  const lost = { finalOutcome: "Lost" } as const;

  it("compares call center and management losses", () => {
    const summary = lossSummary({
      callCenterFollowUp: [
        lead("1", { ...lost, quotedAmountPKR: 300_000 }),
        lead("2", { ...lost, quotedAmountPKR: 150_000 }),
        lead("3", { ...lost }),
      ],
      managementSide: [lead("4", { ...lost, quotedAmountPKR: 90_000 })],
      reasonBreakdown: [],
    });
    expect(summary).toEqual({
      total: 4,
      callCenter: { count: 3, sharePct: 75, quotedPKR: 450_000 },
      management: { count: 1, sharePct: 25, quotedPKR: 90_000 },
      callCenterExceeds: true,
      gap: 2,
    });
  });

  it("does not flag call center when management is higher or nothing was lost", () => {
    const managementHeavy = lossSummary({
      callCenterFollowUp: [],
      managementSide: [lead("1", lost)],
      reasonBreakdown: [],
    });
    expect(managementHeavy).toMatchObject({ callCenterExceeds: false, gap: -1 });

    const empty = lossSummary({ callCenterFollowUp: [], managementSide: [], reasonBreakdown: [] });
    expect(empty).toMatchObject({ total: 0, callCenterExceeds: false, callCenter: { sharePct: null } });
  });
});
