"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { BrandMark, BrandName } from "@/components/shell/brand";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { safeNextPath } from "@/lib/safe-redirect";
import { ApiError } from "@/services/api/client";
import { authApi } from "@/services/api/endpoints";

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many attempts. Wait a few minutes before trying again.";
    if (error.status === 401) return "Email or password is incorrect.";
    if (error.status === 403) return error.message;
    if (error.status >= 500) return "The server could not process the request. Try again shortly.";
    return error.message;
  }
  return "Cannot reach the AetherTrade API. Check that the backend is running.";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Already signed in (e.g. arrived from an external link without the session hint)? Go straight in.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then(() => {
        if (!cancelled) router.replace(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  const login = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: () => router.replace(next),
    onError: () => setPassword(""),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (email && password) login.mutate();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center justify-center gap-2.5">
        <BrandMark className="size-8" />
        <BrandName className="text-lg" />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border bg-surface p-5 shadow-xl" noValidate>
        <div>
          <h1 className="text-base font-semibold">Sign in to the research terminal</h1>
          <p className="mt-1 text-xs text-muted-foreground">Single-user workspace. Accounts are created by the operator.</p>
        </div>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {login.isError ? (
          <p role="alert" className="rounded-md border border-negative/30 bg-negative-muted px-3 py-2 text-xs text-negative">
            {describe(login.error)}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={login.isPending || !email || !password}>
          {login.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 flex items-start gap-2 text-xs text-subtle-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
        Research and paper trading only. No real orders can be placed, and nothing here is investment advice.
      </p>
    </div>
  );
}
