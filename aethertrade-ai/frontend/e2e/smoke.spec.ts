import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

test.skip(!EMAIL || !PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to run end-to-end tests.");

async function signIn(page: Page, next = "/dashboard") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`));
}

async function snap(page: Page, name: string) {
  if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
}

test("rejects a wrong password without revealing details", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Email or password is incorrect.");
  await expect(page).toHaveURL(/\/login/);
});

test("full Phase 1 journey: login, dashboard, settings, API keys, navigation, logout", async ({ page }) => {
  await signIn(page);

  // Dashboard: honest empty panels plus real platform readiness.
  await expect(page.getByRole("heading", { level: 2, name: /Overview/ })).toBeVisible();
  await expect(page.getByText("Database (TimescaleDB) reachable")).toBeVisible();
  await expect(page.getByText("API: ready")).toBeVisible();
  await expect(page.getByText("Paper only", { exact: true })).toBeVisible();
  await snap(page, "dashboard-desktop");

  // Settings → preferences: save a new default capital and see it formatted back.
  await page.getByRole("navigation", { name: "Modules" }).getByRole("link", { name: /Settings/ }).click();
  await expect(page).toHaveURL(/\/settings/);
  const capital = page.getByLabel(/Default paper capital/);
  await capital.fill("150000");
  await expect(page.getByText(/Must be between/)).toBeVisible(); // client-side bound check
  await capital.fill("75000.50");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await snap(page, "settings-preferences");

  // Settings → API integrations: store an encrypted key, verify it is never shown, then revoke it.
  const secret = `e2e-secret-${Date.now()}-abcd`;
  await page.getByRole("tab", { name: "API integrations" }).click();
  await page.getByRole("button", { name: "Add Twelve Data key" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("API key", { exact: true }).fill(secret);
  await dialog.getByRole("button", { name: /Encrypt & save/ }).click();
  const stored = page.getByRole("list", { name: "Stored keys" });
  await expect(stored.getByText(/Twelve Data/)).toBeVisible();
  await expect(stored.getByText(`••••${secret.slice(-4)}`, { exact: false })).toBeVisible();
  expect(await page.content()).not.toContain(secret);
  await snap(page, "settings-integrations");
  await stored.getByRole("button", { name: /Revoke twelve_data/ }).click();
  await stored.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByText("No API keys stored")).toBeVisible();

  // Security tab shows the audit trail of what we just did.
  await page.getByRole("tab", { name: "Security" }).click();
  await expect(page.getByText("credentials.revoked").first()).toBeVisible();
  await expect(page.getByText("preferences.updated").first()).toBeVisible();

  // Command palette navigation to a planned module, which states its phase and shows no data.
  await page.keyboard.press("Control+k");
  await page.getByRole("textbox", { name: "Search modules" }).fill("forex");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/markets\/forex$/);
  await expect(page.getByText("Not yet implemented · Phase 2")).toBeVisible();
  await expect(page.getByText("No data", { exact: true })).toBeVisible();
  await snap(page, "module-forex");

  // Sign out → back to login; protected pages redirect again.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
});

test("mobile layout has no horizontal overflow @mobile", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Platform readiness")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: /Paper Portfolio/ })).toBeVisible();
  await snap(page, "mobile-nav");
  await page.getByRole("dialog").getByRole("link", { name: /Paper Portfolio/ }).click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByText("Not yet implemented · Phase 5")).toBeVisible();
});
