// @vitest-environment node
// Pure CPU/protocol integration needs no DOM; keep AVR timing independent of jsdom overhead.
import hex from "./fixtures/robotics-sensors.hex?raw";
import { expect, it } from "vitest";
import { UnoRuntime } from "@simulab/engine";
import { CircuitRuntime } from "./circuitRuntime";
import { createComponent } from "../circuit/catalog";
import type { CircuitProject, ComponentKind } from "../circuit/types";
it("real AVR instructions receive HX711 signed samples and checksum-valid DHT22 frames through wired inputs", () => {
  const kinds = ["uno", "hx711", "dht22", "resistor"] as ComponentKind[],
    ids = ["u", "h", "d", "r"],
    components = kinds.map((kind, i) => ({
      ...createComponent(kind, { x: 0, y: 0 }),
      id: ids[i],
    }));
  components[1].properties.rawValue = -2;
  components[2].properties.temperatureC = -12.3;
  components[2].properties.humidityPct = 60;
  components[3].properties.resistanceOhms = 10000;
  const pairs = [
    ["u", "5V", "h", "VCC"],
    ["u", "GND", "h", "GND"],
    ["u", "D3", "h", "SCK"],
    ["u", "D2", "h", "DOUT"],
    ["u", "5V", "d", "VCC"],
    ["u", "GND", "d", "GND"],
    ["u", "D8", "d", "DATA"],
    ["u", "5V", "r", "1"],
    ["r", "2", "d", "DATA"],
  ];
  const p: CircuitProject = {
    schemaVersion: "1.3.0",
    name: "sensor firmware",
    components,
    wires: pairs.map(([a, ap, b, bp], i) => ({
      id: `w${i}`,
      from: { componentId: a, pinId: ap },
      to: { componentId: b, pinId: bp },
      color: "#000000",
      label: "",
    })),
  };
  const model = new CircuitRuntime(p, "uno");
  model.advance(0, {});
  const apply = (gpio: Record<string, 0 | 1 | null>) => {
    for (const [pin, level] of Object.entries(model.inputLevels()))
      if (gpio[pin] === null) cpu.setPinLevel(pin, level);
  };
  const cpu = new UnoRuntime(hex, {
    onGpioTransition: (e, gpio) => {
      model.advance(e.cycle / 16, gpio, [e]);
      apply(gpio);
    },
    onBeforeInputRead: (time, gpio) => {
      model.advance(time, gpio);
      apply(gpio);
    },
  });
  cpu.start();
  let serial = "";
  for (let i = 0; i < 15; i++) serial += cpu.runCycles(160000).serial;
  expect([...serial].map((c) => c.charCodeAt(0))).toEqual([
    72, 255, 255, 254, 68, 2, 88, 128, 123, 85,
  ]);
}, 20000);
