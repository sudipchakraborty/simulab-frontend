import { defineConfig } from "@playwright/test";
const port = Number(process.env.SIMULAB_PREVIEW_PORT ?? 5185);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid preview port");
const url = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests",
  // The real companion intentionally serializes compiler jobs.
  workers: process.env.SIMULAB_TEST_TOKEN ? 1 : undefined,
  use: { baseURL: url, viewport: { width: 1440, height: 1000 } },
  webServer: [
    {
      command: "node scripts/account-test-server.mjs",
      url: "http://127.0.0.1:4322/api/auth/session",
      reuseExistingServer: false,
      env: {
        SIMULAB_E2E_ACCOUNT_PORT: "4322",
        SIMULAB_E2E_ORIGIN: url,
        SIMULAB_E2E_OUTBOX: ".local/e2e/mail-outbox-production",
      },
    },
    {
      command: `npm.cmd run preview -- --port ${port} --strictPort`,
      url,
      reuseExistingServer: false,
      env: { SIMULAB_ACCOUNT_API: "http://127.0.0.1:4322" },
    },
  ],
  reporter: "list",
});
