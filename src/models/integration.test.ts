import { expect, it } from "vitest";
import { catalog, createComponent } from "../circuit/catalog";
import { parseProject, serializeProject } from "../circuit/project";
import { CircuitRuntime } from "./circuitRuntime";
import type { CircuitProject, ComponentKind } from "../circuit/types";
it.each(["D3", "A0"])(
  "refuses direct motor power from digital-capable MCU pin %s",
  (pin) => {
    const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
      motor = { ...createComponent("dc-motor", { x: 0, y: 0 }), id: "motor" };
    const p: CircuitProject = {
      schemaVersion: "1.2.0",
      name: "unsafe motor",
      components: [uno, motor],
      wires: [
        [pin, "POS"],
        ["GND", "NEG"],
      ].map(([a, b], i) => ({
        id: `w${i}`,
        from: { componentId: "uno", pinId: a },
        to: { componentId: "motor", pinId: b },
        color: "#000000",
        label: "",
      })),
    };
    const s = new CircuitRuntime(p, "uno").advance(1e6, { [pin]: 1 });
    expect(s.motor.values.rpm).toBe(0);
    expect(s.motor.warnings.join()).toMatch(/GPIO/);
  },
);
it("serializes all device kinds and advances a wired powered RTC", () => {
  const kinds = [
    "ds3231",
    "mux4067",
    "dc-motor",
    "ws2812",
    "relay",
    "h-bridge",
  ] as ComponentKind[];
  for (const k of kinds) expect(catalog[k]).toBeDefined();
  const board = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" };
  const rtc = { ...createComponent("ds3231", { x: 400, y: 0 }), id: "rtc" };
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "devices",
    components: [board, rtc],
    wires: [
      ["5V", "VCC"],
      ["GND", "GND"],
      ["A4", "SDA"],
      ["A5", "SCL"],
    ].map(([a, b], i) => ({
      id: `w${i}`,
      from: { componentId: "uno", pinId: a },
      to: { componentId: "rtc", pinId: b },
      color: "#000000",
      label: "",
    })),
  };
  const parsed = parseProject(serializeProject(p)),
    runtime = new CircuitRuntime(parsed, "uno");
  runtime.advance(0, {});
  expect(runtime.i2cWrite(0x68, [0])).toBe(true);
  expect(runtime.i2cRead(0x68, 1)).toEqual([0]);
  const s = runtime.advance(1e6, {});
  expect(s.rtc.values.iso).toBe("2026-01-01T00:00:01.000Z");
});
it("does not attach an unpowered or unwired RTC", () => {
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "unwired",
    components: [createComponent("ds3231", { x: 0, y: 0 })],
    wires: [],
  };
  const r = new CircuitRuntime(p, "uno");
  r.advance(0, {});
  expect(r.i2cWrite(0x68, [0])).toBe(false);
});
it("accepts a caller-supplied model factory without coupling the model to the MCU engine", () => {
  const c = { ...createComponent("relay", { x: 0, y: 0 }), id: "plug-in" };
  const r = new CircuitRuntime(
    { schemaVersion: "1.2.0", name: "extension", components: [c], wires: [] },
    "uno",
    {
      relay: () => ({
        update: (time) => ({
          values: { time },
          outputs: {},
          contacts: [["COM", "NO"]],
          warnings: [],
        }),
      }),
    },
  );
  expect(r.advance(123, {})["plug-in"].values.time).toBe(123);
});
it("propagates analog rail voltages bidirectionally through selected mux contacts", () => {
  const board = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
    mux = { ...createComponent("mux4067", { x: 0, y: 0 }), id: "mux" };
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "mux routing",
    components: [board, mux],
    wires: [
      ["5V", "VCC"],
      ["GND", "GND"],
      ["GND", "EN"],
      ["GND", "S0"],
      ["GND", "S1"],
      ["GND", "S2"],
      ["GND", "S3"],
      ["3V3", "COM"],
    ].map(([a, b], i) => ({
      id: `w${i}`,
      from: { componentId: "uno", pinId: a },
      to: { componentId: "mux", pinId: b },
      color: "#000000",
      label: "",
    })),
  };
  const r = new CircuitRuntime(p, "uno");
  r.advance(0, {});
  r.advance(1, {});
  expect(r.pinVoltage("mux", "C0")).toBe(3.3);
  expect(r.pinVoltage("mux", "C1")).toBe(null);
});
it("returns resolved digital MCU input levels from a routed external source", () => {
  const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
    relay = { ...createComponent("relay", { x: 0, y: 0 }), id: "relay" };
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "relay input",
    components: [uno, relay],
    wires: [
      ["5V", "COM"],
      ["D2", "NC"],
    ].map(([a, b], i) => ({
      id: `w${i}`,
      from: { componentId: "uno", pinId: a },
      to: { componentId: "relay", pinId: b },
      color: "#000000",
      label: "",
    })),
  };
  const r = new CircuitRuntime(p, "uno");
  r.advance(0, {});
  expect(r.inputLevels().D2).toBe(1);
});
it.each(["unpowered", "shorted"])(
  "blocks invalid downstream WS2812 data: %s",
  (fault) => {
    const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
      a = { ...createComponent("ws2812", { x: 0, y: 0 }), id: "a" },
      b = { ...createComponent("ws2812", { x: 0, y: 0 }), id: "b" };
    const p: CircuitProject = {
      schemaVersion: "1.2.0",
      name: "chain power",
      components: [uno, a, b],
      wires: [
        ["uno", "D8", "a", "DIN"],
        ["a", "DOUT", "b", "DIN"],
        ["uno", "5V", "b", "VDD"],
        ["uno", "GND", "b", "GND"],
      ].map(([c, a, d, b], i) => ({
        id: `w${i}`,
        from: { componentId: c, pinId: a },
        to: { componentId: d, pinId: b },
        color: "#000000",
        label: "",
      })),
    };
    if (fault === "shorted")
      for (const [pin, target] of [
        ["5V", "VDD"],
        ["GND", "GND"],
        ["D9", "DIN"],
      ])
        p.wires.push({
          id: `fault-${target}`,
          from: { componentId: "uno", pinId: pin },
          to: { componentId: "a", pinId: target },
          color: "#000000",
          label: "",
        });
    const r = new CircuitRuntime(p, "uno");
    r.advance(0, { D9: 0 });
    let cycle = 1600;
    const edges: { pin: string; level: 0 | 1; cycle: number }[] = [];
    for (const byte of [0, 255, 0, 0, 0, 255])
      for (let bit = 7; bit >= 0; bit--) {
        edges.push(
          { pin: "D8", level: 1, cycle },
          { pin: "D8", level: 0, cycle: cycle + ((byte >> bit) & 1 ? 12 : 6) },
        );
        cycle += 20;
      }
    const s = r.advance(cycle / 16 + 300, { D8: 0, D9: 0 }, edges);
    expect(s.b.values.colors).toBe("#000000");
  },
);
