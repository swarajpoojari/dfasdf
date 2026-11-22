import { z } from "zod";

/**
 * Runtime schemas for API responses. Responses are parsed, not cast: if the backend ever returns
 * something unexpected the UI shows an error instead of rendering malformed financial data.
 */

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, "expected a decimal string");

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().nullable().optional(),
  instance: z.string().nullable().optional(),
  request_id: z.string().nullable().optional(),
  errors: z
    .array(z.object({ loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), type: z.string().nullable() }))
    .nullable()
    .optional(),
});
export type Problem = z.infer<typeof problemSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  display_name: z.string(),
  role: z.enum(["owner", "analyst", "viewer"]),
  is_active: z.boolean(),
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  permissions: z.array(z.string()),
});
export type User = z.infer<typeof userSchema>;

export const loginResponseSchema = z.object({ user: userSchema, access_expires_at: z.string() });

export const preferencesSchema = z.object({
  base_currency: z.enum(["INR", "USD"]),
  timezone: z.string(),
  number_locale: z.enum(["en-IN", "en-US"]),
  theme: z.enum(["dark", "light", "system"]),
  default_paper_capital: decimalString,
  paper_capital_bounds: z.object({ min: decimalString, max: decimalString }),
  updated_at: z.string(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferencesUpdate = Partial<
  Pick<Preferences, "base_currency" | "timezone" | "number_locale" | "theme" | "default_paper_capital">
>;

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  intended_use: z.array(z.string()),
  secret_fields: z.array(z.string()),
  config_fields: z.array(z.string()),
  docs_url: z.url(),
  adapter_status: z.enum(["not_implemented", "available"]),
  active_credentials: z.number().int().nonnegative(),
});
export type Provider = z.infer<typeof providerSchema>;

export const credentialSchema = z.object({
  id: z.uuid(),
  provider: z.string(),
  label: z.string(),
  secret_fields: z.array(z.string()),
  secret_hint: z.string().nullable(),
  config: z.record(z.string(), z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Credential = z.infer<typeof credentialSchema>;

export interface CredentialCreate {
  provider: string;
  label: string;
  secrets: Record<string, string>;
  config: Record<string, string>;
}

const dependencyStatus = z.object({ status: z.enum(["ok", "unavailable"]), error: z.string().nullable() });
export const readinessSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: dependencyStatus,
  redis: dependencyStatus,
});
export type Readiness = z.infer<typeof readinessSchema>;

export const systemInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  environment: z.string(),
  execution_mode: z.literal("research_and_paper_only"),
  live_trading_available: z.literal(false),
  fixture_data_allowed: z.boolean(),
});
export type SystemInfo = z.infer<typeof systemInfoSchema>;

export const auditLogSchema = z.object({
  id: z.uuid(),
  occurred_at: z.string(),
  actor_type: z.string(),
  actor_id: z.uuid().nullable(),
  action: z.string(),
  entity_type: z.string().nullable(),
  entity_id: z.uuid().nullable(),
  request_id: z.string().nullable(),
  ip_address: z.string().nullable(),
  details: z.record(z.string(), z.unknown()),
});
export const auditLogPageSchema = z.object({ items: z.array(auditLogSchema), next_cursor: z.string().nullable() });
export type AuditLogPage = z.infer<typeof auditLogPageSchema>;
