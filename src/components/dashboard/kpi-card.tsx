"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

export type KpiTone = "default" | "wasted" | "won" | "gold";

const TONES: Record<KpiTone, { value: string; icon: string; glowTo: string; beam: string }> = {
  default: { value: "text-primary", icon: "bg-secondary text-primary", glowTo: "#1C352D", beam: "#1C352D" },
  wasted: { value: "text-lost", icon: "bg-lost-soft text-lost", glowTo: "#9E3B33", beam: "#9E3B33" },
  won: { value: "text-won", icon: "bg-won-soft text-won", glowTo: "#2E6F40", beam: "#2E6F40" },
  gold: { value: "text-primary", icon: "bg-gold-soft text-gold-ink", glowTo: "#C5A059", beam: "#1C352D" },
};

interface KpiCardProps {
  title: string;
  icon: LucideIcon;
  value: number;
  prefix?: string;
  tone?: KpiTone;
  /** Shown beside the value, e.g. a share-of-total badge. */
  badge?: ReactNode;
  children?: ReactNode;
  /** Makes the whole card a button that opens a drill-down. */
  action?: { hint: string; label: string; active: boolean; onClick: () => void };
  className?: string;
}

export function KpiCard({
  title,
  icon: Icon,
  value,
  prefix,
  tone = "default",
  badge,
  children,
  action,
  className,
}: KpiCardProps) {
  const colors = TONES[tone];

  return (
    <div
      data-active={action?.active || undefined}
      className={cn(
        "relative h-full rounded-xl transition-shadow",
        action &&
          "hover:shadow-md has-[button:focus-visible]:ring-3 has-[button:focus-visible]:ring-ring/60 data-active:ring-2 data-active:ring-gold",
        className,
      )}
    >
      <MagicCard
        className="h-full rounded-xl"
        gradientSize={220}
        gradientFrom="#C5A059"
        gradientTo={colors.glowTo}
        gradientColor="#F4ECDC"
        gradientOpacity={0.55}
      >
        <Card className="h-full bg-transparent ring-0">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
              <span className={cn("flex size-7 items-center justify-center rounded-md", colors.icon)}>
                <Icon aria-hidden />
              </span>
              {title}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <CardTitle
                className={cn("flex items-baseline gap-1.5 font-sans text-3xl font-semibold tabular-nums", colors.value)}
              >
                {prefix && <span className="text-sm font-medium text-muted-foreground">{prefix}</span>}
                <NumberTicker value={value} className="tracking-tight text-current" />
              </CardTitle>
              {badge}
            </div>
            {children}
          </CardContent>

          {action && (
            <CardFooter className="bg-transparent py-3">
              <button
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                aria-pressed={action.active}
                className="rounded-md outline-none after:absolute after:inset-0 after:rounded-xl"
              >
                <Badge variant="outline" className="text-primary">
                  {action.hint}
                </Badge>
              </button>
            </CardFooter>
          )}
        </Card>
      </MagicCard>

      {action && (
        <BorderBeam
          size={70}
          duration={8}
          colorFrom="#C5A059"
          colorTo={colors.beam}
          borderWidth={1.5}
          className="motion-reduce:hidden"
        />
      )}
    </div>
  );
}
