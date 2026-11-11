import { daysInclusive } from "./dates";
import { percentage } from "./eda";
import type { CateringLead, DateKey, FollowUpStatus, LeadChannel, LostLeadsRoster } from "./types";

export type ChannelFilter = "all" | LeadChannel;

export interface RosterFilters {
  query: string;
  channel: ChannelFilter;
}

export const EMPTY_FILTERS: RosterFilters = { query: "", channel: "all" };

export const isFiltered = ({ query, channel }: RosterFilters) => query.trim() !== "" || channel !== "all";

/** Drops the `0` or `92` prefix so `0300…` and `+92 300…` compare equal. */
const digits = (value: string) => value.replace(/\D/g, "").replace(/^(92|0)/, "");

/** Matches the query against client name, phone (digits only), and call notes. */
export function filterRoster(leads: readonly CateringLead[], { query, channel }: RosterFilters): CateringLead[] {
  const needle = query.trim().toLowerCase();
  const needleDigits = digits(needle);
  return leads.filter((lead) => {
    if (channel !== "all" && lead.channel !== channel) return false;
    if (!needle) return true;
    if (lead.clientName.toLowerCase().includes(needle)) return true;
    if (needleDigits && digits(lead.phone).includes(needleDigits)) return true;
    return [lead.notes, lead.lostReasonDetail].some((text) => text?.toLowerCase().includes(needle));
  });
}

export function followUpStatus(lead: CateringLead): FollowUpStatus {
  if (lead.finalOutcome === "Won") return "Won";
  if (lead.finalOutcome === "Lost") return "Lost";
  return "Awaiting Reply";
}

/** Days from `today` until the event; negative once the event has passed, `null` without an event date. */
export function daysUntilEvent(lead: CateringLead, today: DateKey): number | null {
  return lead.eventDate ? daysInclusive(today, lead.eventDate) - 1 : null;
}

export interface LossSide {
  count: number;
  /** Share of all lost leads, 0–100; `null` when nothing was lost. */
  sharePct: number | null;
  quotedPKR: number;
}

export interface LossSummary {
  total: number;
  callCenter: LossSide;
  management: LossSide;
  callCenterExceeds: boolean;
  /** Call center losses minus management losses; negative when management is higher. */
  gap: number;
}

function side(leads: readonly CateringLead[], total: number): LossSide {
  return {
    count: leads.length,
    sharePct: percentage(leads.length, total),
    quotedPKR: leads.reduce((sum, lead) => sum + (lead.quotedAmountPKR ?? 0), 0),
  };
}

export function lossSummary({ callCenterFollowUp, managementSide }: LostLeadsRoster): LossSummary {
  const total = callCenterFollowUp.length + managementSide.length;
  const gap = callCenterFollowUp.length - managementSide.length;
  return {
    total,
    callCenter: side(callCenterFollowUp, total),
    management: side(managementSide, total),
    callCenterExceeds: gap > 0,
    gap,
  };
}
