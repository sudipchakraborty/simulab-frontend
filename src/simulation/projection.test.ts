import { describe, it, expect } from "vitest";
import { projectSignals } from "./projection";
import { createSampleProject } from "../circuit/project";
import { createComponent } from "../circuit/catalog";
import { connect, splitWire } from "../circuit/editing";
import type { CircuitProject } from "../circuit/types";
const sample = () => createSampleProject();
describe("digital circuit signal projection", () => {
  it("lights the sample LED only from the connected GPIO through the resistor", () => {
    const p = sample();
    expect(projectSignals(p, { D13: 1 }).ledStates["led-1"]).toBe(true);
    expect(projectSignals(p, { D13: 0 }).ledStates["led-1"]).toBe(false);
    expect(projectSignals(p, { D12: 1, D13: null }).ledStates["led-1"]).toBe(
      null,
    );
  });
  it("does not mutate the circuit or the GPIO snapshot", () => {
    const p = sample();
    const gpio = { D13: 1 as const };
    const before = JSON.stringify(p);
    projectSignals(p, gpio);
    expect(JSON.stringify(p)).toBe(before);
    expect(gpio).toEqual({ D13: 1 });
  });
  it("supports a different actual output pin rather than recognizing blink patterns", () => {
    const p = sample();
    p.wires[0].from.pinId = "D12";
    expect(projectSignals(p, { D12: 1, D13: 0 }).ledStates["led-1"]).toBe(true);
    expect(projectSignals(p, { D12: 0, D13: 1 }).ledStates["led-1"]).toBe(
      false,
    );
  });
  it("preserves explicit junction branches and ignores their drawing location", () => {
    let p = sample();
    p = splitWire(p, p.wires[0].id, { x: 400, y: 400 });
    const j = p.components.find((c) => c.kind === "junction")!;
    const extra = createComponent("led", { x: 400, y: 400 });
    p = { ...p, components: [...p.components, extra] };
    p = connect(
      p,
      { componentId: j.id, pinId: "J" },
      { componentId: extra.id, pinId: "A" },
    );
    p = connect(
      p,
      { componentId: extra.id, pinId: "K" },
      { componentId: "uno-1", pinId: "GND" },
    );
    const result = projectSignals(p, { D13: 1 });
    expect(result.ledStates["led-1"]).toBe(true);
    expect(result.ledStates[extra.id]).toBe(true);
  });
  it("keeps visually crossing but electrically distinct wires separate", () => {
    const p = sample();
    p.components.forEach((c) => (c.position = { x: 0, y: 0 }));
    p.wires[0].from.pinId = "D12";
    expect(projectSignals(p, { D13: 1, D12: null }).ledStates["led-1"]).toBe(
      null,
    );
  });
  it("marks opposing outputs as unknown rather than guessing a driver", () => {
    let p = sample();
    p = connect(
      p,
      { componentId: "uno-1", pinId: "D12" },
      { componentId: "resistor-1", pinId: "1" },
    );
    const result = projectSignals(p, { D13: 1, D12: 0 });
    expect(result.ledStates["led-1"]).toBe(null);
    expect(result.issues.join(" ")).toMatch(/conflict/i);
  });
  it("detects direct power-to-ground shorts and refuses affected LED output", () => {
    let p = sample();
    p = connect(
      p,
      { componentId: "uno-1", pinId: "5V" },
      { componentId: "uno-1", pinId: "GND" },
    );
    const result = projectSignals(p, { D13: 1 });
    expect(result.issues.join(" ")).toMatch(/conflict|short/i);
    expect(result.ledStates["led-1"]).toBe(null);
  });
  it("accepts an explicit 5V rail and preserves LED polarity", () => {
    const p = sample();
    p.wires[0].from.pinId = "5V";
    expect(projectSignals(p, {}).ledStates["led-1"]).toBe(true);
    const led = p.components.find((c) => c.id === "led-1")!;
    void led;
    for (const w of p.wires) {
      for (const e of [w.from, w.to])
        if (e.componentId === "led-1") e.pinId = e.pinId === "A" ? "K" : "A";
    }
    expect(projectSignals(p, {}).ledStates["led-1"]).toBe(false);
  });
  it("does not invent a value for unsupported voltage rails", () => {
    const p = sample();
    p.wires[0].from.pinId = "3V3";
    expect(projectSignals(p, {}).ledStates["led-1"]).toBe(null);
  });
  it.each([0, -1, NaN, Infinity, "220"])(
    "opens invalid resistor values: %s",
    (resistance) => {
      const p = sample();
      p.components.find(
        (c) => c.kind === "resistor",
      )!.properties.resistanceOhms = resistance;
      const r = projectSignals(p, { D13: 1 });
      expect(r.ledStates["led-1"]).toBe(null);
      expect(r.issues.join(" ")).toMatch(/resistor/i);
    },
  );
  it("uses default resistor resistance if the property is absent", () => {
    const p = sample();
    delete p.components.find((c) => c.kind === "resistor")!.properties
      .resistanceOhms;
    expect(projectSignals(p, { D13: 1 }).ledStates["led-1"]).toBe(true);
  });
  it("only bridges a switch when its pressed metadata is exactly true", () => {
    const p = sample();
    p.wires = p.wires.filter((w) => w.from.componentId !== "switch-1");
    p.wires[0].to = { componentId: "switch-1", pinId: "1" };
    p.wires.push({
      id: "bridge",
      from: { componentId: "switch-1", pinId: "2" },
      to: { componentId: "resistor-1", pinId: "1" },
      color: "#000000",
      label: "",
    });
    expect(projectSignals(p, { D13: 1 }).ledStates["led-1"]).toBe(null);
    p.components.find((c) => c.kind === "switch")!.properties.pressed = true;
    expect(projectSignals(p, { D13: 1 }).ledStates["led-1"]).toBe(true);
  });
  it("rejects multiple boards without sharing GPIO names across instances", () => {
    const p = sample();
    p.components.push(createComponent("uno", { x: 0, y: 0 }));
    const r = projectSignals(p, { D13: 1 });
    expect(r.ledStates["led-1"]).toBe(null);
    expect(r.issues.join(" ")).toMatch(/one.*Uno/i);
  });
  it("handles an empty circuit without inventing LEDs or nets", () => {
    const p: CircuitProject = {
      schemaVersion: "1.0.0",
      name: "Empty",
      components: [],
      wires: [],
    };
    expect(projectSignals(p, {}).ledStates).toEqual({});
  });
});
