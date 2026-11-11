import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/system-config.json", (r) =>
    r.fulfill({ json: { loginEnabled: false } }),
  );
});
async function menu(page: Page) {
  const detail = page.locator(".layout-menu");
  if (!(await detail.getAttribute("open")))
    await detail.locator("summary").click();
  return detail;
}
async function resize(page: Page, id: string, delta: number) {
  const handle = page.getByRole("separator", {
    name: `Resize ${id} panel`,
    exact: true,
  });
  const before = Number(await handle.getAttribute("aria-valuenow"));
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    x + (id === "left" || id === "right" ? delta : 0),
    y + (id === "top" || id === "bottom" ? delta : 0),
    { steps: 8 },
  );
  await page.mouse.up();
  const expected =
    before + delta * (id === "right" || id === "bottom" ? -1 : 1);
  await expect(handle).toHaveAttribute("aria-valuenow", String(expected));
  return expected;
}
test("all four panels hide and restore while the circuit and genuine simulation remain alive", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load AVR sample", exact: true })
    .click();
  await expect(page.getByTestId("simulation-status")).toHaveText("ready");
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running");
  const before = (await page.getByTestId("circuit-canvas").boundingBox())!;
  for (const title of ["Components", "Inspector", "Output", "Top toolbar"])
    await page
      .getByRole("button", { name: `Hide ${title}`, exact: true })
      .click();
  for (const edge of ["top", "left", "right", "bottom"])
    await expect(page.locator(`.dock-${edge}`).first()).toBeHidden();
  const after = (await page.getByTestId("circuit-canvas").boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width);
  expect(after.height).toBeGreaterThan(before.height);
  const m = await menu(page);
  await m.getByRole("button", { name: "Show all panels" }).click();
  await m.locator("summary").click();
  for (const edge of ["top", "left", "right", "bottom"])
    await expect(page.locator(`.dock-${edge}`).first()).toBeVisible();
  await expect(page.getByTestId("simulation-status")).toHaveText("running");
  await expect(page.getByTestId("part-uno-1")).toBeVisible();
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await page.screenshot({
    path: "test-results/workspace-panels-restored.png",
    fullPage: true,
  });
});
test("drags every edge, remembers dimensions and visibility on reload, and resets layout", async ({
  page,
}) => {
  await page.goto("/");
  const sizes: Record<string, number> = {};
  for (const [id, delta] of [
    ["left", 64],
    ["right", -48],
    ["top", 40],
    ["bottom", -32],
  ] as const)
    sizes[id] = await resize(page, id, delta);
  await page
    .getByRole("separator", { name: "Resize left panel" })
    .press("ArrowRight");
  sizes.left += 16;
  await expect(
    page.getByRole("separator", { name: "Resize left panel" }),
  ).toHaveAttribute("aria-valuenow", String(sizes.left));
  await page.getByRole("button", { name: "Hide Inspector" }).click();
  await page.reload();
  await expect(page.locator(".dock-right")).toBeHidden();
  for (const id of ["left", "top", "bottom"])
    await expect(
      page.getByRole("separator", { name: `Resize ${id} panel` }),
    ).toHaveAttribute("aria-valuenow", String(sizes[id]));
  const m = await menu(page);
  await m.getByRole("button", { name: "Reset layout" }).click();
  await m.locator("summary").click();
  await expect(page.locator(".dock-right")).toBeVisible();
  await expect(
    page.getByRole("separator", { name: "Resize left panel" }),
  ).toHaveAttribute("aria-valuenow", "252");
  await page.screenshot({
    path: "test-results/workspace-panels-desktop.png",
    fullPage: true,
  });
});
test("output visibility is shared with code build console without losing source", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("tab", { name: "Code Editor", exact: true }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30000 });
  await page.getByLabel("New source filename").fill("layout.h");
  await page.getByRole("button", { name: "Add file", exact: true }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.type("// layout keeps this source");
  await expect(page.locator(".monaco-editor")).toContainText(
    "layout keeps this source",
  );
  await expect(page.locator(".dock-left")).toBeVisible();
  await page.getByRole("button", { name: "Hide Components" }).click();
  const sideMenu = await menu(page);
  await sideMenu.getByLabel("Components", { exact: true }).check();
  await sideMenu.locator("summary").click();
  await expect(page.locator(".dock-left")).toBeVisible();
  await page.getByRole("button", { name: "Hide Output" }).click();
  await expect(page.getByLabel("Build output")).toBeHidden();
  const m = await menu(page);
  await m.getByLabel("Output", { exact: true }).check();
  await m.locator("summary").click();
  await expect(page.getByLabel("Build output")).toBeVisible();
  await expect(page.locator(".monaco-editor")).toContainText(
    "layout keeps this source",
  );
  await page.getByRole("tab", { name: "Hardware", exact: true }).click();
  await expect(page.locator(".bottom-panel")).toBeVisible();
});
test("narrow layout keeps recovery reachable and never overflows the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("circuit-canvas")).toBeVisible();
  await expect(page.locator(".dock-left")).toBeHidden();
  await expect(page.locator(".dock-right")).toBeHidden();
  const m = await menu(page);
  await m.getByRole("button", { name: "Show all panels" }).click();
  await expect(page.locator(".dock-left")).toBeVisible();
  await expect(m.locator("summary")).toBeVisible();
  await m.getByRole("button", { name: "Reset layout" }).click();
  await m.locator("summary").click();
  await expect(page.locator(".dock-left")).toBeHidden();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/workspace-panels-mobile.png",
    fullPage: true,
  });
});

test("maximum vertical sizes keep the bottom output and every resize grip on screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("separator", { name: "Resize top panel" }).press("End");
  await page
    .getByRole("separator", { name: "Resize bottom panel" })
    .press("End");
  const box = (await page.locator(".dock-bottom").first().boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(980);
  const canvas = (await page.getByTestId("circuit-canvas").boundingBox())!;
  expect(canvas.height).toBeGreaterThanOrEqual(120);
  for (const id of ["top", "left", "right", "bottom"]) {
    const b = (await page
      .getByRole("separator", { name: `Resize ${id} panel` })
      .boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(980);
  }
  await page.screenshot({
    path: "test-results/workspace-panels-maximized.png",
    fullPage: true,
  });
});

test("resizing after a viewport shrink uses the displayed size for Home and arrow keys", async ({
  page,
}) => {
  await page.goto("/");
  const left = page.getByRole("separator", { name: "Resize left panel" });
  await left.press("End");
  await expect(left).toHaveAttribute("aria-valuenow", "520");
  await page.setViewportSize({ width: 1000, height: 1000 });
  await expect(left).toHaveAttribute("aria-valuenow", "435");
  await left.press("Home");
  await expect(left).toHaveAttribute("aria-valuenow", "180");
  await left.press("ArrowRight");
  await expect(left).toHaveAttribute("aria-valuenow", "196");
});
