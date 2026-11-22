import { Badge } from "@/components/ui/badge";

/**
 * Provenance badge. Every component that renders market or performance data must render one, so a
 * figure can never be mistaken for live data when it is delayed, historical or a development fixture.
 */
export type DataMode = "live" | "delayed" | "historical" | "fixture" | "none";

const MODES: Record<DataMode, { label: string; tone: "positive" | "warning" | "info" | "fixture" | "neutral"; title: string }> = {
  live: { label: "Live", tone: "positive", title: "Real-time data from the provider" },
  delayed: { label: "Delayed", tone: "warning", title: "Delayed data — not real-time" },
  historical: { label: "Historical", tone: "info", title: "Historical data" },
  fixture: {
    label: "Fixture",
    tone: "fixture",
    title: "Development fixture — not market data. Never use for research conclusions.",
  },
  none: { label: "No data", tone: "neutral", title: "No data source is connected" },
};

export function DataModeBadge({ mode, className }: { mode: DataMode; className?: string }) {
  const m = MODES[mode];
  return (
    <Badge tone={m.tone} title={m.title} className={className} data-mode={mode}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {m.label}
    </Badge>
  );
}
