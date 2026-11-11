import { describe, expect, it } from "vitest";

import { parseSheetDate } from "./dates";
import { SheetSchemaError, normalizeLeadRows, normalizeSpendRows } from "./normalize";

const HEADER = [
  "Lead ID", "Client Name", "Phone", "Inquiry Date", "Source", "Status",
  "Quote Status", "Outcome", "Loss Category", "Lost Reason", "Event Date", "Guests", "Quoted Amount (PKR)",
];

describe("normalizeLeadRows", () => {
  it("maps header aliases and free-text values onto the lead schema", () => {
    const { leads, warnings } = normalizeLeadRows([
      HEADER,
      ["L1", "Ayesha Khan", "0300 1234567", "03/11/2026", "Facebook Ads", "interested", "Sent", "Booked", "", "", "20/12/2026", "120", "PKR 540,000"],
    ]);

    expect(warnings).toEqual([]);
    expect(leads[0]).toEqual({
      id: "L1",
      clientName: "Ayesha Khan",
      phone: "0300 1234567",
      inquiryDate: "2026-11-03",
      channel: "WhatsApp/Ads",
      initialStatus: "Interested",
      quotationStatus: "Quotation Sent",
      finalOutcome: "Won",
      lostCategory: null,
      lostReasonDetail: null,
      eventDate: "2026-12-20",
      guestCount: 120,
      quotedAmountPKR: 540000,
      quotationSentDate: null,
      brand: null,
      email: null,
      location: null,
      notes: null,
      handledBy: null,
    });
  });

  it("enforces the lead state machine", () => {
    const { leads } = normalizeLeadRows([
      HEADER,
      ["A", "Pending", "", "2026-11-01", "WhatsApp", "Interested", "", "", "", "", "", "", ""],
      ["B", "Ghosted", "", "2026-11-01", "Instagram", "No answer / useless", "", "", "", "", "", "", ""],
      ["C", "Small party", "", "2026-11-01", "Website", "Interested", "Sent", "Lost", "", "Guests under 30", "", "22", ""],
      ["D", "Too pricey", "", "2026-11-01", "Website", "Interested", "Sent", "Lost", "", "Price too high", "", "", ""],
      ["E", "Uninterested", "", "2026-11-01", "Ads", "Not interested in catering", "Sent", "Lost", "Management", "Location issue", "", "", ""],
    ]);
    const byId = Object.fromEntries(leads.map((lead) => [lead.id, lead]));

    expect(byId.A).toMatchObject({ quotationStatus: "Pending Quotation", finalOutcome: "In Progress" });
    expect(byId.B).toMatchObject({ initialStatus: "No Answer", quotationStatus: "Not Sent", lostCategory: null });
    expect(byId.C).toMatchObject({ channel: "Website", lostCategory: "Management Side" });
    expect(byId.D).toMatchObject({ lostCategory: "Call Center / Follow-up" });
    expect(byId.E).toMatchObject({
      initialStatus: "Not Interested",
      quotationStatus: "Not Sent",
      lostCategory: null,
      lostReasonDetail: null,
    });
  });

  it("skips undated rows and reports them", () => {
    const { leads, warnings } = normalizeLeadRows([
      HEADER,
      ["A", "No date", "", "", "Website", "Interested"],
      [],
    ]);
    expect(leads).toHaveLength(0);
    expect(warnings).toEqual(["1 row: skipped, inquiry date missing or unreadable"]);
  });

  it("rejects a sheet without the required columns", () => {
    expect(() => normalizeLeadRows([["Client Name", "Phone"]])).toThrow(SheetSchemaError);
  });

  it("reads the call-center log, including month banners and a Status column that means the outcome", () => {
    const header = [
      "S No.", "Date", "Brand", "Customer Name", "Phone", "Email", "Event Date", "Location",
      "No. of Guests", "Medium", "Brochure Sent", "Quotation Sent", "Loss Reason",
      "Notes /  Call Center Remarks", "Status", "Handled By",
    ];
    const { leads, warnings } = normalizeLeadRows([
      ["", ""],
      ["Sep-26"],
      header,
      ["1", "01/09/26", "Xanders", "Faiq", "0321-1111111", "", "29th Sep", "DHA", "30-50", "Instagram/Social", "Yes", "Quotation Sent", "Budget Issue", "out of budget", "Not Converted", "Asad"],
      ["2", "02/09/26", "Xanders", "", "0333-0000000", "", "5-Sep", "", "", "Phone Call", "Yes", "No", "Already Booked", "we were already booked", "Already Booked", "Jahanzaib"],
      header,
      ["Oct-26"],
      ["2", "10/09/26", "Xanders", "Hani Shah", "0323-2190260", "", "19 Oct", "Bahria Town", "55", "Whatsapp", "Yes", "Pending Quotation ", "Out Of Radius", "out of radius", "Managment Not Allow", "Jahanzaib"],
      ["4", "18/09/26", "Colette", "Shajia", "0300-3550996", "shajia@example.com", "10Oct", "DHA", "30", "Website Form", "Yes", "Quotation Sent", "No Response", "no reply", "Not Converted", "Obaid"],
    ]);

    expect(warnings).toEqual([]);
    expect(leads.map((lead) => lead.id)).toEqual(["Sep-26-1", "Sep-26-2", "Oct-26-2", "Oct-26-4"]);
    expect(leads[0]).toMatchObject({
      inquiryDate: "2026-09-01",
      eventDate: "2026-09-29",
      channel: "WhatsApp/Ads",
      guestCount: 30,
      quotationStatus: "Quotation Sent",
      finalOutcome: "Lost",
      lostCategory: "Call Center / Follow-up",
      lostReasonDetail: "Budget Issue",
      brand: "Xanders",
      handledBy: "Asad",
    });
    expect(leads[1]).toMatchObject({
      clientName: "Unnamed client",
      quotationStatus: "Not Sent",
      finalOutcome: "Lost",
      lostCategory: "Management Side",
      eventDate: "2026-09-05",
    });
    expect(leads[2]).toMatchObject({
      inquiryDate: "2026-09-10",
      eventDate: "2026-10-19",
      quotationStatus: "Pending Quotation",
      lostCategory: "Management Side",
      location: "Bahria Town",
    });
    expect(leads[3]).toMatchObject({
      brand: "Colette",
      channel: "Website",
      eventDate: "2026-10-10",
      lostCategory: "Call Center / Follow-up",
      email: "shajia@example.com",
    });
  });

  it("keeps open enquiry statuses in follow-up and closed ones as lost", () => {
    const header = ["Date", "Customer Name", "Phone", "Medium", "Quotation Sent", "Status"];
    const { leads } = normalizeLeadRows([
      header,
      ["01/09/26", "A", "03001111111", "Instagram/Social", "No", "No Answer"],
      ["02/09/26", "B", "03002222222", "Whatsapp", "No", "Follow ups"],
      ["03/09/26", "C", "03003333333", "Whatsapp", "Quotation Sent", "Insterested"],
      ["04/09/26", "D", "03004444444", "Phone Call", "Quotation Sent", "Not Converted"],
    ]);
    expect(leads.map((lead) => [lead.clientName, lead.initialStatus, lead.finalOutcome, lead.quotationStatus])).toEqual([
      ["A", "No Answer", "Lost", "Not Sent"],
      ["B", "Interested", "In Progress", "Pending Quotation"],
      ["C", "Interested", "In Progress", "Quotation Sent"],
      ["D", "Interested", "Lost", "Quotation Sent"],
    ]);
  });

  it("reads the won tab with shifting headers and drops a repeated booking", () => {
    const june = ["Date", "Brand", "Customer Name", "Phone", "Medium", "Quotation Sent", "Status"];
    const september = ["Date", "Brand", "Customer Name", "Phone", "Medium", "Brochure Sent", "Quotation Sent", "Status"];
    const { leads, warnings } = normalizeLeadRows(
      [
        ["June 2026"],
        june,
        ["02-Jun-2026", "Xander's", "Tanya Mirza", "0321-8887776", "WhatsApp", "Yes", "Won"],
        ["September 2026"],
        september,
        ["02/06/26", "Xander's", "Tanya Mirza", "0321-8887776", "WhatsApp", "Yes", "Quotation Sent", "Insterested"],
        ["15/09/26", "Colette", "Novera", "0333-2123265", "WhatsApp", "Yes", "Quotation Sent", "Interested"],
      ],
      { register: "won" },
    );
    expect(warnings).toEqual(["1 duplicate won booking removed"]);
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({
      clientName: "Tanya Mirza",
      inquiryDate: "2026-06-02",
      finalOutcome: "Won",
      quotationStatus: "Quotation Sent",
      channel: "WhatsApp/Ads",
    });
    expect(leads[1]).toMatchObject({ brand: "Colette", clientName: "Novera", finalOutcome: "Won", inquiryDate: "2026-09-15" });
  });

  it("keeps ids unique when serials repeat and prefixes ids from the Won and Lost tabs", () => {
    const rows = [
      HEADER,
      ["7", "Sophia", "", "2026-11-01", "Website", "No answer", "", "", "", "", "", "", ""],
      ["7", "Humaira", "", "2026-11-02", "WhatsApp", "No answer", "", "", "", "", "", "", ""],
    ];
    expect(normalizeLeadRows(rows).leads.map((lead) => lead.id)).toEqual(["7", "7-2"]);
    expect(normalizeLeadRows(rows, { register: "lost" }).leads.map((lead) => lead.id)).toEqual(["lost-7", "lost-7-2"]);
  });
});

describe("normalizeSpendRows", () => {
  it("accepts month rows and explicit periods", () => {
    const { spend } = normalizeSpendRows([
      ["Month", "Period Start", "Period End", "WhatsApp Ads Spend (PKR)", "Website Spend (PKR)"],
      ["Oct 2026", "", "", "PKR 500,000", "75000"],
      ["", "2026-11-01", "2026-11-15", 250000, 40000],
    ]);
    expect(spend).toEqual([
      { periodStart: "2026-10-01", periodEnd: "2026-10-31", whatsappAdsSpendPKR: 500000, websiteSpendPKR: 75000 },
      { periodStart: "2026-11-01", periodEnd: "2026-11-15", whatsappAdsSpendPKR: 250000, websiteSpendPKR: 40000 },
    ]);
  });
});

describe("parseSheetDate", () => {
  it.each([
    ["2026-11-03", "2026-11-03"],
    ["2026-11-03T09:30:00", "2026-11-03"],
    ["03/11/2026", "2026-11-03"],
    ["11/25/2026", "2026-11-25"],
    ["3 Nov 2026", "2026-11-03"],
    ["Nov 3, 2026", "2026-11-03"],
    [45658, "2025-01-01"],
    ["31/02/2026", null],
    ["soon", null],
  ])("%s -> %s", (input, expected) => {
    expect(parseSheetDate(input)).toBe(expected);
  });
});
