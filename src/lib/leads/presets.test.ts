import { describe, expect, it } from "vitest";

import { rangeForPreset } from "./presets";

describe("rangeForPreset", () => {
  it("covers the current month up to today", () => {
    expect(rangeForPreset("this-month", "2026-11-11")).toEqual({ from: "2026-11-01", to: "2026-11-11" });
  });

  it("covers the whole previous month", () => {
    expect(rangeForPreset("last-month", "2026-11-11")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(rangeForPreset("last-month", "2028-03-05")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("rolls back to December of the previous year in January", () => {
    expect(rangeForPreset("last-month", "2027-01-15")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("counts today as one of the last 30 days", () => {
    expect(rangeForPreset("last-30-days", "2026-11-11")).toEqual({ from: "2026-10-13", to: "2026-11-11" });
  });
});
