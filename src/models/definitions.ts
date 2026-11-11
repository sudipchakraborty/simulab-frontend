import type { ComponentDefinition } from "../circuit/types";
const pins = (names: string[]) =>
  names.map((id) => ({
    id,
    label: id,
    electricalType: ["VCC", "VDD", "VM"].includes(id)
      ? "power-input"
      : id === "GND"
        ? "ground-input"
        : "bidirectional",
  }));
/** @brief Portable library definitions; defaults are behavioral parameters, not firmware substitutes. */
export const deviceDefinitions: Record<string, ComponentDefinition> = {
  ds3231: {
    name: "DS3231 RTC",
    description: "I2C RTC with BCD calendar, alarms and simulation-clock time",
    pins: pins(["VCC", "GND", "SDA", "SCL", "SQW", "32K"]),
    defaultProperties: { address: 104, epoch: "2026-01-01T00:00:00Z" },
  },
  mux4067: {
    name: "16-channel multiplexer",
    description:
      "HC / B profiles; ideal bidirectional contacts with switching delay",
    pins: pins([
      "VCC",
      "GND",
      "S0",
      "S1",
      "S2",
      "S3",
      "COM",
      "EN",
      ...Array.from({ length: 16 }, (_, i) => `C${i}`),
    ]),
    defaultProperties: { variant: "HC" },
  },
  "dc-motor": {
    name: "DC brushed motor",
    description:
      "Approximate winding, back-EMF, inertia and load; requires powered driver",
    pins: pins(["POS", "NEG"]),
    defaultProperties: {
      ratedVoltage: 6,
      ratedRpm: 6000,
      resistance: 3,
      inertia: 0.00001,
      load: 0,
      stalled: false,
    },
  },
  ws2812: {
    name: "WS2812B RGB LED / strip",
    description:
      "GRB timed-edge decoding; Uno only until S3 edge callbacks exist",
    pins: pins(["VDD", "GND", "DIN", "DOUT"]),
    defaultProperties: { count: 1, brightness: 1 },
  },
  relay: {
    name: "5V relay module",
    description: "Powered driver module with isolated COM/NO/NC contacts",
    pins: pins(["VCC", "GND", "IN", "COM", "NO", "NC"]),
    defaultProperties: {
      activeLow: true,
      logic3v3: false,
      delayUs: 10000,
      ratingV: 30,
      ratingA: 10,
    },
  },
  "h-bridge": {
    name: "Ideal H-bridge driver",
    description:
      "Powered bidirectional motor driver; duty follows actual enable signal",
    pins: pins(["VM", "VCC", "GND", "IN1", "IN2", "EN", "OUT1", "OUT2"]),
    defaultProperties: { maxCurrentA: 3 },
  },
};
