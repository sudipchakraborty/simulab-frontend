import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SerialMonitor } from "./SerialMonitor";
import type { SimulationController } from "../simulation/useSimulation";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("denies serial exports and physical port selection without entitlement", () => {
  const requestPort = vi.fn();
  Object.defineProperty(navigator, "serial", {
    value: { requestPort },
    configurable: true,
  });
  render(
    <SerialMonitor
      simulation={
        {
          status: "running",
          serial: "private",
          clearSerial: () => {},
          sendUART: vi.fn(),
        } as unknown as SimulationController
      }
      canSave={false}
      canRun={true}
      canUpload={false}
    />,
  );
  expect(screen.getByText("Export serial log").hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent.change(screen.getByLabelText("Connection"), {
    target: { value: "physical" },
  });
  fireEvent.click(screen.getByText("Select USB serial port"));
  expect(requestPort).not.toHaveBeenCalled();
  expect(screen.getByText("Send serial input").hasAttribute("disabled")).toBe(
    true,
  );
});
