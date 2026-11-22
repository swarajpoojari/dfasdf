"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { QueryError } from "@/components/shared/query-error";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/primitives";
import { queryKeys, systemApi } from "@/services/api/endpoints";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}

function Status({ ok }: { ok: boolean }) {
  return <Badge tone={ok ? "positive" : "negative"}>{ok ? "OK" : "Unavailable"}</Badge>;
}

export function SystemPanel() {
  const info = useQuery({ queryKey: queryKeys.systemInfo, queryFn: systemApi.info });
  const readiness = useQuery({ queryKey: queryKeys.readiness, queryFn: systemApi.readiness, retry: false });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel>
        <PanelHeader title="Platform" />
        <PanelBody>
          {info.isPending ? (
            <Skeleton className="h-24" />
          ) : info.isError ? (
            <QueryError error={info.error} what="system information" />
          ) : (
            <dl className="divide-y">
              <Row label="Version">
                <span className="figures">{info.data.version}</span>
              </Row>
              <Row label="Environment">{info.data.environment}</Row>
              <Row label="Execution mode">
                <Badge tone="accent">Research &amp; paper only</Badge>
              </Row>
              <Row label="Live trading">
                <Badge tone="neutral">Not available</Badge>
              </Row>
              <Row label="Development fixtures">
                {info.data.fixture_data_allowed ? <Badge tone="fixture">Allowed</Badge> : <Badge tone="neutral">Disabled</Badge>}
              </Row>
            </dl>
          )}
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Dependencies" description="Readiness checks, refreshed every 30 seconds." />
        <PanelBody>
          {readiness.isPending ? (
            <Skeleton className="h-16" />
          ) : readiness.isError ? (
            <QueryError error={readiness.error} what="readiness" />
          ) : (
            <dl className="divide-y">
              <Row label="PostgreSQL + TimescaleDB">
                <Status ok={readiness.data.database.status === "ok"} />
              </Row>
              <Row label="Redis">
                <Status ok={readiness.data.redis.status === "ok"} />
              </Row>
            </dl>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
