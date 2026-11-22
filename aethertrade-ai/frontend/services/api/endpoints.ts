import { z } from "zod";

import { api } from "./client";
import {
  auditLogPageSchema,
  credentialSchema,
  loginResponseSchema,
  preferencesSchema,
  providerSchema,
  readinessSchema,
  systemInfoSchema,
  userSchema,
  type CredentialCreate,
  type PreferencesUpdate,
} from "./schemas";

export const authApi = {
  login: (email: string, password: string) =>
    api.request("/auth/login", { method: "POST", body: { email, password }, schema: loginResponseSchema }),
  logout: () => api.request<void>("/auth/logout", { method: "POST" }),
  me: () => api.request("/users/me", { schema: userSchema }),
  changePassword: (current_password: string, new_password: string) =>
    api.request("/users/me/password", {
      method: "POST",
      body: { current_password, new_password },
      schema: loginResponseSchema,
    }),
};

export const preferencesApi = {
  get: () => api.request("/users/me/preferences", { schema: preferencesSchema }),
  update: (patch: PreferencesUpdate) =>
    api.request("/users/me/preferences", { method: "PATCH", body: patch, schema: preferencesSchema }),
};

export const integrationsApi = {
  providers: () => api.request("/integrations/providers", { schema: z.array(providerSchema) }),
  credentials: () => api.request("/integrations/credentials", { schema: z.array(credentialSchema) }),
  createCredential: (body: CredentialCreate) =>
    api.request("/integrations/credentials", { method: "POST", body, schema: credentialSchema }),
  revokeCredential: (id: string) =>
    api.request<void>(`/integrations/credentials/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const systemApi = {
  readiness: async () => {
    // Readiness returns 503 with a valid body when degraded; treat that as data, not an error.
    const response = await fetch("/api/v1/system/health/ready", { cache: "no-store" });
    const parsed = readinessSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new Error("API unreachable");
    return parsed.data;
  },
  info: () => api.request("/system/info", { schema: systemInfoSchema }),
};

export const auditApi = {
  list: (params: { limit?: number; cursor?: string | null; actionPrefix?: string }) => {
    const search = new URLSearchParams();
    search.set("limit", String(params.limit ?? 50));
    if (params.cursor) search.set("cursor", params.cursor);
    if (params.actionPrefix) search.set("action_prefix", params.actionPrefix);
    return api.request(`/audit-logs?${search.toString()}`, { schema: auditLogPageSchema });
  },
};

export const queryKeys = {
  me: ["session", "me"] as const,
  preferences: ["preferences"] as const,
  providers: ["integrations", "providers"] as const,
  credentials: ["integrations", "credentials"] as const,
  readiness: ["system", "readiness"] as const,
  systemInfo: ["system", "info"] as const,
  audit: (actionPrefix?: string) => ["audit", actionPrefix ?? ""] as const,
};
