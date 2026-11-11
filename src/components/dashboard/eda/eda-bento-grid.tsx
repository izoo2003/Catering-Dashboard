import { ChartColumnIcon } from "lucide-react";

import { BlurFade } from "@/components/ui/blur-fade";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { CateringEda, ChannelRoiRow } from "@/lib/leads/types";

import type { QualityTab } from "../drill-down/quality-leads-panel";
import { ChannelRoiCard } from "./channel-roi-card";
import { ConversionLoopCard } from "./conversion-loop-card";
import { FunnelCard } from "./funnel-card";
import { LeadQualityCard } from "./lead-quality-card";
import { LostReasonsCard } from "./lost-reasons-card";

const STAGGER = 0.06;

interface EdaBentoGridProps {
  eda: CateringEda | null;
  roi: ChannelRoiRow[] | null;
  spendAdjusted: boolean;
  onOpenQuality: (tab: QualityTab) => void;
  onOpenLost: () => void;
}

export function EdaBentoGrid({ eda, roi, spendAdjusted, onOpenQuality, onOpenLost }: EdaBentoGridProps) {
  if (!eda || !roi) {
    return (
      <div aria-label="Graphical analysis" aria-busy className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
      </div>
    );
  }

  if (eda.funnel.totalLeads.total === 0) {
    return (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartColumnIcon />
          </EmptyMedia>
          <EmptyTitle>No inquiries yet</EmptyTitle>
          <EmptyDescription>Leads from the sheet will show here once an inquiry date is recorded.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const sections = [
    {
      key: "funnel",
      className: "h-full lg:col-span-2",
      card: <FunnelCard funnel={eda.funnel} onOpenQuality={onOpenQuality} />,
    },
    {
      key: "quality",
      className: "h-full",
      card: <LeadQualityCard leadQuality={eda.leadQuality} />,
    },
    {
      key: "loop",
      className: "h-full",
      card: <ConversionLoopCard funnel={eda.funnel} conversionLoop={eda.conversionLoop} />,
    },
    {
      key: "lost",
      className: "h-full lg:col-span-2",
      card: <LostReasonsCard lostRoster={eda.lostRoster} onOpenLost={onOpenLost} />,
    },
    {
      key: "roi",
      className: "h-full lg:col-span-2",
      card: <ChannelRoiCard roi={roi} spendAdjusted={spendAdjusted} />,
    },
  ];

  return (
    <BentoGrid aria-label="Graphical analysis" className="grid-cols-1 lg:grid-cols-2" style={{ gridAutoRows: "auto" }}>
      {sections.map((section, index) => (
        <BlurFade key={section.key} delay={index * STAGGER} className={section.className}>
          {section.card}
        </BlurFade>
      ))}
    </BentoGrid>
  );
}
