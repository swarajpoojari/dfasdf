import { CircleDashed, Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { moduleById } from "@/lib/navigation";

import { DataModeBadge } from "./data-mode-badge";
import { EmptyState, PageContainer, PageHeader } from "./page";
import { ProviderReadiness } from "./provider-readiness";

/**
 * Page for a module whose functionality has not been built yet. It states the scope and the phase that
 * delivers it, and shows the live state of its data sources — but never placeholder figures, sample
 * tables or "demo" charts that could be mistaken for data.
 */
export function ModulePage({ id }: { id: string }) {
  const mod = moduleById(id);

  return (
    <PageContainer>
      <PageHeader
        title={mod.title}
        description={mod.description}
        meta={
          <>
            <Badge tone="warning">
              <Construction aria-hidden /> Not yet implemented · Phase {mod.phase}
            </Badge>
            <DataModeBadge mode="none" />
          </>
        }
      />

      <div className="grid items-start gap-3 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader title="Planned capabilities" description={`Delivered in Phase ${mod.phase}. See the development roadmap.`} />
          <PanelBody>
            <ul className="space-y-2">
              {mod.capabilities.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>

        <div className="flex flex-col gap-3 lg:col-span-2">
          {mod.providers?.length ? <ProviderReadiness providerIds={mod.providers} /> : null}
          <EmptyState title="No data is shown here yet">
            This module displays nothing until its pipeline exists and is tested. AetherTrade does not render sample
            or placeholder figures.
          </EmptyState>
        </div>
      </div>
    </PageContainer>
  );
}
