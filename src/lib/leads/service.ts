import "server-only";

import { toDateKeyRange } from "./dates";
import { computeCateringEda, datasetCoverage } from "./eda";
import { fetchSheetValues, fetchWorkbookTabs, readGoogleSheetsConfig } from "./google-sheets";
import { generateMockDataset } from "./mock-data";
import { normalizeLeadRows, normalizeSpendRows, type LeadRegister } from "./normalize";
import type { CateringEdaResponse, DateKeyRange, DateRange, LeadDataset } from "./types";

const DEFAULT_CACHE_TTL_SECONDS = 60;

let cache: { dataset: LeadDataset; expiresAt: number } | null = null;
let inFlight: Promise<LeadDataset> | null = null;

function cacheTtlMs(): number {
  const seconds = Number(process.env.LEADS_CACHE_TTL_SECONDS);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_CACHE_TTL_SECONDS) * 1000;
}

async function loadDataset(): Promise<LeadDataset> {
  const config = readGoogleSheetsConfig();
  const fetchedAt = new Date().toISOString();

  if (!config) {
    return {
      ...generateMockDataset(),
      source: "mock",
      fetchedAt,
      warnings: [
        "Google Sheets credentials are not set, so the dashboard is showing sample data. See .env.example.",
      ],
    };
  }

  if (config.enquiriesGid || config.wonGid || config.lostGid) {
    const tabs = await fetchWorkbookTabs(config);
    const read = (rows: string[][] | null, register: LeadRegister, label: string) => {
      if (!rows) return { leads: [], warnings: [`${label} tab is not configured.`] };
      const normalized = normalizeLeadRows(rows, { register });
      return { leads: normalized.leads, warnings: normalized.warnings.map((warning) => `${label}, ${warning}`) };
    };
    const enquiries = read(tabs.enquiries, "enquiries", "All Catering Enquiries");
    const won = read(tabs.won, "won", "Won leads");
    const lost = read(tabs.lost, "lost", "Lost leads");
    return {
      leads: enquiries.leads,
      won: won.leads,
      lost: lost.leads,
      spend: [],
      source: "google-sheets",
      fetchedAt,
      warnings: [
        ...enquiries.warnings,
        ...won.warnings,
        ...lost.warnings,
        "This workbook has no spend tab, so spend and cost metrics read as zero.",
      ],
    };
  }

  const values = await fetchSheetValues(config);
  const leads = normalizeLeadRows(values.leads);
  const spend = values.spend ? normalizeSpendRows(values.spend) : { spend: [], warnings: [] };

  return {
    leads: leads.leads,
    spend: spend.spend,
    source: "google-sheets",
    fetchedAt,
    warnings: [
      ...leads.warnings.map((w) => `Leads sheet, ${w}`),
      ...spend.warnings.map((w) => `Spend sheet, ${w}`),
      ...(values.spend ? [] : ["No spend range configured, so spend and cost metrics read as zero."]),
    ],
  };
}

/** Returns the normalized dataset, served from a short in-memory cache. */
export async function getLeadDataset({ fresh = false }: { fresh?: boolean } = {}): Promise<LeadDataset> {
  if (!fresh && cache && cache.expiresAt > Date.now()) return cache.dataset;
  if (inFlight) return inFlight;

  inFlight = loadDataset()
    .then((dataset) => {
      cache = { dataset, expiresAt: Date.now() + cacheTtlMs() };
      return dataset;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function getCateringEda(
  range: DateRange | DateKeyRange,
  options?: { fresh?: boolean },
): Promise<CateringEdaResponse> {
  const dataset = await getLeadDataset(options);
  return {
    meta: {
      source: dataset.source,
      fetchedAt: dataset.fetchedAt,
      warnings: dataset.warnings,
      coverage: datasetCoverage(dataset.leads),
    },
    eda: computeCateringEda(dataset, toDateKeyRange(range)),
  };
}
