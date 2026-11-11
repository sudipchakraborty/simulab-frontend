import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/system-config.json", (r) =>
    r.fulfill({ json: { loginEnabled: false } }),
  );
});
async function exported(page: Page, full = false) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: full ? "Save Project" : "Export project",
      exact: true,
    })
    .click();
  let text = "";
  for await (const chunk of (await (await pending).createReadStream())!)
    text += chunk.toString();
  return JSON.parse(text);
}
async function rectangle(page: Page, ids: string[]) {
  const boxes = await Promise.all(
    ids.map((id) => page.getByTestId("part-" + id).boundingBox()),
  );
  const x = Math.min(...boxes.map((b) => b!.x)) - 12,
    y = Math.min(...boxes.map((b) => b!.y)) - 12,
    endX = Math.max(...boxes.map((b) => b!.x + b!.width)) + 12,
    endY = Math.max(...boxes.map((b) => b!.y + b!.height)) + 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.up();
}
test("rectangle selection moves the group atomically, copies internal wires and deletes with undo", async ({
  page,
}) => {
  await page.goto("/");
  const before = await exported(page);
  await rectangle(page, ["resistor-1", "led-1"]);
  await expect(page.getByTestId("selection-count")).toContainText(
    "2 components",
  );
  await expect(
    page.getByRole("heading", { name: "Group selection" }),
  ).toBeVisible();
  const box = (await page.getByTestId("part-resistor-1").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + 52, { steps: 12 });
  await page.mouse.up();
  const moved = await exported(page);
  const delta = (id: string) => {
    const a = before.components.find((c: any) => c.id === id),
      b = moved.components.find((c: any) => c.id === id);
    return { x: b.position.x - a.position.x, y: b.position.y - a.position.y };
  };
  expect(delta("resistor-1")).toEqual(delta("led-1"));
  expect(delta("resistor-1")).not.toEqual({ x: 0, y: 0 });
  expect(moved.wires).toEqual(before.wires);
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  const pasted = await exported(page);
  expect(pasted.wires).toHaveLength(6);
  const copyIds = pasted.components.slice(-2).map((c: any) => c.id);
  expect(
    copyIds.every(
      (id: string) => !before.components.some((c: any) => c.id === id),
    ),
  ).toBe(true);
  expect(copyIds).toContain(pasted.wires.at(-1).from.componentId);
  expect(copyIds).toContain(pasted.wires.at(-1).to.componentId);
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("6 components");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByRole("button", { name: "Delete all", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete all components", exact: true })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.screenshot({
    path: "test-results/group-editing.png",
    fullPage: true,
  });
});
test("New project cancellation keeps source; confirmation creates a blank design and fresh code", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.getByRole("tab", { name: "Code Editor", exact: true }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30000 });
  await page.getByLabel("New source filename").fill("draft.h");
  await page.getByRole("button", { name: "Add file", exact: true }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.type("// keep until confirmed");
  await page.keyboard.press("Control+a");
  await expect(page.locator(".monaco-editor")).toContainText(
    "keep until confirmed",
  );
  await page.getByRole("tab", { name: "Hardware", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "all editor source files",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  expect((await exported(page, true)).files).toHaveLength(2);
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page
    .getByRole("button", { name: "Start new project", exact: true })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  const fresh = await exported(page, true);
  expect(fresh.circuit.components).toEqual([]);
  expect(fresh.circuit.wires).toEqual([]);
  expect(fresh.files).toHaveLength(1);
  expect(fresh.files[0].content).toContain("void setup()");
  expect(fresh.files[0].content).not.toContain("keep until confirmed");
  await page
    .getByRole("button", { name: "Arduino Uno", exact: false })
    .first()
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
});

test("keyboard group movement is serialized and undone as one operation", async ({
  page,
}) => {
  await page.goto("/");
  const before = await exported(page);
  await rectangle(page, ["resistor-1", "led-1"]);
  await expect(page.getByTestId("selection-count")).toContainText(
    "2 components",
  );
  await page.locator('.react-flow__node[data-id="resistor-1"]').focus();
  await page.keyboard.press("ArrowRight");
  const moved = await exported(page);
  const r = before.components.find((c: any) => c.id === "resistor-1"),
    m = moved.components.find((c: any) => c.id === "resistor-1");
  expect(m.position.x).toBeGreaterThan(r.position.x);
  const l = before.components.find((c: any) => c.id === "led-1"),
    n = moved.components.find((c: any) => c.id === "led-1");
  expect(n.position.x - l.position.x).toBe(m.position.x - r.position.x);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await exported(page)).components).toEqual(before.components);
});
