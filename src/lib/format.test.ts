import { describe, expect, it } from "vitest";

import { formatPKR, formatPct, formatRangeLabel } from "./format";

describe("formatRangeLabel", () => {
  it("states the year once within a year and twice across years", () => {
    expect(formatRangeLabel("2026-10-01", "2026-10-31")).toBe("1 Oct – 31 Oct 2026");
    expect(formatRangeLabel("2026-12-15", "2027-01-10")).toBe("15 Dec 2026 – 10 Jan 2027");
    expect(formatRangeLabel("2026-11-11", "2026-11-11")).toBe("11 Nov 2026");
  });
});

describe("formatPKR", () => {
  it("groups thousands with a PKR prefix", () => {
    expect(formatPKR(1_234_500)).toBe("PKR 1,234,500");
    expect(formatPKR(0)).toBe("PKR 0");
  });

  it("shows an em dash when there is no value", () => {
    expect(formatPKR(null)).toBe("—");
  });
});

describe("formatPct", () => {
  it("keeps one decimal and drops a trailing zero", () => {
    expect(formatPct(28.6)).toBe("28.6%");
    expect(formatPct(50)).toBe("50%");
    expect(formatPct(null)).toBe("—");
  });
});
