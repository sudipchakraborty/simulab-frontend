import { describe, it, expect } from "vitest";
import raw from "./yd-esp32-s3.json";
import {
  ydBoard,
  parseBoardDefinition,
  getBoardPin,
  boardPinTooltip,
  supportsGPIOOutput,
} from "./yd-esp32-s3";
describe("manufacturer-backed YD ESP32-S3 board metadata", () => {
  it("has exactly two headers of22 individually identified physical pins", () => {
    expect(ydBoard.pins).toHaveLength(44);
    expect(ydBoard.pins.filter((p) => p.side === "left")).toHaveLength(22);
    expect(ydBoard.pins.filter((p) => p.side === "right")).toHaveLength(22);
    expect(new Set(ydBoard.pins.map((p) => p.id)).size).toBe(44);
    expect(new Set(ydBoard.pins.map((p) => p.physicalNumber)).size).toBe(44);
  });
  it("keeps physical IDs separate from GPIO and Arduino aliases", () => {
    expect(getBoardPin("P1.14")).toMatchObject({
      physicalNumber: 14,
      header: "P1",
      headerIndex: 14,
      side: "left",
      label: "46",
      gpio: 46,
      arduinoPin: 46,
    });
    expect(getBoardPin("P2.2")).toMatchObject({
      label: "TX",
      gpio: 43,
      arduinoPin: 43,
    });
    expect(getBoardPin("P2.16")?.gpio).toBe(48);
    expect(getBoardPin("P1.3")).toMatchObject({
      label: "RST",
      gpio: null,
      electricalType: "input",
    });
  });
  it("matches the complete published GPIO header order", () => {
    expect(
      ydBoard.pins.filter((p) => p.header === "P1").map((p) => p.gpio),
    ).toEqual([
      null,
      null,
      null,
      4,
      5,
      6,
      7,
      15,
      16,
      17,
      18,
      8,
      3,
      46,
      9,
      10,
      11,
      12,
      13,
      14,
      null,
      null,
    ]);
    expect(
      ydBoard.pins.filter((p) => p.header === "P2").map((p) => p.gpio),
    ).toEqual([
      null,
      43,
      44,
      1,
      2,
      42,
      41,
      40,
      39,
      38,
      37,
      36,
      35,
      0,
      45,
      48,
      47,
      21,
      20,
      19,
      null,
      null,
    ]);
  });
  it("verifies family RGB/USB/BOOT data without claiming exact revision or memory", () => {
    expect(ydBoard.onboard.rgb.gpio).toBe(48);
    expect(ydBoard.onboard.boot.gpio).toBe(0);
    expect(ydBoard.verification.exactRevision).toBe("requires-confirmation");
    expect(ydBoard.memory.defaultVariant).toBe("unconfirmed");
    expect(ydBoard.memory.profiles.N16R8).toMatchObject({
      flashMB: 16,
      psramMB: 8,
      reservedGpio: [35, 36, 37],
    });
    expect(ydBoard.dimensionsMm).toEqual({ width: 27.94, height: 63.39 });
    expect(ydBoard.dimensionStatus).toBe("manufacturer-drawing-verified");
  });
  it("records analog channels, GPIO-matrix functions and strapping restrictions", () => {
    expect(getBoardPin("P2.4")?.adc).toEqual({ unit: 1, channel: 0 });
    expect(getBoardPin("P2.19")?.adc).toEqual({ unit: 2, channel: 9 });
    expect(getBoardPin("P1.13")?.restrictions).toContain("strapping");
    expect(getBoardPin("P2.15")?.restrictions).toContain("strapping");
    expect(getBoardPin("P1.14")?.restrictions).toContain("strapping");
    expect(getBoardPin("P1.14")?.restrictions).not.toContain("input-only");
  });
  it("disables octal-memory pins for N16R8 without inventing AVR register mappings", () => {
    expect(supportsGPIOOutput(getBoardPin("P2.11")!, "N16R8")).toBe(false);
    expect(supportsGPIOOutput(getBoardPin("P2.10")!, "N16R8")).toBe(true);
    expect(supportsGPIOOutput(getBoardPin("P1.1")!)).toBe(false);
    expect(boardPinTooltip(getBoardPin("P2.13")!, "N16R8")).toContain(
      "reserved",
    );
    expect(boardPinTooltip(getBoardPin("P2.2")!)).toContain("GPIO43");
    expect(JSON.stringify(raw)).not.toContain("AVR");
  });
  it("rejects invalid board shape, mappings and duplicate identifiers", () => {
    expect(() => parseBoardDefinition(null)).toThrow();
    const changed = structuredClone(raw);
    changed.pins.pop();
    expect(() => parseBoardDefinition(changed)).toThrow(/44/);
    const duplicate = structuredClone(raw);
    duplicate.pins[1].id = duplicate.pins[0].id;
    expect(() => parseBoardDefinition(duplicate)).toThrow();
    const gpio = structuredClone(raw);
    gpio.pins[3].gpio = 99;
    expect(() => parseBoardDefinition(gpio)).toThrow();
  });
  it("rejects mismatched physical metadata and missing capabilities", () => {
    const mismatch = structuredClone(raw);
    mismatch.pins[0].side = "right";
    expect(() => parseBoardDefinition(mismatch)).toThrow();
    const missing = structuredClone(raw) as any;
    delete missing.pins[3].uart;
    expect(() => parseBoardDefinition(missing)).toThrow();
  });
  it("rejects relabelled rails and non-GPIO electrical mismatches", () => {
    const rail = structuredClone(raw);
    rail.pins[0].label = "G";
    expect(() => parseBoardDefinition(rail)).toThrow(/label/);
    const electrical = structuredClone(raw);
    electrical.pins[2].electricalType = "power";
    expect(() => parseBoardDefinition(electrical)).toThrow(/electrical/);
  });
});
