import "server-only";

import { createSign } from "node:crypto";

import { parseCsv } from "./csv";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  leadsRange: string;
  /** Empty when the spend tab is not configured. */
  spendRange: string;
  /** Tab id from the sheet URL (`gid=`). Used when the sheet is shared by link and no API key is set. */
  leadsGid: string | null;
  enquiriesGid: string | null;
  wonGid: string | null;
  lostGid: string | null;
  spendGid: string | null;
  auth:
    | { kind: "service-account"; clientEmail: string; privateKey: string }
    | { kind: "api-key"; apiKey: string }
    | null;
}

const PRIVATE_SHEET_MESSAGE =
  "This Google Sheet requires a sign-in, so the dashboard cannot read it yet. In Google Sheets choose Share, set General access to Anyone with the link, and set the role to Viewer. The sheet contains client phone numbers, so a service account is the private alternative: share the sheet with that account as Viewer and set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.";

export class GoogleSheetsError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GoogleSheetsError";
  }
}

/** Returns `null` only when no spreadsheet id is configured. Auth can be added later. */
export function readGoogleSheetsConfig(env: NodeJS.ProcessEnv = process.env): GoogleSheetsConfig | null {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  if (!spreadsheetId) return null;

  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const apiKey = env.GOOGLE_SHEETS_API_KEY?.trim();

  const auth: GoogleSheetsConfig["auth"] =
    clientEmail && privateKey
      ? { kind: "service-account", clientEmail, privateKey }
      : apiKey
        ? { kind: "api-key", apiKey }
        : null;

  const range = (value: string | undefined, fallback: string) => (value === undefined ? fallback : value.trim());

  return {
    spreadsheetId,
    leadsGid: env.GOOGLE_SHEETS_LEADS_GID?.trim() || null,
    enquiriesGid: env.GOOGLE_SHEETS_ENQUIRIES_GID?.trim() || null,
    wonGid: env.GOOGLE_SHEETS_WON_GID?.trim() || null,
    lostGid: env.GOOGLE_SHEETS_LOST_GID?.trim() || null,
    spendGid: env.GOOGLE_SHEETS_SPEND_GID?.trim() || null,
    leadsRange: range(env.GOOGLE_SHEETS_LEADS_RANGE, "Leads!A:Z"),
    spendRange: range(env.GOOGLE_SHEETS_SPEND_RANGE, "Spend!A:Z"),
    auth,
  };
}

let cachedToken: { accessToken: string; expiresAt: number; clientEmail: string } | null = null;

async function getServiceAccountToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.clientEmail === clientEmail && cachedToken.expiresAt - 60 > now) {
    return cachedToken.accessToken;
  }

  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;

  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
  } catch {
    throw new GoogleSheetsError(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY could not be used to sign a token. Paste the full PEM key, keeping the \\n line breaks.",
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GoogleSheetsError(
      `Google rejected the service account (${response.status}): ${await response.text()}`,
      response.status,
    );
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { accessToken: body.access_token, expiresAt: now + body.expires_in, clientEmail };
  return body.access_token;
}

function sheetCsvUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

/** Reads a tab that is shared as "Anyone with the link". No Google Cloud key required. */
export async function fetchPublicCsv(spreadsheetId: string, gid: string): Promise<string[][]> {
  const response = await fetch(sheetCsvUrl(spreadsheetId, gid), { cache: "no-store", redirect: "follow" });
  const text = await response.text();
  const looksLikeLogin = response.url.includes("accounts.google.com") || text.trimStart().startsWith("<");
  if (!response.ok || looksLikeLogin) {
    throw new GoogleSheetsError(PRIVATE_SHEET_MESSAGE, response.status);
  }
  return parseCsv(text);
}

/** Reads the three call-center tabs by gid. A missing gid comes back as null. */
export async function fetchWorkbookTabs(config: GoogleSheetsConfig): Promise<{
  enquiries: string[][] | null;
  won: string[][] | null;
  lost: string[][] | null;
}> {
  const load = (gid: string | null) => (gid ? fetchPublicCsv(config.spreadsheetId, gid) : Promise.resolve(null));
  const [enquiries, won, lost] = await Promise.all([
    load(config.enquiriesGid),
    load(config.wonGid),
    load(config.lostGid),
  ]);
  return { enquiries, won, lost };
}

/** Reads the configured ranges in one call. Numbers come back raw; dates as their displayed text. */
export async function fetchSheetValues(config: GoogleSheetsConfig): Promise<{
  leads: unknown[][];
  spend: unknown[][] | null;
}> {
  if (!config.auth) {
    if (!config.leadsGid) {
      throw new GoogleSheetsError(
        "The spreadsheet id is set, but there is no tab id and no Google credentials. Set GOOGLE_SHEETS_LEADS_GID, or add a service account or API key.",
      );
    }
    return {
      leads: await fetchPublicCsv(config.spreadsheetId, config.leadsGid),
      spend: config.spendGid ? await fetchPublicCsv(config.spreadsheetId, config.spendGid) : null,
    };
  }

  const ranges = [config.leadsRange, ...(config.spendRange ? [config.spendRange] : [])];
  const params = new URLSearchParams({
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
    majorDimension: "ROWS",
  });
  for (const range of ranges) params.append("ranges", range);

  const headers: HeadersInit = {};
  if (config.auth.kind === "api-key") {
    params.set("key", config.auth.apiKey);
  } else {
    const token = await getServiceAccountToken(config.auth.clientEmail, config.auth.privateKey);
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${SHEETS_API}/${encodeURIComponent(config.spreadsheetId)}/values:batchGet?${params}`;
  const response = await fetch(url, { headers, cache: "no-store" });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {}
    const hint =
      response.status === 403 || response.status === 404
        ? " Check the spreadsheet ID, that the tab names match the configured ranges, and that the sheet is shared with the service account."
        : "";
    throw new GoogleSheetsError(`Google Sheets request failed (${response.status}): ${detail}.${hint}`, response.status);
  }

  const body = (await response.json()) as { valueRanges?: { values?: unknown[][] }[] };
  const [leadsRange, spendRange] = body.valueRanges ?? [];
  return {
    leads: leadsRange?.values ?? [],
    spend: config.spendRange ? (spendRange?.values ?? []) : null,
  };
}
