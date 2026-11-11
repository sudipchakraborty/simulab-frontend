import { test, expect } from "@playwright/test";
test("disabled JSON opens local studio, saves and restores without auth; true restores login", async ({
  page,
}) => {
  let apiCalls = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls++;
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Login disabled");
  await expect(
    page.getByRole("button", { name: "Save Project", exact: true }),
  ).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("simulab-project.json");
  await page.getByLabel("Colour profile").selectOption("graphite");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  await expect(page.getByRole("status")).toContainText("Login disabled");
  expect(apiCalls).toBe(0);
  await page.route("**/system-config.json", (route) =>
    route.fulfill({ json: { loginEnabled: true } }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome to Simulab" }),
  ).toBeVisible();
});
