"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, CircleX, Construction } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DataModeBadge } from "@/components/shared/data-mode-badge";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/primitives";
import { usePreferences, useSession } from "@/hooks/use-session";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { integrationsApi, queryKeys, systemApi } from "@/services/api/endpoints";

/** A dashboard panel whose data pipeline does not exist yet. Shows nothing that looks like data. */
function PendingPanel({ title, phase, children, className }: { title: string; phase: number; children: ReactNode; className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader title={title} actions={<DataModeBadge mode="none" />} />
      <PanelBody className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <Construction className="size-4 text-subtle-foreground" aria-hidden />
        <p className="max-w-xs text-xs text-muted-foreground">{children}</p>
        <Badge tone="neutral">Phase {phase}</Badge>
      </PanelBody>
    </Panel>
  );
}

function Kpi({ label, value, caption }: { label: string; value: ReactNode; caption: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-surface px-3 py-2.5">
      <span className="text-2xs font-semibold tracking-wider text-subtle-foreground uppercase">{label}</span>
      <span className="figures truncate text-lg font-medium">{value}</span>
      <span className="truncate text-xs text-subtle-foreground">{caption}</span>
    </div>
  );
}

function Check({ state, children }: { state: "ok" | "pending" | "fail"; children: ReactNode }) {
  const Icon = state === "ok" ? CheckCircle2 : state === "fail" ? CircleX : CircleDashed;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          state === "ok" && "text-positive",
          state === "fail" && "text-negative",
          state === "pending" && "text-subtle-foreground",
        )}
      />
      <span className={cn(state === "pending" && "text-muted-foreground")}>{children}</span>
    </li>
  );
}

function PlatformReadiness() {
  const readiness = useQuery({ queryKey: queryKeys.readiness, queryFn: systemApi.readiness, retry: false });
  const providers = useQuery({ queryKey: queryKeys.providers, queryFn: integrationsApi.providers });

  const keys = providers.data?.filter((p) => p.active_credentials > 0).length ?? 0;
  const adapters = providers.data?.filter((p) => p.adapter_status === "available").length ?? 0;
  const total = providers.data?.length ?? 0;

  return (
    <Panel className="lg:col-span-4">
      <PanelHeader title="Platform readiness" description="Live status of what the terminal can do today." />
      <PanelBody>
        {readiness.isPending || providers.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        ) : (
          <ul className="space-y-2">
            <Check state={readiness.data?.database.status === "ok" ? "ok" : "fail"}>Database (TimescaleDB) reachable</Check>
            <Check state={readiness.data?.redis.status === "ok" ? "ok" : "fail"}>Redis reachable</Check>
            <Check state={keys > 0 ? "ok" : "pending"}>
              Provider keys stored: <span className="figures">{keys}</span> of <span className="figures">{total}</span>{" "}
              <Link href="/settings?tab=integrations" className="text-accent hover:underline">
                manage
              </Link>
            </Check>
            <Check state={adapters > 0 ? "ok" : "pending"}>
              Market data adapters live: <span className="figures">{adapters}</span> of{" "}
              <span className="figures">{total}</span> (Phase 2)
            </Check>
            <Check state="pending">Quant engine and backtesting (Phase 3)</Check>
            <Check state="pending">AI research agents (Phase 4)</Check>
            <Check state="pending">Paper trading with risk veto (Phase 5)</Check>
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

export function DashboardView() {
  const { data: user } = useSession();
  const prefs = usePreferences();

  const capital = prefs.data
    ? formatMoney(prefs.data.default_paper_capital, prefs.data.base_currency, prefs.data.number_locale)
    : null;

  return (
    <PageContainer>
      <PageHeader
        title={`Overview${user ? ` · ${user.display_name}` : ""}`}
        description="Research and paper-trading summary. Panels stay empty until their data pipelines exist — nothing here is sample data."
        meta={<Badge tone="warning">Partial · data arrives from Phase 2</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Virtual capital"
          value={<span className="text-muted-foreground">—</span>}
          caption={capital ? `No portfolio yet · default ${capital}` : "No portfolio yet"}
        />
        <Kpi label="Daily P&L" value={<span className="text-muted-foreground">—</span>} caption="No paper trades (Phase 5)" />
        <Kpi label="Weekly P&L" value={<span className="text-muted-foreground">—</span>} caption="No paper trades (Phase 5)" />
        <Kpi label="Monthly P&L" value={<span className="text-muted-foreground">—</span>} caption="No paper trades (Phase 5)" />
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <PendingPanel title="Portfolio equity curve" phase={5} className="lg:col-span-8">
          The equity curve and drawdown appear once a paper portfolio has recorded fills.
        </PendingPanel>
        <PlatformReadiness />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <PendingPanel title="Global indices" phase={2}>
          Requires a connected market data provider with index coverage.
        </PendingPanel>
        <PendingPanel title="Top AI research candidates" phase={4}>
          Supervisor-approved candidates with evidence. “No trade” is a valid outcome.
        </PendingPanel>
        <PendingPanel title="Strategy leaderboard" phase={3}>
          Validated strategy versions ranked on out-of-sample, cost-adjusted metrics.
        </PendingPanel>
        <PendingPanel title="Current risk exposure" phase={5}>
          Gross and net exposure, concentration and correlated positions.
        </PendingPanel>
        <PendingPanel title="Market sentiment" phase={4}>
          Aggregated from classified news with the model version stated.
        </PendingPanel>
        <PendingPanel title="News feed & AI daily briefing" phase={4}>
          Deduplicated news with source links, and the supervisor-validated daily briefing.
        </PendingPanel>
      </div>
    </PageContainer>
  );
}
