import type { z } from "zod";

import { problemSchema, type Problem } from "./schemas";

/**
 * Typed fetch wrapper for the AetherTrade API.
 *
 * - Same-origin requests only (`/api/v1` is rewritten to the backend by Next.js), so the HttpOnly
 *   session cookies are attached by the browser and never visible to JavaScript.
 * - Every request carries `X-Requested-With: aethertrade`, which the backend requires for
 *   cookie-authenticated writes (CSRF defence).
 * - A 401 triggers one token refresh (shared by all concurrent requests) and one retry.
 * - Responses are validated with zod; a malformed response is an error, never rendered.
 */

export const API_BASE = "/api/v1";
const CSRF_HEADERS = { "X-Requested-With": "aethertrade" } as const;
const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/token"];

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | null;
  readonly requestId: string | null;

  constructor(status: number, problem: Problem | null, requestId: string | null) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.requestId = requestId;
  }

  /** Field-level validation messages keyed by the last element of `loc`. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const err of this.problem?.errors ?? []) {
      const key = String(err.loc[err.loc.length - 1] ?? "");
      if (key && !out[key]) out[key] = err.msg;
    }
    return out;
  }
}

/** The session is gone (refresh failed). The UI should send the user to /login. */
export class AuthenticationRequiredError extends ApiError {
  constructor(problem: Problem | null, requestId: string | null) {
    super(401, problem, requestId);
    this.name = "AuthenticationRequiredError";
  }
}

export class InvalidResponseError extends Error {
  constructor(path: string, issues: string) {
    super(`Unexpected response from ${path}: ${issues}`);
    this.name = "InvalidResponseError";
  }
}

type Fetch = typeof fetch;

export interface RequestOptions<T> {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
}

async function readProblem(response: Response): Promise<Problem | null> {
  try {
    const parsed = problemSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createApiClient(fetchImpl: Fetch = (...args) => fetch(...args)) {
  let refreshInFlight: Promise<boolean> | null = null;

  async function send(path: string, method: string, body: unknown, signal?: AbortSignal) {
    const headers: Record<string, string> = { ...CSRF_HEADERS, Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    return fetchImpl(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  }

  function refreshSession(): Promise<boolean> {
    refreshInFlight ??= send("/auth/refresh", "POST", undefined)
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  }

  async function request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const method = options.method ?? "GET";
    let response = await send(path, method, options.body, options.signal);

    if (response.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
      // Retry once even if our refresh lost a race: another tab may have just rotated the session,
      // and the browser already holds its fresh cookies (the backend leaves them in place).
      await refreshSession();
      response = await send(path, method, options.body, options.signal);
      if (response.status === 401) {
        throw new AuthenticationRequiredError(
          await readProblem(response),
          response.headers.get("x-request-id"),
        );
      }
    }

    if (!response.ok) {
      throw new ApiError(response.status, await readProblem(response), response.headers.get("x-request-id"));
    }
    if (response.status === 204 || !options.schema) {
      return undefined as T;
    }
    const json: unknown = await response.json();
    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      throw new InvalidResponseError(path, parsed.error.message);
    }
    return parsed.data;
  }

  return { request, refreshSession };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient();
