import { GlobeIcon, MessageCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import type { FollowUpStatus, InitialStatus, LeadChannel, LostCategory } from "@/lib/leads/types";

const URGENT_WITHIN_DAYS = 14;

/** Live count shown inside a `TabsTrigger`. */
export function TabCount({ value }: { value: number }) {
  return (
    <Badge variant="secondary" className="tabular-nums">
      {formatNumber(value)}
    </Badge>
  );
}

export function ChannelBadge({ channel }: { channel: LeadChannel }) {
  const Icon = channel === "Website" ? GlobeIcon : MessageCircleIcon;
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" aria-hidden />
      {channel === "Website" ? "Website" : "WhatsApp / Ads"}
    </Badge>
  );
}

const FOLLOW_UP_TONE: Record<FollowUpStatus, string> = {
  "Awaiting Reply": "bg-gold-soft text-gold-ink",
  Won: "bg-won-soft text-won",
  Lost: "bg-lost-soft text-lost",
};

export function FollowUpBadge({ status }: { status: FollowUpStatus }) {
  return <Badge className={FOLLOW_UP_TONE[status]}>{status}</Badge>;
}

export function LossCategoryBadge({ category }: { category: LostCategory | null }) {
  return category === "Management Side" ? (
    <Badge className="bg-gold-soft text-gold-ink">Management Side</Badge>
  ) : (
    <Badge className="bg-lost-soft text-lost">Call Center / Follow-up</Badge>
  );
}

export function WastedReasonBadge({ status }: { status: InitialStatus }) {
  return status === "Not Interested" ? (
    <Badge variant="destructive">Not interested</Badge>
  ) : (
    <Badge variant="secondary">No answer</Badge>
  );
}

/** `daysToEvent` is `null` when the client has not given an event date. */
export function QuoteStatusBadge({ daysToEvent }: { daysToEvent: number | null }) {
  if (daysToEvent !== null && daysToEvent < 0) {
    return <Badge className="bg-lost-soft text-lost">Event date passed</Badge>;
  }
  if (daysToEvent !== null && daysToEvent <= URGENT_WITHIN_DAYS) {
    const when = daysToEvent === 0 ? "today" : `in ${daysToEvent} day${daysToEvent === 1 ? "" : "s"}`;
    return <Badge className="bg-lost-soft text-lost">Urgent · event {when}</Badge>;
  }
  return <Badge className="bg-gold-soft text-gold-ink">Needs quotation</Badge>;
}
