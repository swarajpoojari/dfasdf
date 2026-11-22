import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real, already-running stack (backend + frontend), never mocks:
 *
 *   E2E_BASE_URL   frontend URL (default http://localhost:3000)
 *   E2E_EMAIL      an owner account created with `python -m app.cli create-user`
 *   E2E_PASSWORD   its password
 *
 * The tests change preferences and add/revoke a credential on that account, so point them at a
 * development database.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      grepInvert: /@mobile/,
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
