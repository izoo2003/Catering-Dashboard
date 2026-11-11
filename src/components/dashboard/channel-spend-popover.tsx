"use client";

import { RotateCcwIcon, WalletIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NO_SPEND_OVERRIDE, type SpendOverride } from "@/hooks/use-spend-overrides";
import { formatNumber, formatPKR } from "@/lib/format";

interface ChannelSpendPopoverProps {
  value: SpendOverride;
  /** Spend sheet figures for every inquiry, once they are loaded. */
  sheetSpend: { whatsappAds: number; website: number } | null;
  onChange: (value: SpendOverride) => void;
  disabled?: boolean;
}

const CHANNELS = [
  { key: "whatsappAds", id: "spend-whatsapp-ads", label: "WhatsApp / Social Ads" },
  { key: "website", id: "spend-website", label: "Website" },
] as const;

function parseAmount(raw: string): number | null {
  if (raw.trim() === "") return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
}

export function ChannelSpendPopover({ value, sheetSpend, onChange, disabled }: ChannelSpendPopoverProps) {
  const adjusted = value.whatsappAds !== null || value.website !== null;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="lg" disabled={disabled} />}>
        <WalletIcon data-icon="inline-start" />
        Channel Spend
        {adjusted && <Badge variant="secondary">Adjusted</Badge>}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 gap-4 p-4">
        <PopoverHeader>
          <PopoverTitle className="font-heading text-base">Channel spend</PopoverTitle>
          <PopoverDescription>
            Amounts in PKR for every inquiry on the dashboard. Leave a field blank to use the Spend sheet.
          </PopoverDescription>
        </PopoverHeader>

        <FieldGroup className="gap-4">
          {CHANNELS.map(({ key, id, label }) => (
            <Field key={key}>
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>PKR</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  className="tabular-nums"
                  value={value[key] ?? ""}
                  placeholder={sheetSpend ? formatNumber(sheetSpend[key]) : "Spend sheet value"}
                  onChange={(event) => onChange({ ...value, [key]: parseAmount(event.target.value) })}
                />
              </InputGroup>
              <FieldDescription className="tabular-nums">
                {sheetSpend
                  ? `Spend sheet: ${formatPKR(sheetSpend[key])}`
                  : "The sheet figure shows once inquiries have loaded."}
              </FieldDescription>
            </Field>
          ))}
        </FieldGroup>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={!adjusted}
          onClick={() => onChange(NO_SPEND_OVERRIDE)}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset to sheet values
        </Button>
      </PopoverContent>
    </Popover>
  );
}
