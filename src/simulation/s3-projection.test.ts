import { describe, it, expect } from "vitest";
import { projectSignals } from "./projection";
import { createComponent } from "../circuit/catalog";
import type { CircuitProject } from "../circuit/types";
function setup() {
  const b = { ...createComponent("yd-esp32-s3", { x: 0, y: 0 }), id: "yd" };
  const led = { ...createComponent("led", { x: 0, y: 0 }), id: "led" };
  const r = { ...createComponent("resistor", { x: 0, y: 0 }), id: "r" };
  const p: CircuitProject = {
    schemaVersion: "1.1.0",
    name: "S3",
    components: [b, led, r],
    wires: [
      {
        id: "a",
        from: { componentId: "yd", pinId: "P1.4" },
        to: { componentId: "r", pinId: "1" },
        color: "#00aa88",
        label: "",
      },
      {
        id: "b",
        from: { componentId: "r", pinId: "2" },
        to: { componentId: "led", pinId: "A" },
        color: "#00aa88",
        label: "",
      },
      {
        id: "c",
        from: { componentId: "led", pinId: "K" },
        to: { componentId: "yd", pinId: "P2.22" },
        color: "#00aa88",
        label: "",
      },
    ],
  };
  return p;
}
describe("S3 native GPIO projection", () => {
  it("mapsGPIO4 to physicalP1.4 through resistor and repeated GND pads", () => {
    expect(projectSignals(setup(), { GPIO4: 1 }).ledStates.led).toBe(true);
    expect(projectSignals(setup(), { GPIO4: 0 }).ledStates.led).toBe(false);
  });
  it("never interprets AVR names as S3 outputs", () => {
    expect(projectSignals(setup(), { D4: 1, D13: 1 }).ledStates.led).toBeNull();
  });
  it("does not expose reserved octal-memory GPIO as a generic LED drive", () => {
    const p = setup();
    p.wires[0].from.pinId = "P2.13";
    p.components[0].properties.memoryVariant = "N16R8";
    const s = projectSignals(p, { GPIO35: 1 });
    expect(s.ledStates.led).toBeNull();
    expect(s.issues.join(" ")).toContain("reserved");
  });
});
