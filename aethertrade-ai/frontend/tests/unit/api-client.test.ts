import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  ApiError,
  AuthenticationRequiredError,
  InvalidResponseError,
  createApiClient,
} from "@/services/api/client";

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function problem(status: number, detail: string): Response {
  return json(status, { type: "x", title: "t", status, detail, request_id: "req-1" }, { "x-request-id": "req-1" });
}

function client(handler: Handler) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    return handler(url, init ?? {});
  });
  return { api: createApiClient(fetchImpl as unknown as typeof fetch), calls };
}

const schema = z.object({ ok: z.boolean() });

describe("api client", () => {
  it("sends same-origin requests with the CSRF header and JSON body", async () => {
    const { api, calls } = client(() => json(200, { ok: true }));
    await api.request("/things", { method: "POST", body: { a: 1 }, schema });
    const { url, init } = calls[0]!;
    expect(url).toBe("/api/v1/things");
    expect(init.credentials).toBe("same-origin");
    expect((init.headers as Record<string, string>)["X-Requested-With"]).toBe("aethertrade");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("refreshes once on 401 and retries the request", async () => {
    let authed = false;
    const { api, calls } = client((url) => {
      if (url.endsWith("/auth/refresh")) {
        authed = true;
        return json(200, {});
      }
      return authed ? json(200, { ok: true }) : problem(401, "expired");
    });
    await expect(api.request("/users/me", { schema })).resolves.toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual(["/api/v1/users/me", "/api/v1/auth/refresh", "/api/v1/users/me"]);
  });

  it("shares one refresh between concurrent requests", async () => {
    let authed = false;
    let releaseRefresh: () => void = () => undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const { api, calls } = client(async (url) => {
      if (url.endsWith("/auth/refresh")) {
        await refreshGate;
        authed = true;
        return json(200, {});
      }
      return authed ? json(200, { ok: true }) : problem(401, "expired");
    });
    const pending = Promise.all([api.request("/a", { schema }), api.request("/b", { schema }), api.request("/c", { schema })]);
    await vi.waitFor(() => expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1));
    releaseRefresh();
    await expect(pending).resolves.toHaveLength(3);
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("retries after a lost refresh race, because another tab may have refreshed the cookies", async () => {
    let attempt = 0;
    const { api } = client((url) => {
      if (url.endsWith("/auth/refresh")) return problem(401, "session-rotated");
      attempt += 1;
      return attempt === 1 ? problem(401, "expired") : json(200, { ok: true });
    });
    await expect(api.request("/users/me", { schema })).resolves.toEqual({ ok: true });
  });

  it("raises AuthenticationRequiredError when the session cannot be recovered", async () => {
    const { api } = client(() => problem(401, "expired"));
    await expect(api.request("/users/me", { schema })).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("does not try to refresh for the auth endpoints themselves", async () => {
    const { api, calls } = client(() => problem(401, "Email or password is incorrect."));
    const error = await api.request("/auth/login", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(AuthenticationRequiredError);
    expect(calls).toHaveLength(1);
  });

  it("parses problem details, field errors and the request id", async () => {
    const { api } = client(() =>
      json(422, {
        type: "x",
        title: "Validation error",
        status: 422,
        detail: "The request is invalid.",
        request_id: "req-9",
        errors: [{ loc: ["body", "default_paper_capital"], msg: "too large", type: "value_error" }],
      }, { "x-request-id": "req-9" }),
    );
    const error = (await api.request("/x", { method: "PATCH", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(422);
    expect(error.requestId).toBe("req-9");
    expect(error.fieldErrors()).toEqual({ default_paper_capital: "too large" });
  });

  it("rejects responses that do not match the schema instead of rendering them", async () => {
    const { api } = client(() => json(200, { ok: "yes" }));
    await expect(api.request("/x", { schema })).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("returns undefined for 204 responses", async () => {
    const { api } = client(() => new Response(null, { status: 204 }));
    await expect(api.request("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
