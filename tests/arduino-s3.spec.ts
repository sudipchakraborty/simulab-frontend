import { test, expect } from "./fixtures";
test("actual Arduino CLI S3 image drives browser UART and wired GPIO4 LED", async ({
  page,
}) => {
  test.skip(
    !process.env.SIMULAB_S3_IMAGE,
    "Requires the actual compiled Arduino S3 merged image",
  );
  test.setTimeout(90000);
  const errors: string[] = [],
    avr: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("avr.worker")) avr.push(r.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open YD GPIO4 example", exact: true })
    .click();
  await page
    .getByLabel("Firmware merged flash file")
    .setInputFiles(process.env.SIMULAB_S3_IMAGE!);
  await expect(page.getByTestId("simulation-status")).toHaveText("ready", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Start simulation", exact: true })
    .click();
  await page.getByRole("tab", { name: "Serial Monitor", exact: true }).click();
  await expect(page.getByTestId("ide-serial-output")).toContainText(
    "SIMULAB COMPILED S3",
    { timeout: 45000 },
  );
  await page.getByRole("tab", { name: "Hardware", exact: true }).click();
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "on",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("part-led-1")).toHaveAttribute(
    "data-led-state",
    "off",
    { timeout: 45000 },
  );
  expect(errors).toEqual([]);
  expect(avr).toEqual([]);
  await page.screenshot({ path: "test-results/arduino-s3-running.png" });
});
