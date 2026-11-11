import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <CardHeader>
      <p className="text-xs font-semibold tracking-[0.14em] text-gold-ink uppercase">{eyebrow}</p>
      <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}
