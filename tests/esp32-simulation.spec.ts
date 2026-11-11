import { test, expect } from "./fixtures";
test("official ESP32-S3 WASM boots real firmware, drives circuit LED, and reads wired button", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  const avrRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("avr.worker")) avrRequests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open YD GPIO4 example" }).click();
  await expect(
    page.getByTestId("part-yd-1").locator(".react-flow__handle"),
  ).toHaveCount(44);
  await expect(
    page.getByText("ESP32-S3 / Xtensa LX7", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load ESP32-S3 reference" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("ready", {
    timeout: 20000,
  });
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Serial monitor", exact: true })
    .click();
  const uart = page.getByTestId("serial-output");
  await expect(uart).toContainText("ESP-ROM:esp32s3", { timeout: 30000 });
  await expect(uart).toContainText("MicroPython v1.29.0", { timeout: 30000 });
  await expect(page.getByTestId("simulation-time")).not.toHaveText("0.000 s");
  await page.getByRole("button", { name: "Send GPIO4 blink program" }).click();
  await expect(uart).toContainText("BLINK=1", { timeout: 30000 });
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "on",
    { timeout: 30000 },
  );
  await expect(page.getByTestId("part-led-1")).toBeVisible();
  await expect(uart).toContainText("BLINK=0", { timeout: 30000 });
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "off",
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "Send GPIO5 button monitor" }).click();
  await expect(uart).toContainText("BUTTON=1", { timeout: 30000 });
  const button = page.getByRole("button", {
    name: "Press button SW1",
    exact: true,
  });
  await button.hover();
  await page.mouse.down();
  await expect(uart).toContainText("BUTTON=0", { timeout: 30000 });
  const priorHighCount = ((await uart.textContent()) ?? "").split(
    "BUTTON=1",
  ).length;
  await page.mouse.up();
  await expect
    .poll(
      async () => ((await uart.textContent()) ?? "").split("BUTTON=1").length,
      { timeout: 30000 },
    )
    .toBeGreaterThan(priorHighCount);
  await page
    .getByLabel("UART command",{exact:true})
    .fill("button=Pin(0,Pin.IN,Pin.PULL_UP); print('BOOT_MONITOR_READY')");
  await page
    .getByRole("button", { name: "Send UART command", exact: true })
    .click();
  await expect(uart).toContainText("BOOT_MONITOR_READY");
  const priorLow = ((await uart.textContent()) ?? "").split("BUTTON=0").length;
  await page
    .getByRole("button", { name: "Hold ESP32-S3 BOOT", exact: true })
    .hover();
  await page.mouse.down();
  await expect
    .poll(
      async () => ((await uart.textContent()) ?? "").split("BUTTON=0").length,
      { timeout: 30000 },
    )
    .toBeGreaterThan(priorLow);
  const priorBootHigh = ((await uart.textContent()) ?? "").split(
    "BUTTON=1",
  ).length;
  await page.mouse.up();
  await expect
    .poll(
      async () => ((await uart.textContent()) ?? "").split("BUTTON=1").length,
      { timeout: 30000 },
    )
    .toBeGreaterThan(priorBootHigh);
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("paused");
  const time = await page.getByTestId("simulation-time").textContent();
  await page.waitForTimeout(300);
  expect(await page.getByTestId("simulation-time").textContent()).toBe(time);
  await page.getByRole("button", { name: "GPIO states", exact: true }).click();
  await expect(page.getByTestId("gpio-GPIO4")).toBeVisible();
  await page.screenshot({
    path: "test-results/esp32-s3-running.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset ESP32-S3" }).click();
  await expect(page.getByTestId("simulation-status")).toHaveText("ready");
  await expect(page.getByTestId("simulation-time")).toHaveText("0.000 s");
  expect(avrRequests).toEqual([]);
  expect(errors).toEqual([]);
});
test("S3 refuses AVR HEX rather than substituting another MCU", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open YD GPIO4 example" }).click();
  await page.getByLabel("Firmware merged flash file").setInputFiles({
    name: "avr.hex",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(":00000001FF"),
  });
  await expect(page.getByTestId("simulation-status")).toHaveText("error", {
    timeout: 15000,
  });
  await expect(page.getByRole("alert")).toContainText("merged");
  await expect(
    page.getByRole("button", { name: "Start simulation", exact: true }),
  ).toBeDisabled();
});
