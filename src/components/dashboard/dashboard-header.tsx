import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRangeLabel } from "@/lib/format";
import type { CateringEdaMeta, DateKeyRange } from "@/lib/leads/types";

interface DashboardHeaderProps {
  period: DateKeyRange | null;
  meta: CateringEdaMeta | null;
}

const fetchedTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function DashboardHeader({ period, meta }: DashboardHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-10 pb-6 sm:px-6 lg:px-10 lg:pt-14">
      <p className="text-xs font-semibold tracking-[0.28em] text-gold-ink uppercase">
        Reporting period
        {period && <span className="tabular-nums"> · {formatRangeLabel(period.from, period.to)}</span>}
      </p>

      <h1 className="font-heading text-3xl leading-tight text-balance text-primary sm:text-4xl lg:text-5xl">
        <span className="font-semibold tracking-[0.06em]">COLETTE CATERING</span>{" "}
        <span className="text-gold">—</span>{" "}
        <span className="font-normal italic">Intelligence &amp; Lead Performance</span>
      </h1>

      <div className="flex items-center gap-2" aria-hidden>
        <Separator className="bg-gold data-horizontal:w-16" />
        <span className="size-1.5 rotate-45 bg-gold" />
        <Separator className="bg-gold/40 data-horizontal:w-8" />
      </div>

      {meta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <Badge variant={meta.source === "google-sheets" ? "secondary" : "outline"}>
            {meta.source === "google-sheets" ? "Live · Google Sheets" : "Sample data"}
          </Badge>
          <span>Updated {fetchedTime.format(new Date(meta.fetchedAt))}</span>
          {meta.coverage && (
            <span className="tabular-nums">
              Sheet covers {formatRangeLabel(meta.coverage.from, meta.coverage.to)}
            </span>
          )}
        </div>
      )}
    </header>
  );
}
