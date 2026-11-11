import { describe, expect, it } from "vitest";

import { callCenterReasons, lossHeadline, wastedCallout } from "./insights";
import { lossSummary } from "./roster";
import type { LeadQualityBreakdown, LostLeadsRoster } from "./types";

const quality = (overrides: Partial<LeadQualityBreakdown>): LeadQualityBreakdown => ({
  noAnswer: 0,
  notInterested: 0,
  quality: 0,
  total: 0,
  ...overrides,
});

describe("wastedCallout", () => {
  it("returns null when the period has no leads", () => {
    expect(wastedCallout(quality({}))).toBeNull();
  });

  it("states an exact share when the percentage is a whole number", () => {
    expect(wastedCallout(quality({ noAnswer: 1, notInterested: 1, quality: 2, total: 4 }))).toBe(
      "50% of leads (2 of 4) did not reach the quotation stage because they did not answer or were not interested in catering.",
    );
  });

  it("rounds the share down and says more than when the percentage has a fraction", () => {
    expect(wastedCallout(quality({ noAnswer: 124, quality: 75, total: 199 }))).toBe(
      "More than 62% of leads (124 of 199) did not reach the quotation stage because they did not answer or were not interested in catering.",
    );
  });
});

describe("lossHeadline", () => {
  const roster = (callCenter: number, management: number): LostLeadsRoster => ({
    callCenterFollowUp: Array.from({ length: callCenter }, (_, i) => ({ quotedAmountPKR: 0, id: `c${i}` }) as never),
    managementSide: Array.from({ length: management }, (_, i) => ({ quotedAmountPKR: 0, id: `m${i}` }) as never),
    reasonBreakdown: [],
  });

  it("names follow-up quality when call center losses lead", () => {
    expect(lossHeadline(lossSummary(roster(3, 1))).title).toBe(
      "Call center follow-up losses exceed management-side losses",
    );
  });

  it("names management constraints when those losses lead", () => {
    expect(lossHeadline(lossSummary(roster(1, 4))).title).toBe("Management-side losses lead this period");
  });

  it("reports an even split", () => {
    expect(lossHeadline(lossSummary(roster(2, 2))).title).toBe("Losses are evenly split");
  });

  it("reports a clear period when nothing was lost", () => {
    expect(lossHeadline(lossSummary(roster(0, 0))).title).toBe("No lost leads in this period");
  });
});

describe("callCenterReasons", () => {
  it("keeps only call center reasons, in the roster's order", () => {
    const reasons = callCenterReasons({
      callCenterFollowUp: [],
      managementSide: [],
      reasonBreakdown: [
        { category: "Call Center / Follow-up", reason: "Price too high", count: 4 },
        { category: "Management Side", reason: "Location issue", count: 3 },
        { category: "Call Center / Follow-up", reason: "No reply after quote", count: 1 },
      ],
    });
    expect(reasons.map((reason) => reason.reason)).toEqual(["Price too high", "No reply after quote"]);
  });
});
