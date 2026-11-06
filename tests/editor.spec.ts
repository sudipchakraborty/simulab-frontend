import { test, expect, type Page } from "@playwright/test";
async function pin(page: Page, id: string) {
  const p = page.getByTestId(id);
  await expect(p).toBeVisible();
  return p;
}
async function join(page: Page, a: string, b: string) {
  await (await pin(page, a)).click({ force: true });
  await (await pin(page, b)).click({ force: true });
}
async function exported(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export project" }).click();
  const d = await pending;
  const stream = await d.createReadStream();
  let data = "";
  for await (const chunk of stream!) data += chunk.toString();
  return JSON.parse(data);
}
test("pin snapping, shared pin, junction, movement and exact export/import topology", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("DEMO MODE")).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await expect(page.locator(".react-flow__edge")).toHaveCount(5);
  await join(page, "pin-uno-1-D3", "pin-led-1-A");
  await expect(page.locator(".react-flow__edge")).toHaveCount(6);
  await join(page, "pin-uno-1-D3", "pin-switch-1-1");
  await expect(page.locator(".react-flow__edge")).toHaveCount(7);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".react-flow__edge")).toHaveCount(6);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".react-flow__edge")).toHaveCount(7);
  const edge = page.locator(".react-flow__edge-interaction").first();
  const point = await edge.evaluate((el: any) => {
    const p = el.getPointAtLength(el.getTotalLength() / 2);
    const m = el.getScreenCTM();
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  });
  // Immediate double-click must retain its edge hit target during selection updates.
  await page.mouse.dblclick(point.x, point.y);
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await expect(page.locator(".react-flow__edge")).toHaveCount(8);
  const before = await exported(page);
  const junction = before.components.find((c: any) => c.kind === "junction");
  expect(junction).toBeTruthy();
  await join(page, `pin-${junction.id}-J`, "pin-uno-1-D4");
  await expect(page.locator(".react-flow__edge")).toHaveCount(9);
  const body = page.getByTestId("part-switch-1").locator(".part-heading");
  const box = await body.boundingBox();
  await page.mouse.move(box!.x + 30, box!.y + 15);
  await page.mouse.down();
  await page.mouse.move(box!.x + 70, box!.y + 55, { steps: 8 });
  await page.mouse.up();
  const saved = await exported(page);
  expect(
    saved.components.find((c: any) => c.id === "switch-1").position,
  ).not.toEqual(
    before.components.find((c: any) => c.id === "switch-1").position,
  );
  await page.getByLabel("Import circuit JSON").setInputFiles({
    name: "roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(
    page.getByText("Project imported. Electrical connectivity restored."),
  ).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
});
test("palette drag/drop, validation and rejected import preserve document", async ({
  page,
}) => {
  await page.goto("/");
  const source = page.getByRole("button", { name: /LED Indicator/ });
  const canvas = page.getByTestId("circuit-canvas");
  await source.dragTo(canvas, { targetPosition: { x: 350, y: 250 } });
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await page.getByRole("button", { name: "Check circuit" }).click();
  await expect(page.getByText(/Connectivity checked:/)).toBeVisible();
  await page.getByLabel("Import circuit JSON").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":"99"}'),
  });
  await expect(page.getByText(/unsupported schema version/)).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
});
test("small screen retains usable canvas and tools", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("circuit-canvas")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
});

test("drag wire snaps to a nearby pin rather than another pin", async ({
  page,
}) => {
  await page.goto("/");
  const source = await page.getByTestId("pin-uno-1-D5").boundingBox();
  const target = await page.getByTestId("pin-led-1-K").boundingBox();
  expect(source).toBeTruthy();
  expect(target).toBeTruthy();
  await page.mouse.move(
    source!.x + source!.width / 2,
    source!.y + source!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    target!.x + target!.width / 2 + 8,
    target!.y + target!.height / 2 + 3,
    { steps: 15 },
  );
  await page.mouse.up();
  await expect(page.locator(".react-flow__edge")).toHaveCount(6);
  const saved = await exported(page);
  expect(saved.wires).toContainEqual(
    expect.objectContaining({
      from: { componentId: "uno-1", pinId: "D5" },
      to: { componentId: "led-1", pinId: "K" },
    }),
  );
});

test("visually crossing wires remain separate electrical nets after browser import and export", async ({
  page,
}) => {
  await page.goto("/");
  const component = (id: string, x: number, y: number) => ({
    id,
    kind: "resistor",
    label: id,
    position: { x, y },
    rotation: 0,
    properties: { resistanceOhms: 220 },
  });
  const fixture = {
    schemaVersion: "1.0.0",
    name: "Crossings stay separate",
    components: [
      component("left", 0, 160),
      component("right", 600, 160),
      component("top", 300, -40),
      component("bottom", 300, 360),
    ],
    wires: [
      {
        id: "horizontal",
        from: { componentId: "left", pinId: "2" },
        to: { componentId: "right", pinId: "1" },
        color: "#00aa88",
        label: "Horizontal",
      },
      {
        id: "vertical",
        from: { componentId: "top", pinId: "2" },
        to: { componentId: "bottom", pinId: "1" },
        color: "#aa6688",
        label: "Vertical",
      },
    ],
  };
  await page.getByLabel("Import circuit JSON").setInputFiles({
    name: "crossings.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(
    page.getByText("Project imported. Electrical connectivity restored."),
  ).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await page.getByRole("button", { name: /^Netlist/ }).click();
  const rows = page.locator(".net-list > div");
  await expect(rows.filter({ hasText: "left.2" })).toContainText("right.1");
  await expect(rows.filter({ hasText: "left.2" })).not.toContainText("top.2");
  await expect(rows.filter({ hasText: "top.2" })).toContainText("bottom.1");
  expect(await exported(page)).toEqual(fixture);
});
