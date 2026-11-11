"use client";

import { SearchIcon } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ChannelFilter, RosterFilters } from "@/lib/leads/roster";

const CHANNEL_OPTIONS: { value: ChannelFilter; label: string }[] = [
  { value: "all", label: "All channels" },
  { value: "WhatsApp/Ads", label: "WhatsApp / Ads" },
  { value: "Website", label: "Website" },
];

interface RosterToolbarProps {
  filters: RosterFilters;
  onChange: (filters: RosterFilters) => void;
  placeholder?: string;
}

export function RosterToolbar({
  filters,
  onChange,
  placeholder = "Search name, phone, or notes",
}: RosterToolbarProps) {
  function handleChannel(values: string[]) {
    const channel = CHANNEL_OPTIONS.find((option) => option.value === values[0])?.value;
    if (channel) onChange({ ...filters, channel });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <InputGroup className="min-w-56 flex-1 sm:max-w-xs">
        <InputGroupInput
          type="search"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder={placeholder}
          aria-label="Search clients"
        />
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
      </InputGroup>

      <ToggleGroup
        variant="outline"
        size="sm"
        value={[filters.channel]}
        onValueChange={handleChannel}
        aria-label="Filter by channel"
      >
        {CHANNEL_OPTIONS.map(({ value, label }) => (
          <ToggleGroupItem key={value} value={value}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
