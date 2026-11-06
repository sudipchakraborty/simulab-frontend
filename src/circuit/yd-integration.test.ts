import { describe, it, expect } from "vitest";
import { catalog, createComponent } from "./catalog";
import { parseProject, serializeProject, createSampleProject } from "./project";
import { connect } from "./editing";
import { validateCircuit, buildNets } from "./netlist";
import type { CircuitProject } from "./types";
describe("YD circuit integration", () => {
  it("exposes44 distinct physical pin identities without AVR aliases", () => {
    const board = catalog["yd-esp32-s3"];
    expect(board.pins).toHaveLength(44);
    expect(new Set(board.pins.map((p) => p.id)).size).toBe(44);
    expect(board.pins.some((p) => p.id === "D13")).toBe(false);
  });
  it("roundtrips rotated YD connections in schema1.1 while retaining1.0 Uno projects", () => {
    const board = {
      ...createComponent("yd-esp32-s3", { x: 0, y: 0 }),
      rotation: 90,
    };
    const led = createComponent("led", { x: 700, y: 0 });
    let p: CircuitProject = {
      schemaVersion: "1.1.0",
      name: "YD test",
      components: [board, led],
      wires: [],
    };
    p = connect(
      p,
      { componentId: board.id, pinId: "P1.4" },
      { componentId: led.id, pinId: "A" },
    );
    expect(parseProject(serializeProject(p))).toEqual(p);
    const uno = createSampleProject();
    expect(parseProject(serializeProject(uno)).schemaVersion).toBe("1.0.0");
    expect(() =>
      parseProject(JSON.stringify({ ...p, schemaVersion: "1.0.0" })),
    ).toThrow(/1.1.0/);
  });
  it("joins only declared internal rail aliases, not different GPIOs", () => {
    const b = createComponent("yd-esp32-s3", { x: 0, y: 0 });
    const p: CircuitProject = {
      schemaVersion: "1.1.0",
      name: "rails",
      components: [b],
      wires: [],
    };
    const nets = buildNets(p);
    const rail = nets.find((n) => n.endpoints.some((e) => e.pinId === "P1.1"))!;
    expect(rail.endpoints.some((e) => e.pinId === "P1.2")).toBe(true);
    const pin = nets.find((n) => n.endpoints.some((e) => e.pinId === "P1.4"))!;
    expect(pin.endpoints).toHaveLength(1);
  });
  it("detects incompatible power rails by metadata rather than header-ID spelling", () => {
    const b = createComponent("yd-esp32-s3", { x: 0, y: 0 });
    let p: CircuitProject = {
      schemaVersion: "1.1.0",
      name: "rails short",
      components: [b],
      wires: [],
    };
    p = connect(
      p,
      { componentId: b.id, pinId: "P1.1" },
      { componentId: b.id, pinId: "P1.21" },
    );
    expect(
      validateCircuit(p).some((i) =>
        i.message.includes("incompatible power rails"),
      ),
    ).toBe(true);
  });
});
