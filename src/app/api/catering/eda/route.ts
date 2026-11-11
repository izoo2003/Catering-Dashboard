import type { NextRequest } from "next/server";

import { addDays, isDateKey, toDateKey } from "@/lib/leads/dates";
import { GoogleSheetsError } from "@/lib/leads/google-sheets";
import { SheetSchemaError } from "@/lib/leads/normalize";
import { getCateringEda } from "@/lib/leads/service";

const DEFAULT_RANGE_DAYS = 30;

/**
 * GET /api/catering/eda?all=1
 * GET /api/catering/eda?from=YYYY-MM-DD&to=YYYY-MM-DD[&refresh=1]
 * `all=1` covers every inquiry. Without `from`/`to`, covers the last 30 days ending today.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fresh = params.get("refresh") === "1";
  let range: { from: string; to: string } | null = null;

  if (params.get("all") !== "1") {
    const to = params.get("to") ?? toDateKey(new Date());
    const from = params.get("from") ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));

    if (!isDateKey(from) || !isDateKey(to)) {
      return Response.json({ error: "`from` and `to` must be dates in YYYY-MM-DD format." }, { status: 400 });
    }
    if (from > to) {
      return Response.json({ error: "`from` must be on or before `to`." }, { status: 400 });
    }
    range = { from, to };
  }

  try {
    const result = await getCateringEda(range, { fresh });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SheetSchemaError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof GoogleSheetsError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    console.error("Failed to build catering EDA", error);
    return Response.json({ error: "Could not load catering leads." }, { status: 500 });
  }
}
