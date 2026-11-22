"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageContainer, PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";

import { CredentialsManager } from "./credentials-manager";
import { PreferencesForm } from "./preferences-form";
import { SecurityPanel } from "./security-panel";
import { SystemPanel } from "./system-panel";

const TABS = ["preferences", "integrations", "security", "system"] as const;
type Tab = (typeof TABS)[number];

export function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "preferences";

  return (
    <PageContainer>
      <PageHeader
        title="Settings & API Integrations"
        description="Preferences, encrypted provider keys, account security and system status."
        meta={<Badge tone="warning">Partial · provider connectivity tests arrive in Phase 2</Badge>}
      />
      <Tabs value={tab} onValueChange={(value) => router.replace(`${pathname}?tab=${value}`, { scroll: false })}>
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="integrations">API integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences" className="pt-3">
          <PreferencesForm />
        </TabsContent>
        <TabsContent value="integrations" className="pt-3">
          <CredentialsManager />
        </TabsContent>
        <TabsContent value="security" className="pt-3">
          <SecurityPanel />
        </TabsContent>
        <TabsContent value="system" className="pt-3">
          <SystemPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
