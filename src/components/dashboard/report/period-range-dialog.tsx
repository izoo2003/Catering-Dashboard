"use client";

import { useState, useSyncExternalStore } from "react";
import { FileChartColumnIcon, TriangleAlertIcon } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatRangeLabel } from "@/lib/format";
import { daysInclusive, fromDateKey, toDateKey } from "@/lib/leads/dates";
import { DATE_PRESETS, rangeForPreset, type DatePreset } from "@/lib/leads/presets";
import type { DateKey, DateKeyRange } from "@/lib/leads/types";

interface DraftRange {
  from?: DateKey;
  to?: DateKey;
}

interface PeriodRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: DateKey;
  isLoading: boolean;
  error: string | null;
  onGenerate: (range: DateKeyRange) => void;
}

const subscribeWide = (onStoreChange: () => void) => {
  const media = window.matchMedia("(min-width: 40rem)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

function useTwoMonths(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia("(min-width: 40rem)").matches, () => false);
}

/** The left of the two visible months: the range start, but never past last month. */
function leftMonthFor(from: DateKey | undefined, today: DateKey): Date {
  const now = fromDateKey(today);
  const lastLeft = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (!from) return lastLeft;
  const start = fromDateKey(from);
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  return startMonth < lastLeft ? startMonth : lastLeft;
}

export function PeriodRangeDialog({ open, onOpenChange, today, isLoading, error, onGenerate }: PeriodRangeDialogProps) {
  const twoMonths = useTwoMonths();
  const [range, setRange] = useState<DraftRange>({});
  const [preset, setPreset] = useState<DatePreset>("custom");
  const [month, setMonth] = useState<Date | undefined>();
  const todayDate = fromDateKey(today);
  const complete = Boolean(range.from && range.to);

  const selected: DayPickerRange | undefined = range.from
    ? { from: fromDateKey(range.from), to: range.to ? fromDateKey(range.to) : undefined }
    : undefined;

  function handlePreset(values: string[]) {
    const next = DATE_PRESETS.find((item) => item.value === values[0])?.value;
    if (!next) return;
    if (next === "custom") {
      setPreset("custom");
      return;
    }
    const nextRange = rangeForPreset(next, today);
    setRange(nextRange);
    setPreset(next);
    setMonth(leftMonthFor(nextRange.from, today));
  }

  function handleSelect(next: DayPickerRange | undefined) {
    setRange({
      from: next?.from ? toDateKey(next.from) : undefined,
      to: next?.to ? toDateKey(next.to) : undefined,
    });
    setPreset("custom");
  }

  function handleGenerate() {
    if (!range.from || !range.to || isLoading) return;
    onGenerate({ from: range.from, to: range.to });
  }

  const summary =
    range.from && range.to
      ? `${formatRangeLabel(range.from, range.to)} · ${daysInclusive(range.from, range.to)} days`
      : range.from
        ? "Select an end date"
        : "Select a start date, then an end date";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,48rem)] w-auto flex-col overflow-hidden sm:max-w-max">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Period for this report</DialogTitle>
          <DialogDescription>Choose the first and last day this report should cover.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <Field>
          <FieldLabel>From and to</FieldLabel>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[preset]}
            onValueChange={handlePreset}
            className="flex-wrap"
            aria-label="Date presets"
          >
            {DATE_PRESETS.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Calendar
            mode="range"
            resetOnSelect
            numberOfMonths={twoMonths ? 2 : 1}
            selected={selected}
            onSelect={handleSelect}
            month={month ?? leftMonthFor(range.from, today)}
            onMonthChange={setMonth}
            endMonth={todayDate}
            disabled={{ after: todayDate }}
            className="rounded-lg border p-3"
          />
          <FieldDescription className="tabular-nums">{summary}</FieldDescription>
        </Field>

        {error && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Could not build the report</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleGenerate} disabled={!complete || isLoading}>
            {isLoading ? <Spinner data-icon="inline-start" /> : <FileChartColumnIcon data-icon="inline-start" />}
            Generate report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
