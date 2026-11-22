"use client";

import { useQuery } from "@tanstack/react-query";

import { useNow } from "@/hooks/use-now";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { queryKeys, systemApi } from "@/services/api/endpoints";

const CLOCKS = [
  { label: "IST", timeZone: "Asia/Kolkata" },
  { label: "UTC", timeZone: "UTC" },
  { label: "NY", timeZone: "America/New_York" },
] as const;

function Dot({ tone }: { tone: "ok" | "warn" | "down" | "idle" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full",
        tone === "ok" && "bg-positive",
        tone === "warn" && "bg-warning",
        tone === "down" && "bg-negative",
        tone === "idle" && "bg-subtle-foreground",
      )}
    />
  );
}

export function StatusBar() {
  const now = useNow(1000);
  const readiness = useQuery({
    queryKey: queryKeys.readiness,
    queryFn: systemApi.readiness,
    refetchInterval: 30_000,
    retry: false,
  });

  const api: { tone: "ok" | "warn" | "down" | "idle"; label: string } = readiness.isPending
    ? { tone: "idle", label: "API: checking" }
    : readiness.isError
      ? { tone: "down", label: "API: unreachable" }
      : readiness.data.status === "ok"
        ? { tone: "ok", label: "API: ready" }
        : {
            tone: "warn",
            label: `API: degraded (${[
              readiness.data.database.status !== "ok" && "database",
              readiness.data.redis.status !== "ok" && "redis",
            ]
              .filter(Boolean)
              .join(", ")})`,
          };

  return (
    <footer
      className="flex h-7 shrink-0 items-center gap-4 overflow-x-auto border-t bg-surface px-3 text-2xs whitespace-nowrap text-muted-foreground scrollbar-thin"
      aria-label="System status"
    >
      <span className="flex items-center gap-1.5" role="status">
        <Dot tone={api.tone} />
        {api.label}
      </span>
      <span className="flex items-center gap-1.5">
        <Dot tone="idle" />
        Market data: no provider connected
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <Dot tone="ok" />
        Execution: paper only
      </span>
      <span className="ml-auto flex items-center gap-3">
        {CLOCKS.map((c) => (
          <span key={c.label} className="figures">
            <span className="text-subtle-foreground">{c.label} </span>
            {now ? formatClock(now, c.timeZone) : "--:--:--"}
          </span>
        ))}
      </span>
    </footer>
  );
}
