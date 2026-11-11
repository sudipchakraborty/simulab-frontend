import { defineConfig } from "@playwright/test";
const port = Number(process.env.SIMULAB_TEST_PORT || 5184);
const origin = "http://127.0.0.1:" + port;
export default defineConfig({
  testDir: "./tests",
  // The real companion intentionally serializes compiler jobs.
  workers: process.env.SIMULAB_TEST_TOKEN ? 1 : undefined,
  use: { baseURL: origin, viewport: { width: 1440, height: 1000 } },
  webServer: [
    {
      command: "node scripts/account-test-server.mjs",
      url: "http://127.0.0.1:4321/api/auth/session",
      reuseExistingServer: false,
      env: {
        SIMULAB_E2E_ACCOUNT_PORT: "4321",
        SIMULAB_E2E_ORIGIN: origin,
        SIMULAB_E2E_OUTBOX: ".local/e2e/mail-outbox",
      },
    },
    {
      command: "npm.cmd run dev -- --port " + port + " --strictPort",
      url: origin,
      reuseExistingServer: false,
      env: { SIMULAB_ACCOUNT_API: "http://127.0.0.1:4321" },
    },
  ],
  reporter: "list",
});
