import { test, expect } from "./fixtures";
for (const kind of ["nano", "mega2560"] as const) {
  test(`${kind} executes genuine target firmware in its AVR Worker`, async ({
    page,
  }) => {
    await page.goto("/");
    const board = {
      kind,
      id: "native",
      label: kind,
      position: { x: 0, y: 0 },
      rotation: 0,
      properties: { clockHz: 16000000 },
    };
    await page.getByLabel("Import circuit JSON").setInputFiles({
      name: "native.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schemaVersion: "1.3.0",
          name: `Native ${kind}`,
          components: [board],
          wires: [],
        }),
      ),
    });
    await expect(page.getByTestId("part-native")).toBeVisible();
    await page
      .getByRole("button", { name: "Load AVR sample", exact: true })
      .click();
    await expect(page.getByTestId("simulation-status")).toHaveText("ready");
    await page
      .getByRole("button", { name: "Start simulation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Serial monitor", exact: true })
      .click();
    await expect(page.getByTestId("serial-output")).toContainText(
      kind === "mega2560" ? "MEGA2560 REAL UART" : "SIMULAB AVR READY",
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: "Pause simulation" }).click();
    try {
      await expect(page.getByTestId("simulation-status")).toHaveText("paused", {
        timeout: 2000,
      });
    } catch (error) {
      throw new Error(
        String(error) +
          "\nExecution details: " +
          (await page.locator(".simulation-controls").innerText()),
      );
    }
    await page.getByRole("tab", { name: "Debugger", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Step instruction", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Step instruction", exact: true })
      .click();
    await expect(page.getByText("PC byte:", { exact: false })).toBeVisible();
    await page.screenshot({
      path: `test-results/native-${kind}.png`,
      fullPage: true,
    });
  });
}
