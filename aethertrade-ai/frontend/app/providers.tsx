"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/primitives";
import { ApiError, AuthenticationRequiredError } from "@/services/api/client";

/**
 * When any query or mutation reports that the session is gone (refresh failed), drop all cached server
 * data and send the user to /login, preserving where they were.
 */
function SessionExpiryRedirect() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    function handle(error: unknown) {
      if (!(error instanceof AuthenticationRequiredError)) return;
      const { pathname, search } = window.location;
      if (pathname === "/login") return;
      queryClient.clear();
      router.replace(`/login?next=${encodeURIComponent(`${pathname}${search}`)}`);
    }
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") handle(event.action.error);
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") handle(event.action.error);
    });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient, router]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // Never retry client errors (auth, validation); retry transient failures twice.
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SessionExpiryRedirect />
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
