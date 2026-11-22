"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Lock, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { EmptyState } from "@/components/shared/page";
import { QueryError } from "@/components/shared/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Dialog, DialogContent, DialogDescription, DialogTitle, Skeleton } from "@/components/ui/primitives";
import { useHasPermission } from "@/hooks/use-session";
import { ApiError } from "@/services/api/client";
import { integrationsApi, queryKeys } from "@/services/api/endpoints";
import type { Credential, Provider } from "@/services/api/schemas";

const ACRONYMS: Record<string, string> = { api: "API", uri: "URI", url: "URL", id: "ID" };

export function humanize(field: string): string {
  const words = field.split("_").map((w) => ACRONYMS[w] ?? w);
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function SecretInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        className="figures pr-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide value" : "Show value"}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}

function AddCredentialDialog({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("primary");
  const [secrets, setSecrets] = useState<Record<string, string>>(
    Object.fromEntries(provider.secret_fields.map((f) => [f, ""])),
  );
  const [config, setConfig] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: integrationsApi.createCredential,
    onSuccess: () => {
      setSecrets({}); // drop secret values from memory as soon as they are stored
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
  });

  const missing = provider.secret_fields.some((f) => !secrets[f]?.trim());
  const errors = create.error instanceof ApiError ? create.error.fieldErrors() : {};

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanConfig = Object.fromEntries(Object.entries(config).filter(([, v]) => v.trim()));
    create.mutate({ provider: provider.id, label, secrets, config: cleanConfig });
  }

  return (
    <DialogContent aria-describedby="add-credential-description">
      <form onSubmit={submit}>
        <div className="border-b px-4 py-3">
          <DialogTitle className="text-sm font-semibold">Add {provider.name} key</DialogTitle>
          <DialogDescription id="add-credential-description" className="mt-1 text-xs text-muted-foreground">
            Encrypted before it is stored. It will never be shown again — only its last four characters.
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <Field label="Label" htmlFor="credential-label" hint="Lowercase letters, digits, - and _." error={errors.label}>
            <Input id="credential-label" value={label} onChange={(e) => setLabel(e.target.value.toLowerCase())} />
          </Field>
          {provider.secret_fields.map((field) => (
            <Field key={field} label={humanize(field)} htmlFor={`secret-${field}`}>
              <SecretInput
                id={`secret-${field}`}
                value={secrets[field] ?? ""}
                onChange={(v) => setSecrets((s) => ({ ...s, [field]: v }))}
              />
            </Field>
          ))}
          {provider.config_fields.map((field) => (
            <Field key={field} label={`${humanize(field)} (optional, not secret)`} htmlFor={`config-${field}`}>
              <Input
                id={`config-${field}`}
                value={config[field] ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, [field]: e.target.value }))}
              />
            </Field>
          ))}
          {create.isError ? <QueryError error={create.error} what="the credential" /> : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending || missing || !label}>
            <Lock aria-hidden /> {create.isPending ? "Encrypting…" : "Encrypt & save"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function CredentialRow({ credential, provider }: { credential: Credential; provider?: Provider }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const revoke = useMutation({
    mutationFn: () => integrationsApi.revokeCredential(credential.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <KeyRound className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 text-sm">
        {provider?.name ?? credential.provider} <span className="text-subtle-foreground">/ {credential.label}</span>
        <span className="figures block text-xs text-subtle-foreground">
          {credential.secret_fields.join(", ")}
          {credential.secret_hint ? ` · ••••${credential.secret_hint}` : ""}
        </span>
      </span>
      {confirming ? (
        <span className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Revoke permanently?</span>
          <Button size="sm" variant="danger" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
            Revoke
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </span>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Revoke ${credential.provider} ${credential.label}`}>
          <Trash2 aria-hidden /> Revoke
        </Button>
      )}
      {revoke.isError ? <QueryError error={revoke.error} what="the revocation" /> : null}
    </li>
  );
}

export function CredentialsManager() {
  const canManage = useHasPermission("credentials:manage");
  const providers = useQuery({ queryKey: queryKeys.providers, queryFn: integrationsApi.providers });
  const credentials = useQuery({
    queryKey: queryKeys.credentials,
    queryFn: integrationsApi.credentials,
    enabled: canManage,
  });
  const [adding, setAdding] = useState<Provider | null>(null);
  const byId = new Map(providers.data?.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <PanelHeader
          title="Stored keys"
          description="Encrypted at rest with keys held outside the database. Values are never displayed after saving."
        />
        <PanelBody className="p-0">
          {!canManage ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Only the owner can view or manage API keys.</p>
          ) : credentials.isPending ? (
            <div className="p-3">
              <Skeleton className="h-8" />
            </div>
          ) : credentials.isError ? (
            <div className="p-3">
              <QueryError error={credentials.error} what="stored keys" />
            </div>
          ) : credentials.data.length === 0 ? (
            <div className="p-3">
              <EmptyState icon={<KeyRound />} title="No API keys stored">
                Add a provider key below. Adapters that use these keys arrive in Phase 2.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y" aria-label="Stored keys">
              {credentials.data.map((c) => (
                <CredentialRow key={c.id} credential={c} provider={byId.get(c.provider)} />
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Providers"
          description="Integration status is reported honestly: no adapter is connected until it is built and tested."
        />
        <PanelBody className="p-0">
          {providers.isPending ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : providers.isError ? (
            <div className="p-3">
              <QueryError error={providers.error} what="providers" />
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-2xs tracking-wider text-subtle-foreground uppercase">
                    <th className="px-3 py-2 font-semibold">Provider</th>
                    <th className="px-3 py-2 font-semibold">Intended use</th>
                    <th className="px-3 py-2 font-semibold">Key</th>
                    <th className="px-3 py-2 font-semibold">Adapter</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {providers.data.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/60">
                      <td className="px-3 py-2">
                        <a href={p.docs_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                          {p.name}
                        </a>
                        <span className="block text-2xs text-subtle-foreground uppercase">{p.category.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{p.intended_use.join(" · ")}</td>
                      <td className="px-3 py-2">
                        {p.secret_fields.length === 0 ? (
                          <Badge tone="info">No key needed</Badge>
                        ) : (
                          <Badge tone={p.active_credentials > 0 ? "positive" : "neutral"}>
                            {p.active_credentials > 0 ? `${p.active_credentials} stored` : "None"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={p.adapter_status === "available" ? "positive" : "warning"}>
                          {p.adapter_status === "available" ? "Available" : "Not implemented"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canManage ? (
                          <Button size="sm" variant="secondary" onClick={() => setAdding(p)} aria-label={`Add ${p.name} key`}>
                            <Plus aria-hidden /> {p.secret_fields.length ? "Add key" : "Configure"}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>

      <Dialog open={adding !== null} onOpenChange={(open) => !open && setAdding(null)}>
        {adding ? <AddCredentialDialog key={adding.id} provider={adding} onClose={() => setAdding(null)} /> : null}
      </Dialog>
    </div>
  );
}
