import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
test("Hardware Run compiles the current editor source, attaches real firmware, and supports Pause/Resume/Stop", async ({
  page,
}) => {
  test.skip(
    !process.env.SIMULAB_TEST_TOKEN,
    "Requires explicitly paired genuine local Arduino CLI companion",
  );
  test.setTimeout(180000);
  await page.route("**/system-config.json", (r) =>
    r.fulfill({ json: { loginEnabled: false } }),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let compiled: any;
  page.on("request", (r) => {
    if (r.url().endsWith(":4317/compile")) compiled = r.postDataJSON();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pair local compiler", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Code Editor", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("Companion token")
    .fill(process.env.SIMULAB_TEST_TOKEN!);
  await page
    .getByRole("button", { name: "Connect companion", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Build", exact: true }),
  ).toBeEnabled({ timeout: 10000 });
  const source =
    'void setup(){pinMode(13,OUTPUT);Serial.begin(9600);}\nvoid loop(){digitalWrite(13,HIGH);Serial.println("DESIGN_RUN_CURRENT_SOURCE");delay(100);digitalWrite(13,LOW);delay(100);}\n';
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30000 });
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(source);
  await page.getByLabel("Build board").selectOption("nano");
  await page.getByRole("tab", { name: "Hardware", exact: true }).click();
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running", {
    timeout: 150000,
  });
  expect(compiled.board).toBe("uno");
  expect(compiled.files[0].content).toContain("DESIGN_RUN_CURRENT_SOURCE");
  await page
    .getByRole("button", { name: "Serial monitor", exact: true })
    .click();
  await expect(page.getByTestId("serial-output")).toContainText(
    "DESIGN_RUN_CURRENT_SOURCE",
    { timeout: 15000 },
  );
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "on",
    { timeout: 10000 },
  );
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "off",
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: "Pause code execution" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("paused");
  const clock = await page.getByTestId("simulation-time").textContent();
  await page.waitForTimeout(250);
  expect(await page.getByTestId("simulation-time").textContent()).toBe(clock);
  await page.getByRole("button", { name: "Resume code execution" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running");
  await page.getByRole("button", { name: "Stop code execution" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("stopped");
  await page.screenshot({
    path: "test-results/design-current-code.png",
    fullPage: true,
  });
  // A manual file may have exactly the compiler artifact's filename; load identity must distinguish it.
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running", {
    timeout: 150000,
  });
  await page.getByLabel("Firmware HEX file").setInputFiles({
    name: "sketch.ino.hex",
    mimeType: "text/plain",
    buffer: readFileSync(
      new URL("../public/firmware/blink-uart.hex", import.meta.url),
    ),
  });
  await expect(page.getByTestId("simulation-status")).toHaveText("ready");
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Serial monitor", exact: true })
    .click();
  await expect(page.getByTestId("serial-output")).toContainText(
    "SIMULAB AVR READY",
    { timeout: 15000 },
  );
  await page.getByRole("tab", { name: "Code Editor", exact: true }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(
    "\n// source edit leaves independent manual firmware running\n",
  );
  await page.getByRole("tab", { name: "Hardware", exact: true }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("running");

  await page.getByRole("tab", { name: "Code Editor", exact: true }).click();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText("void setup( { invalid code");
  await page.getByRole("tab", { name: "Hardware", exact: true }).click();
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.getByTestId("design-build-output")).toContainText(
    "error:",
    { timeout: 150000 },
  );
  await expect(
    page.getByRole("button", { name: "Run code", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("simulation-status")).toHaveText("stopped");
  expect(errors).toEqual([]);
});
