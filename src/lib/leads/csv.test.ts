import { describe, expect, it } from "vitest";

import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("keeps quoted commas, quotes, and line breaks", () => {
    expect(parseCsv('Name,Note\n"Khan, Ayesha","Said ""yes""\nstill waiting"\n')).toEqual([
      ["Name", "Note"],
      ["Khan, Ayesha", 'Said "yes"\nstill waiting'],
    ]);
  });
});
