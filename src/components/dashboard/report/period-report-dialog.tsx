"use client";

import { useEffect, useState } from "react";
import { PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { CateringEda, ChannelRoiRow, DateKey } from "@/lib/leads/types";

import { PeriodReport } from "./period-report";

interface PeriodReportDialogProps {
  eda: CateringEda;
  roi: ChannelRoiRow[];
  spendAdjusted: boolean;
  today: DateKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PeriodReportDialog({ eda, roi, spendAdjusted, today, open, onOpenChange }: PeriodReportDialogProps) {
  const [includeAppendix, setIncludeAppendix] = useState(false);

  useEffect(() => {
    if (!open) setIncludeAppendix(false);
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("print");
    const popup = () => document.querySelector<HTMLElement>("[data-report]");
    const placeForPrint = () => {
      const el = popup();
      if (!el) return;
      el.style.setProperty("translate", "none");
      window.dispatchEvent(new Event("resize"));
    };
    const restore = () => popup()?.style.removeProperty("translate");
    const onMedia = () => {
      if (media.matches) placeForPrint();
      else restore();
    };

    onMedia();
    media.addEventListener("change", onMedia);
    window.addEventListener("beforeprint", placeForPrint);
    window.addEventListener("afterprint", restore);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("beforeprint", placeForPrint);
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-report=""
        className="flex h-[min(92vh,56rem)] max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <div data-report-toolbar="" className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3 pr-12">
          <Field orientation="horizontal" className="min-w-0 flex-1">
            <Switch
              id="report-appendix"
              size="sm"
              checked={includeAppendix}
              onCheckedChange={setIncludeAppendix}
            />
            <FieldLabel htmlFor="report-appendix" className="font-normal whitespace-normal">
              Include Appendix: Quality Leads Roster (Pending vs. Sent) & Lost Client Call Log
            </FieldLabel>
          </Field>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" onClick={() => window.print()}>
              <PrinterIcon data-icon="inline-start" />
              Export PDF
            </Button>
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          </div>
        </div>

        <div data-report-scroll="" className="min-h-0 flex-1 overflow-y-auto">
          <div data-report-body="" className="bg-background px-4 py-8 sm:px-10">
            <PeriodReport
              eda={eda}
              roi={roi}
              spendAdjusted={spendAdjusted}
              today={today}
              includeAppendix={includeAppendix}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
