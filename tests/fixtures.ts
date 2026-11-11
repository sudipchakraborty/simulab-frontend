import { test as base, expect, type APIRequestContext } from "@playwright/test";

type AuthenticatedState = Awaited<
  ReturnType<APIRequestContext["storageState"]>
>;

/** @brief Authenticate once per worker through the real API and copy cookies into each isolated browser context. */
export const test = base.extend<{}, { authenticatedState: AuthenticatedState }>(
  {
    authenticatedState: [
      async ({ playwright }, use, workerInfo) => {
        const baseURL = workerInfo.project.use.baseURL;
        if (!baseURL)
          throw new Error("The real account fixture requires baseURL");
        const client = await playwright.request.newContext({ baseURL });
        try {
          const response = await client.get("/api/auth/session");
          expect(
            response.ok(),
            "Real account fixture must be reachable",
          ).toBeTruthy();
          const session = await response.json();
          const login = await client.post("/api/auth/login", {
            headers: { origin: baseURL, "x-csrf-token": session.csrfToken },
            data: {
              email: "paid@simulab.test",
              password: "Simulab-test-password-123",
              remember: true,
            },
          });
          expect(login.ok(), await login.text()).toBeTruthy();
          await use(await client.storageState());
        } finally {
          await client.dispose();
        }
      },
      { scope: "worker" },
    ],
    page: async ({ page }, use) => {
      await page.route("**/system-config.json", (route) =>
        route.fulfill({ json: { loginEnabled: true } }),
      );
      await use(page);
    },
    storageState: async ({ authenticatedState }, use) => {
      await use(authenticatedState);
    },
  },
);
export { expect };
export type { Page } from "@playwright/test";
