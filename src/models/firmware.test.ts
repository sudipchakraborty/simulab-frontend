import hex from "./fixtures/peripherals.hex?raw";
import inputHex from "../../public/firmware/input-mirror.hex?raw";
import dynamicHex from "./fixtures/dynamic-mux.hex?raw";
import { expect, it } from "vitest";
import { UnoRuntime } from "@simulab/engine";
import { CircuitRuntime } from "./circuitRuntime";
import { createComponent } from "../circuit/catalog";
import type { CircuitProject } from "../circuit/types";
it("real AVR TWI instructions read BCD seconds from the actual wired DS3231 model", () => {
  const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
    rtc = {
      ...createComponent("ds3231", { x: 400, y: 0 }),
      id: "rtc",
      properties: { address: 104, epoch: "2026-01-01T00:00:07Z" },
    };
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "RTC firmware",
    components: [uno, rtc],
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
  const model = new CircuitRuntime(p, "uno");
  model.advance(0, {});
  const cpu = new UnoRuntime(hex, {
    i2c: {
      write: (a, b) => model.i2cWrite(a, b),
      read: (a, n) => model.i2cRead(a, n),
    },
  });
  cpu.start();
  let serial = "";
  for (let i = 0; i < 3; i++) {
    const s = cpu.runCycles(160000);
    model.advance(s.timeMicros, s.gpio, s.transitions);
    serial += s.serial;
  }
  expect(serial.charCodeAt(0)).toBe(7);
});
it("real AVR firmware receives voltage routed through a powered mux without manual pin injection", () => {
  const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
    mux = { ...createComponent("mux4067", { x: 0, y: 0 }), id: "mux" };
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "mux firmware",
    components: [uno, mux],
    wires: [
      ["5V", "VCC"],
      ["GND", "GND"],
      ["GND", "EN"],
      ["GND", "S0"],
      ["GND", "S1"],
      ["GND", "S2"],
      ["GND", "S3"],
      ["5V", "C0"],
      ["D2", "COM"],
    ].map(([a, b], i) => ({
      id: `w${i}`,
      from: { componentId: "uno", pinId: a },
      to: { componentId: "mux", pinId: b },
      color: "#000000",
      label: "",
    })),
  };
  const model = new CircuitRuntime(p, "uno");
  model.advance(0, {});
  const cpu = new UnoRuntime(inputHex, {
    onGpioTransition: (event, gpio) => {
      model.advance(event.cycle / 16, gpio, [event]);
      for (const [pin, level] of Object.entries(model.inputLevels()))
        if (gpio[pin] === null) cpu.setPinLevel(pin, level);
    },
  });
  cpu.start();
  const s = cpu.runCycles(160000);
  expect(s.gpio.D11).toBe(1);
});
it("settles a changed mux channel before real firmware reads its input after five microseconds", () => {
  const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" },
    mux = { ...createComponent("mux4067", { x: 0, y: 0 }), id: "mux" };
  const p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "dynamic mux",
    components: [uno, mux],
    wires: [
      ["5V", "VCC"],
      ["GND", "GND"],
      ["GND", "EN"],
      ["D8", "S0"],
      ["GND", "S1"],
      ["GND", "S2"],
      ["GND", "S3"],
      ["GND", "C0"],
      ["5V", "C1"],
      ["D2", "COM"],
    ].map(([a, b], i) => ({
      id: `w${i}`,
      from: { componentId: "uno", pinId: a },
      to: { componentId: "mux", pinId: b },
      color: "#000000",
      label: "",
    })),
  };
  const model = new CircuitRuntime(p, "uno");
  model.advance(0, {});
  const apply = (gpio: Record<string, 0 | 1 | null>) => {
    for (const [pin, v] of Object.entries(model.inputLevels()))
      if (gpio[pin] === null) cpu.setPinLevel(pin, v);
  };
  const cpu = new UnoRuntime(dynamicHex, {
    onGpioTransition: (e, gpio) => {
      model.advance(e.cycle / 16, gpio, [e]);
      apply(gpio);
    },
    onBeforeInputRead: (timeUs: number, gpio: Record<string, 0 | 1 | null>) => {
      model.advance(timeUs, gpio);
      apply(gpio);
    },
  });
  cpu.start();
  expect(cpu.runCycles(160000).gpio.D11).toBe(1);
});
