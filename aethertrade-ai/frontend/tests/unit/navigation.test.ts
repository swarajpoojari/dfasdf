import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { MODULES, NAV_GROUPS, moduleForPath, searchModules } from "@/lib/navigation";

const APP_DIR = path.resolve(__dirname, "../../app/(terminal)");

describe("module registry", () => {
  it("covers the 18 required modules", () => {
    expect(MODULES).toHaveLength(18);
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(18);
    expect(new Set(MODULES.map((m) => m.href)).size).toBe(18);
  });

  it("has a page file for every navigation entry", () => {
    for (const m of MODULES) {
      const page = path.join(APP_DIR, m.href, "page.tsx");
      expect(existsSync(page), `${m.id} → ${page}`).toBe(true);
    }
  });

  it("assigns every module to a known group, and every group has modules", () => {
    for (const m of MODULES) expect(NAV_GROUPS).toContain(m.group);
    for (const g of NAV_GROUPS) expect(MODULES.some((m) => m.group === g)).toBe(true);
  });

  it("keeps status honest", () => {
    for (const m of MODULES) {
      expect(m.capabilities.length, m.id).toBeGreaterThan(0);
      if (m.status === "partial") expect(m.implemented?.length, m.id).toBeGreaterThan(0);
      if (m.status === "planned") expect(m.implemented ?? [], m.id).toHaveLength(0);
      expect(m.phase).toBeGreaterThanOrEqual(1);
      expect(m.phase).toBeLessThanOrEqual(7);
    }
    // Only the Phase 1 surfaces (dashboard readiness, settings) are claimed as partially working.
    expect(MODULES.filter((m) => m.status !== "planned").map((m) => m.id)).toEqual(["dashboard", "settings"]);
    expect(MODULES.some((m) => m.status === "available")).toBe(false);
  });
});

describe("moduleForPath", () => {
  it("prefers the most specific route", () => {
    expect(moduleForPath("/markets/india")?.id).toBe("india");
    expect(moduleForPath("/markets")?.id).toBe("markets");
    expect(moduleForPath("/markets/fno/chain")?.id).toBe("fno");
    expect(moduleForPath("/settings")?.id).toBe("settings");
    expect(moduleForPath("/unknown")).toBeUndefined();
  });
});

describe("searchModules", () => {
  it("matches titles, groups and keywords with all terms required", () => {
    expect(searchModules("").length).toBe(18);
    expect(searchModules("nifty").map((m) => m.id)).toEqual(expect.arrayContaining(["india", "fno"]));
    expect(searchModules("api keys").map((m) => m.id)).toEqual(["settings"]);
    expect(searchModules("zzzz")).toEqual([]);
  });
});
