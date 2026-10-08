import { defineConfig, devices } from "@playwright/test";

// Not the default 4321, so a running `pnpm dev` (without the fake OAuth app
// below) is never reused for the test run.
const PORT = 4329;
const baseURL = `http://localhost:${PORT}`;

// E2E tests run against the Astro dev server. `astro preview` is not available
// with the Vercel adapter, so we boot the dev server for the test run. It is
// started through scripts/dev-server.mjs rather than `pnpm dev`: see the
// comment there for why the CLI cannot be used.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node scripts/dev-server.mjs",
    // Fake OAuth app so "Sign in with daily.dev" renders. Tests intercept the
    // redirect to daily.dev in the browser; these never reach a real server.
    env: {
      ...process.env,
      PORT: String(PORT),
      DAILY_OAUTH_CLIENT_ID: "test-client-id",
      DAILY_OAUTH_CLIENT_SECRET: "test-client-secret",
    } as Record<string, string>,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
