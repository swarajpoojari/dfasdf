"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";

import { QueryError } from "@/components/shared/query-error";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/primitives";
import { useHasPermission, usePreferences } from "@/hooks/use-session";
import { formatTimestamp } from "@/lib/format";
import { auditApi, authApi, queryKeys } from "@/services/api/endpoints";

const MIN_PASSWORD = 12;

function PasswordForm() {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const mismatch = confirm.length > 0 && confirm !== next;
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;

  function submit(event: FormEvent) {
    event.preventDefault();
    setDone(false);
    if (!mismatch && !tooShort) change.mutate();
  }

  return (
    <Panel>
      <PanelHeader
        title="Change password"
        description="Signs out every other session and invalidates all previously issued access tokens."
      />
      <PanelBody>
        <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
          <Field label="Current password" htmlFor="current-password">
            <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" htmlFor="new-password" error={tooShort ? `At least ${MIN_PASSWORD} characters.` : null}>
            <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password" error={mismatch ? "Passwords do not match." : null}>
            <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {change.isError ? <QueryError error={change.error} what="the password change" /> : null}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={change.isPending || !current || !next || mismatch || tooShort}>
              {change.isPending ? "Updating…" : "Update password"}
            </Button>
            {done ? (
              <span className="flex items-center gap-1 text-xs text-positive" role="status">
                <Check className="size-3.5" aria-hidden /> Password updated
              </span>
            ) : null}
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}

function AuditLog() {
  const prefs = usePreferences();
  const timeZone = prefs.data?.timezone ?? "UTC";
  const audit = useInfiniteQuery({
    queryKey: queryKeys.audit(),
    queryFn: ({ pageParam }) => auditApi.list({ limit: 25, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const rows = audit.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Panel>
      <PanelHeader title="Audit log" description="Append-only record of security-relevant actions. The database rejects edits and deletions." />
      <PanelBody className="p-0">
        {audit.isPending ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        ) : audit.isError ? (
          <div className="p-3">
            <QueryError error={audit.error} what="the audit log" />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b text-left text-2xs tracking-wider text-subtle-foreground uppercase">
                  <th className="px-3 py-2 font-semibold">Time ({timeZone})</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="figures px-3 py-1.5 whitespace-nowrap text-muted-foreground">{formatTimestamp(r.occurred_at, timeZone)}</td>
                    <td className="px-3 py-1.5 font-mono">{r.action}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.actor_type}</td>
                    <td className="figures px-3 py-1.5 text-muted-foreground">{r.ip_address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.hasNextPage ? (
              <div className="border-t p-2 text-center">
                <Button size="sm" variant="ghost" onClick={() => audit.fetchNextPage()} disabled={audit.isFetchingNextPage}>
                  {audit.isFetchingNextPage ? "Loading…" : "Load older entries"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

export function SecurityPanel() {
  const canReadAudit = useHasPermission("audit:read");
  return (
    <div className="grid gap-3 xl:grid-cols-5">
      <div className="xl:col-span-2">
        <PasswordForm />
      </div>
      <div className="xl:col-span-3">{canReadAudit ? <AuditLog /> : null}</div>
    </div>
  );
}
