"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, KeyRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/primitives";
import { integrationsApi, queryKeys } from "@/services/api/endpoints";

import { QueryError } from "./query-error";

/**
 * Live readiness of the data providers a module depends on, from the provider catalog API: whether a
 * credential is stored and whether the adapter exists. No adapter ships before Phase 2, and this panel
 * says so rather than implying a connection.
 */
export function ProviderReadiness({ providerIds }: { providerIds: string[] }) {
  const providers = useQuery({ queryKey: queryKeys.providers, queryFn: integrationsApi.providers });
  const rows = providers.data?.filter((p) => providerIds.includes(p.id)) ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Data sources"
        description="Candidate providers for this module and their current state."
        actions={
          <Link href="/settings?tab=integrations" className="flex items-center gap-1 text-xs text-accent hover:underline">
            <KeyRound className="size-3.5" aria-hidden /> Manage keys
          </Link>
        }
      />
      <PanelBody className="p-0">
        {providers.isPending ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        ) : providers.isError ? (
          <div className="p-3">
            <QueryError error={providers.error} what="providers" />
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="min-w-0 flex-1 text-sm">
                  {p.name}
                  <span className="block truncate text-xs text-subtle-foreground">{p.intended_use.join(" · ")}</span>
                </span>
                <Badge tone={p.active_credentials > 0 ? "positive" : "neutral"}>
                  {p.active_credentials > 0 ? "Key stored" : "No key"}
                </Badge>
                <Badge tone={p.adapter_status === "available" ? "positive" : "warning"}>
                  {p.adapter_status === "available" ? "Adapter ready" : "Adapter: Phase 2"}
                </Badge>
                <a
                  href={p.docs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-subtle-foreground hover:text-foreground"
                  aria-label={`${p.name} documentation`}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
