import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataModeBadge } from "@/components/shared/data-mode-badge";
import { ModulePage } from "@/components/shared/module-page";
import { MODULES } from "@/lib/navigation";

function withQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DataModeBadge", () => {
  it.each([
    ["live", "Live"],
    ["delayed", "Delayed"],
    ["historical", "Historical"],
    ["fixture", "Fixture"],
    ["none", "No data"],
  ] as const)("labels %s data", (mode, label) => {
    render(<DataModeBadge mode={mode} />);
    const badge = screen.getByText(label);
    expect(badge.closest("[data-mode]")).toHaveAttribute("data-mode", mode);
  });

  it("explains that fixtures are not market data", () => {
    render(<DataModeBadge mode="fixture" />);
    expect(screen.getByText("Fixture").closest("[title]")).toHaveAttribute(
      "title",
      expect.stringMatching(/not market data/i),
    );
  });
});

describe("ModulePage", () => {
  // The provider panel fetches the catalog; return an empty catalog so the page renders offline.
  function stubProviders() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } })),
    );
  }

  it.each(MODULES.filter((m) => m.status === "planned").map((m) => [m.id, m]))(
    "%s states its phase and renders no figures",
    (_id, mod) => {
      stubProviders();
      const { container } = render(withQuery(<ModulePage id={mod.id} />));
      expect(screen.getByText(new RegExp(`Not yet implemented · Phase ${mod.phase}`))).toBeInTheDocument();
      expect(screen.getByText("No data")).toBeInTheDocument();
      for (const capability of mod.capabilities) {
        expect(within(container).getByText(capability)).toBeInTheDocument();
      }
      // No currency amounts or percentages: a planned module must not show anything that looks like data.
      expect(container.textContent).not.toMatch(/[₹$]\s?\d|\d+(\.\d+)?%/);
    },
  );
});
