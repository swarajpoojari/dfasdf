import { TriangleAlert } from "lucide-react";

import { ApiError } from "@/services/api/client";

/** Inline error for a failed query or mutation; includes the request id for log correlation. */
export function QueryError({ error, what }: { error: unknown; what: string }) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const requestId = error instanceof ApiError ? error.requestId : null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative-muted px-3 py-2 text-xs text-negative">
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p>
          Could not load {what}: {message}
        </p>
        {requestId ? <p className="figures mt-0.5 text-negative/80">Request {requestId}</p> : null}
      </div>
    </div>
  );
}
