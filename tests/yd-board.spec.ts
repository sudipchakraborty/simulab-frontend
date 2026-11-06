import { test, expect } from "@playwright/test";
const board = {
  id: "yd-1",
  kind: "yd-esp32-s3",
  label: "YD1",
  position: { x: 0, y: 0 },
  rotation: 0,
  properties: { memoryVariant: "unconfirmed", boardRevision: "2022-V1.3" },
};
const fixture = {
  schemaVersion: "1.1.0",
  name: "YD header validation",
  components: [
    board,
    {
      id: "led-test",
      kind: "led",
      label: "LED",
      position: { x: 430, y: 120 },
      rotation: 0,
      properties: { color: "#ef6461" },
    },
    {
      id: "r-test",
      kind: "resistor",
      label: "R",
      position: { x: 430, y: 350 },
      rotation: 0,
      properties: { resistanceOhms: 220 },
    },
  ],
  wires: [],
};
test("YD44 physical headers connect, rotate and roundtrip without changingGPIOidentity", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /YD-ESP32-S3-2022-V1.3/ }),
  ).toBeVisible();
  await page.getByLabel("Import circuit JSON").setInputFiles({
    name: "yd.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  const part = page.getByTestId("part-yd-1");
  await expect(part).toBeVisible();
  await expect(part.locator(".react-flow__handle")).toHaveCount(44);
  const io4 = page.getByTestId("pin-yd-1-P1.4");
  await expect(io4).toHaveAttribute("title", /GPIO4/);
  await io4.click({ force: true });
  await page.getByTestId("pin-led-test-A").click({ force: true });
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await io4.click({ force: true });
  await page.getByTestId("pin-r-test-1").click({ force: true });
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await part.click({ position: { x: 55, y: 45 } });
  await expect(
    page.getByText("Manufacturer family pinout verified.", { exact: false }),
  ).toBeVisible();
  const a = await page.getByTestId("pin-yd-1-P1.1").boundingBox();
  const b = await page.getByTestId("pin-yd-1-P2.1").boundingBox();
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  await page.getByRole("button", { name: "Rotate board clockwise" }).click();
  await expect(part).toHaveAttribute("data-board-rotation", "90");
  const top = await page.getByTestId("pin-yd-1-P1.1").boundingBox();
  const bottom = await page.getByTestId("pin-yd-1-P2.1").boundingBox();
  expect(Math.abs(top!.x - bottom!.x)).toBeLessThan(2);
  expect(bottom!.y - top!.y).toBeGreaterThan(50);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export project" }).click();
  const stream = await (await download).createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  const saved = JSON.parse(text);
  expect(saved.schemaVersion).toBe("1.1.0");
  expect(saved.components[0].rotation).toBe(90);
  expect(saved.wires[0].from).toEqual({ componentId: "yd-1", pinId: "P1.4" });
  await page.getByLabel("Import circuit JSON").setInputFiles({
    name: "yd-roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await expect(part.locator(".react-flow__handle")).toHaveCount(44);
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/yd-phase-a.png",
    fullPage: true,
  });
});
