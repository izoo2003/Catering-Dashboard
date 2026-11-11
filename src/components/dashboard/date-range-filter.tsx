"use client";

import { useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatRangeLabel } from "@/lib/format";
import { daysInclusive, fromDateKey, toDateKey } from "@/lib/leads/dates";
import { DATE_PRESETS, rangeForPreset, type DatePreset } from "@/lib/leads/presets";
import type { DateKey } from "@/lib/leads/types";

/** A range mid-selection may have only a start date. */
export interface DraftRange {
  from?: DateKey;
  to?: DateKey;
}

interface DateRangeFilterProps {
  range: DraftRange;
  preset: DatePreset;
  today: DateKey;
  onChange: (range: DraftRange, preset: DatePreset) => void;
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

export function DateRangeFilter({ range, preset, today, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>();
  const todayDate = fromDateKey(today);

  const selected: DayPickerRange | undefined = range.from
    ? { from: fromDateKey(range.from), to: range.to ? fromDateKey(range.to) : undefined }
    : undefined;
  const rangeLabel = range.from ? formatRangeLabel(range.from, range.to) : "Pick a date range";
  const presetLabel = DATE_PRESETS.find((p) => p.value === preset)?.label;

  function handlePreset(values: string[]) {
    const next = DATE_PRESETS.find((p) => p.value === values[0])?.value;
    if (!next) return;
    if (next === "custom") {
      onChange(range, "custom");
      return;
    }
    const nextRange = rangeForPreset(next, today);
    onChange(nextRange, next);
    setMonth(leftMonthFor(nextRange.from, today));
  }

  function handleSelect(next: DayPickerRange | undefined) {
    onChange(
      { from: next?.from ? toDateKey(next.from) : undefined, to: next?.to ? toDateKey(next.to) : undefined },
      "custom",
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="lg" className="justify-start" />}
        aria-label={`Date range: ${presetLabel}, ${rangeLabel}`}
      >
        <CalendarIcon data-icon="inline-start" />
        <span className="hidden text-muted-foreground sm:inline">{presetLabel}</span>
        <span className="tabular-nums">{rangeLabel}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <div className="p-3">
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
        </div>
        <Separator />
        <Calendar
          mode="range"
          resetOnSelect
          numberOfMonths={2}
          selected={selected}
          onSelect={handleSelect}
          month={month ?? leftMonthFor(range.from, today)}
          onMonthChange={setMonth}
          endMonth={todayDate}
          disabled={{ after: todayDate }}
          className="p-3"
        />
        <Separator />
        <div className="flex items-center justify-between gap-3 p-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {range.from && range.to
              ? `${daysInclusive(range.from, range.to)} days selected`
              : "Select an end date"}
          </span>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
