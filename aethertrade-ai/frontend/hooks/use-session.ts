"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { authApi, preferencesApi, queryKeys } from "@/services/api/endpoints";
import type { PreferencesUpdate } from "@/services/api/schemas";

export function useSession() {
  return useQuery({ queryKey: queryKeys.me, queryFn: authApi.me, staleTime: 60_000, retry: false });
}

export function useHasPermission(permission: string): boolean {
  const { data } = useSession();
  return data?.permissions.includes(permission) ?? false;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Drop every cached server response for this session before leaving the terminal.
      queryClient.clear();
      router.replace("/login");
    },
  });
}

export function usePreferences() {
  return useQuery({ queryKey: queryKeys.preferences, queryFn: preferencesApi.get, staleTime: 5 * 60_000 });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesUpdate) => preferencesApi.update(patch),
    onSuccess: (prefs) => queryClient.setQueryData(queryKeys.preferences, prefs),
  });
}
