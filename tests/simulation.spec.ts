import { test, expect, type Page } from "./fixtures";
import { readFileSync } from "node:fs";
const fixture = (name: string) =>
  readFileSync(new URL(`../public/firmware/${name}.hex`, import.meta.url));
async function upload(page: Page, name: string) {
  await page.getByLabel("Firmware HEX file").setInputFiles({
    name: `${name}.hex`,
    mimeType: "text/plain",
    buffer: fixture(name),
  });
  await expect(page.getByTestId("simulation-status")).toHaveText("ready");
}
async function exportProject(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export project" }).click();
  const stream = await (await download).createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  return JSON.parse(text);
}
test("real compiled firmware drives LED and UART with pause, reset and stop controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Load AVR sample" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("ready");
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running");
  await page.getByRole("button", { name: "Serial monitor" }).click();
  await expect(page.getByTestId("serial-output")).toContainText(
    "SIMULAB AVR READY",
    { timeout: 15000 },
  );
  await expect(page.getByTestId("part-uno-1")).toBeVisible();
  await expect(page.getByTestId("part-led-1")).toBeVisible();
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "on",
    { timeout: 15000 },
  );
  await expect(page.getByTestId("serial-output")).toContainText("LED ON");
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "off",
    { timeout: 15000 },
  );
  await expect(page.getByTestId("serial-output")).toContainText("LED OFF");
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("paused");
  const paused = await page.getByTestId("simulation-time").textContent();
  await page.waitForTimeout(400);
  expect(await page.getByTestId("simulation-time").textContent()).toBe(paused);
  await page.getByRole("button", { name: "Resume simulation" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running");
  await expect(page.getByTestId("simulation-time")).not.toHaveText(paused!);
  await page.getByRole("button", { name: "Stop simulation" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("stopped");
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("ready");
  await expect(page.getByTestId("simulation-time")).toHaveText("0.000 s");
  await expect(page.getByTestId("serial-output")).not.toContainText(
    "SIMULAB AVR READY",
  );
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await expect(page.getByTestId("serial-output")).toContainText(
    "SIMULAB AVR READY",
    { timeout: 15000 },
  );
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/phase2-avr-running.png",
    fullPage: true,
  });
});
test("different compiled pin output only lights a correctly rewired LED", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "alternate-d12");
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Serial monitor" }).click();
  await expect(page.getByTestId("serial-output")).toContainText("LED ON", {
    timeout: 15000,
  });
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "unknown",
  );
  const project = await exportProject(page);
  const driver = project.wires.find(
    (w: any) => w.from.componentId === "uno-1" && w.from.pinId === "D13",
  );
  driver.from.pinId = "D12";
  await page.getByLabel("Import circuit JSON").setInputFiles({
    name: "d12.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByTestId("simulation-status")).toHaveText("idle");
  await upload(page, "alternate-d12");
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "on",
    { timeout: 15000 },
  );
});
test("malformed HEX produces an explicit error without fake execution", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Firmware HEX file").setInputFiles({
    name: "bad.hex",
    mimeType: "text/plain",
    buffer: Buffer.from(":02000000000000\n:00000001FF"),
  });
  await expect(page.getByTestId("simulation-status")).toHaveText("error");
  await expect(page.getByRole("alert")).toContainText("checksum");
  await expect(
    page.getByRole("button", { name: "Start simulation", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("simulation-time")).toHaveText("0.000 s");
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "unknown",
  );
});
