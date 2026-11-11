import { addDays, lastDayOfMonth, toDateKey } from "./dates";
import type {
  CateringLead,
  ChannelSpendPeriod,
  DateKey,
  FinalOutcome,
  InitialStatus,
  LeadChannel,
  LeadDataset,
  LostCategory,
} from "./types";

const FIRST_NAMES = [
  "Ayesha", "Fatima", "Hira", "Sana", "Mahnoor", "Zainab", "Amna", "Maryam", "Iqra", "Rabia",
  "Ali", "Hamza", "Usman", "Bilal", "Saad", "Omar", "Faisal", "Hassan", "Ahmed", "Zain",
];
const LAST_NAMES = [
  "Khan", "Malik", "Sheikh", "Qureshi", "Chaudhry", "Butt", "Raza", "Siddiqui", "Mirza", "Hashmi",
  "Abbasi", "Rana", "Javed", "Iqbal", "Farooq",
];
const COMPANIES = [
  "Engro Corp HR", "Systems Ltd Events", "Packages Group", "Nishat Mills Admin", "Jazz Corporate",
  "LUMS Alumni Office", "Interloop Ltd", "Haier Pakistan", "Unilever PK Events", "Sapphire Retail",
];

const MANAGEMENT_REASONS = ["Location issue", "Date overlap", "Guests under 30"] as const;
const CALL_CENTER_REASONS = [
  "Price too high", "No response after quote", "Chose another caterer", "Delayed follow-up",
] as const;

const REPS = ["Sadia", "Kamran", "Noor", "Waqas", "Mehwish"] as const;

const WASTED_NOTES: Record<"No Answer" | "Not Interested", readonly string[]> = {
  "No Answer": [
    "Called twice, no answer. WhatsApp message left on read.",
    "Number switched off on three attempts.",
    "Sent menu on WhatsApp, no reply after 48 hours.",
  ],
  "Not Interested": [
    "Was asking about dine-in reservations, not catering.",
    "Only wanted a price list; not planning an event.",
    "Clicked the ad by mistake.",
  ],
};

const LOST_NOTES: Record<string, readonly string[]> = {
  "Location issue": [
    "Venue is outside our delivery radius (Bahria Phase 8). Management declined.",
    "Event in Murree; logistics not feasible for the kitchen team.",
  ],
  "Date overlap": [
    "Requested date already booked for a 300-guest wedding.",
    "Kitchen at full capacity that weekend; client could not move the date.",
  ],
  "Guests under 30": [
    "Guest count below our 30-guest catering minimum.",
    "Small family dinner; referred to dine-in instead.",
  ],
  "Price too high": [
    "Client felt per-head rate was above budget; asked for 25% off.",
    "Compared with a cheaper home caterer and declined our quote.",
  ],
  "No response after quote": [
    "Quote sent on WhatsApp, three follow-ups with no reply.",
    "Client said they would confirm by Friday, then went silent.",
  ],
  "Chose another caterer": [
    "Booked a competitor that offered free live stations.",
    "Went with the venue's in-house caterer.",
  ],
  "Delayed follow-up": [
    "Quote went out four days late; client had already booked elsewhere.",
    "No callback for a week after the first inquiry.",
  ],
};

/** Small seeded PRNG so the fallback data is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MockDatasetOptions {
  /** Last inquiry date in the dataset. Defaults to today. */
  endDate?: DateKey;
  days?: number;
  seed?: number;
}

export function generateMockDataset({
  endDate = toDateKey(new Date()),
  days = 180,
  seed = 1956,
}: MockDatasetOptions = {}): Pick<LeadDataset, "leads" | "spend"> {
  const rand = mulberry32(seed);
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  const chance = (p: number) => rand() < p;

  const startDate = addDays(endDate, -(days - 1));
  const leads: CateringLead[] = [];

  for (let offset = 0; offset < days; offset++) {
    const inquiryDate = addDays(startDate, offset);
    const ageInDays = days - 1 - offset;
    const weekday = new Date(`${inquiryDate}T00:00:00Z`).getUTCDay();
    const weekendBoost = weekday === 5 || weekday === 6 ? 2 : 0;

    const dailyCounts: [LeadChannel, number][] = [
      ["WhatsApp/Ads", between(3, 8) + weekendBoost],
      ["Website", between(0, 3)],
    ];

    for (const [channel, count] of dailyCounts) {
      for (let n = 0; n < count; n++) {
        leads.push(buildLead(channel, inquiryDate, ageInDays, leads.length + 1));
      }
    }
  }

  function buildLead(channel: LeadChannel, inquiryDate: DateKey, ageInDays: number, serial: number): CateringLead {
    const isAd = channel === "WhatsApp/Ads";
    const roll = rand();
    const initialStatus: InitialStatus = isAd
      ? roll < 0.38 ? "No Answer" : roll < 0.58 ? "Not Interested" : "Interested"
      : roll < 0.12 ? "No Answer" : roll < 0.22 ? "Not Interested" : "Interested";

    const corporate = chance(0.18);
    const clientName = corporate ? pick(COMPANIES) : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const phone = `+92 3${between(0, 4)}${between(0, 9)} ${String(between(0, 9_999_999)).padStart(7, "0")}`;
    const id = `CL-${inquiryDate.replaceAll("-", "")}-${String(serial).padStart(4, "0")}`;

    const base = { id, clientName, phone, inquiryDate, channel, handledBy: pick(REPS) };

    if (initialStatus !== "Interested") {
      return {
        ...base,
        initialStatus,
        quotationStatus: "Not Sent",
        finalOutcome: "Lost",
        lostCategory: null,
        lostReasonDetail: null,
        eventDate: null,
        guestCount: null,
        quotedAmountPKR: null,
        notes: pick(WASTED_NOTES[initialStatus]),
      };
    }

    const eventDate = addDays(inquiryDate, between(7, 75));
    let guestCount = corporate ? between(60, 400) : between(18, 250);

    // Recent leads are still being worked; older ones have mostly resolved.
    const resolved = ageInDays > 21 ? 0.9 : ageInDays > 7 ? 0.55 : 0.15;
    const quoteSent = chance(ageInDays > 3 ? 0.78 : 0.4);

    let finalOutcome: FinalOutcome = "In Progress";
    let lostCategory: LostCategory | null = null;
    let lostReasonDetail: string | null = null;

    if (guestCount < 30 && chance(0.7)) {
      finalOutcome = "Lost";
      lostCategory = "Management Side";
      lostReasonDetail = "Guests under 30";
    } else if (chance(resolved)) {
      const wonRate = quoteSent ? (isAd ? 0.32 : 0.42) : 0;
      if (chance(wonRate)) {
        finalOutcome = "Won";
      } else if (quoteSent || chance(0.6)) {
        finalOutcome = "Lost";
        if (chance(0.38)) {
          lostCategory = "Management Side";
          lostReasonDetail = pick(MANAGEMENT_REASONS.slice(0, 2));
        } else {
          lostCategory = "Call Center / Follow-up";
          lostReasonDetail = quoteSent ? pick(CALL_CENTER_REASONS) : "Delayed follow-up";
        }
      }
    }

    if (lostReasonDetail === "Guests under 30") guestCount = Math.min(guestCount, 29);
    const quotationSent = finalOutcome === "Won" || quoteSent;
    const perHead = between(7, 15) * 500;
    const sentDate = addDays(inquiryDate, between(1, 4));

    return {
      ...base,
      initialStatus,
      quotationStatus: quotationSent ? "Quotation Sent" : "Pending Quotation",
      finalOutcome,
      lostCategory,
      lostReasonDetail,
      eventDate,
      guestCount,
      quotedAmountPKR: quotationSent ? Math.round((guestCount * perHead) / 500) * 500 : null,
      quotationSentDate: quotationSent ? (sentDate > endDate ? endDate : sentDate) : null,
      notes: lostReasonDetail ? pick(LOST_NOTES[lostReasonDetail]) : null,
    };
  }

  const spend: ChannelSpendPeriod[] = [];
  let [year, month] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const mm = String(month).padStart(2, "0");
    spend.push({
      periodStart: `${year}-${mm}-01`,
      periodEnd: `${year}-${mm}-${String(lastDayOfMonth(year, month)).padStart(2, "0")}`,
      whatsappAdsSpendPKR: between(42, 68) * 10_000,
      websiteSpendPKR: between(6, 11) * 10_000,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { leads, spend };
}
