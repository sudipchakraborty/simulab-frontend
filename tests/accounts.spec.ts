import { test, expect, type Page } from "@playwright/test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
const password = "Browser-test-password-123";
async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(password.replace("Browser", "Simulab"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
}
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to Simulab" }),
  ).toBeVisible();
}
function findMail(email: string, subject: string) {
  for (const folder of ["mail-outbox", "mail-outbox-production"]) {
    const dir = resolve(".local/e2e", folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).reverse()) {
      const message = JSON.parse(readFileSync(join(dir, file), "utf8"));
      if (message.to === email && message.subject === subject) return message;
    }
  }
  return undefined;
}

test("real signup and one-click verification restore trial, theme and protect every save path", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `browser-${Date.now()}@simulab.test`;
  await page.goto("/");
  await page.getByLabel("Colour profile").selectOption("pearl");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("server outbox");
  await page.screenshot({
    path: "test-results/account-signup-pending.png",
    fullPage: true,
  });
  await expect
    .poll(() => !!findMail(email, "Verify your Simulab account"))
    .toBeTruthy();
  const message = findMail(email, "Verify your Simulab account");
  await page.goto(message.url);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "pearl");
  await expect(
    page.getByRole("button", { name: "Export project", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save Project", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/account-trial-light.png",
    fullPage: true,
  });
  let downloads = 0,
    writes = 0;
  page.on("download", () => downloads++);
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/projects")
      writes++;
  });
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(1200);
  expect(downloads).toBe(0);
  expect(writes).toBe(0);
  const session = await (await page.request.get("/api/auth/session")).json();
  const denied = await page.request.post("/api/projects", {
    headers: { origin: baseURL!, "x-csrf-token": session.csrfToken },
    data: { name: "forged entitlement", data: {} },
  });
  expect(denied.status()).toBe(403);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "pearl");
  await page
    .getByRole("button", { name: "Plan & billing", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Checkout is not configured",
  );
  await expect(
    page.getByRole("button", { name: "Create checkout", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close account dialog" }).click();
  await signOut(page);
  await expect(
    page.getByRole("heading", { name: "Welcome to Simulab" }),
  ).toBeVisible();
  const replay = await page.request.get(
    "/api/auth/verify?token=" + new URL(message.url).searchParams.get("verify"),
  );
  expect(replay.status()).toBe(400);
  expect(errors).toEqual([]);
});

test("real paid editor saves a private cloud project and account themes remain isolated", async ({
  page,
  baseURL,
}) => {
  await signIn(page, "paid@simulab.test");
  await page.getByLabel("Colour profile").selectOption("graphite");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  await page.screenshot({
    path: "test-results/account-paid-dark.png",
    fullPage: true,
  });
  await page.getByLabel("Colour profile").selectOption("corporate-light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "corporate-light",
  );
  await page.screenshot({
    path: "test-results/account-paid-light.png",
    fullPage: true,
  });
  await page.getByLabel("Colour profile").selectOption("graphite");
  const saved = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/projects" &&
      r.request().method() === "POST",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  expect((await saved).status()).toBe(201);
  await download;
  const list = await (await page.request.get("/api/projects")).json();
  expect(list.projects.length).toBeGreaterThan(0);
  const privateId = list.projects.at(-1).id;
  await signOut(page);
  await signIn(page, "trial@simulab.test");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "corporate-navy",
  );
  expect((await page.request.get("/api/projects/" + privateId)).status()).toBe(
    404,
  );
  await signOut(page);
  await signIn(page, "paid@simulab.test");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  const anonymous = await page.request.get("/api/auth/session");
  const active = await anonymous.json();
  const forged = await page.request.post("/api/admin/payments/abc/approve", {
    headers: { origin: baseURL!, "x-csrf-token": active.csrfToken },
    data: {},
  });
  expect(forged.status()).toBe(403);
});

test("real forgot-password link resets credentials and signs in with the new password", async ({
  page,
}) => {
  const email = `reset-${Date.now()}@simulab.test`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  await expect
    .poll(() => !!findMail(email, "Verify your Simulab account"))
    .toBeTruthy();
  await page.goto(findMail(email, "Verify your Simulab account").url);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await signOut(page);
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Request reset", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("server outbox");
  await page.screenshot({
    path: "test-results/account-password-reset-request.png",
    fullPage: true,
  });
  await expect
    .poll(() => !!findMail(email, "Reset your Simulab password"))
    .toBeTruthy();
  await page.goto(findMail(email, "Reset your Simulab password").url);
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();
  await page
    .getByLabel("Password", { exact: true })
    .fill("New-browser-password-123");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password reset");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("New-browser-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});

// Auth scenarios explicitly exercise the enabled configuration.
test.beforeEach(async ({page}) => {await page.route("**/system-config.json", route => route.fulfill({json:{loginEnabled:true}}));});
