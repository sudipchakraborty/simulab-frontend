import { describe, expect, it } from "vitest";
import { catalog, createComponent } from "./catalog";
import { connect, splitWire } from "./editing";
import { buildNets, validateCircuit } from "./netlist";
import { createSampleProject, parseProject, serializeProject } from "./project";
import type { CircuitProject, Endpoint } from "./types";

const ep = (componentId: string, pinId: string): Endpoint => ({
  componentId,
  pinId,
});
const blank = (): CircuitProject => ({
  schemaVersion: "1.0.0",
  name: "Test",
  components: ["led", "resistor", "switch"].map((k, i) => ({
    ...createComponent(k as "led", { x: i * 100, y: 0 }),
    id: `c${i}`,
  })),
  wires: [],
});

describe("electrical graph", () => {
  it("merges shared pin nodes without merging a component’s separate pins", () => {
    let p = connect(blank(), ep("c0", "A"), ep("c1", "1"));
    p = connect(p, ep("c0", "A"), ep("c2", "1"));
    const net = buildNets(p).find((n) =>
      n.endpoints.some((e) => e.componentId === "c0" && e.pinId === "A"),
    )!;
    expect(net.endpoints).toHaveLength(3);
    expect(net.endpoints).not.toContainEqual(ep("c1", "2"));
  });
  it("does not connect visual crossings or overlapping components", () => {
    let p = blank();
    p.components.forEach((c) => {
      c.position = { x: 0, y: 0 };
    });
    p = connect(p, ep("c0", "A"), ep("c1", "1"));
    p = connect(p, ep("c0", "K"), ep("c1", "2"));
    expect(buildNets(p).filter((n) => n.endpoints.length > 1)).toHaveLength(2);
  });
  it("splits a wire into an explicit junction with preserved connectivity and supports branching", () => {
    let p = connect(blank(), ep("c0", "A"), ep("c1", "1"));
    p = splitWire(p, p.wires[0].id, { x: 40, y: 20 });
    const j = p.components.find((c) => c.kind === "junction")!;
    p = connect(p, ep(j.id, "J"), ep("c2", "1"));
    expect(p.wires).toHaveLength(3);
    expect(
      buildNets(p).find((n) => n.endpoints.some((e) => e.componentId === j.id))
        ?.endpoints,
    ).toHaveLength(4);
  });
  it("rejects self, reverse duplicate, and missing pin connections", () => {
    const p = connect(blank(), ep("c0", "A"), ep("c1", "1"));
    expect(() => connect(p, ep("c1", "1"), ep("c0", "A"))).toThrow();
    expect(() => connect(p, ep("c0", "A"), ep("c0", "A"))).toThrow();
    expect(() => connect(p, ep("c0", "MISSING"), ep("c1", "2"))).toThrow();
  });
  it("keeps edits immutable and preserves wire metadata on junction insertion", () => {
    const original = blank();
    const p = connect(original, ep("c0", "A"), ep("c1", "1"));
    expect(original.wires).toHaveLength(0);
    p.wires[0] = { ...p.wires[0], color: "#123456", label: "Signal" };
    const split = splitWire(p, p.wires[0].id, { x: 40, y: 20 });
    expect(p.components).toHaveLength(3);
    expect(p.wires).toHaveLength(1);
    expect(
      split.wires.every((w) => w.color === "#123456" && w.label === "Signal"),
    ).toBe(true);
    expect(() => splitWire(p, "missing", { x: 0, y: 0 })).toThrow();
    expect(() => splitWire(p, p.wires[0].id, { x: Infinity, y: 0 })).toThrow();
  });
  it("reports unconnected pins and direct power-to-ground shorts", () => {
    const uno = { ...createComponent("uno", { x: 0, y: 0 }), id: "uno" };
    const p = connect(
      { ...blank(), components: [uno] },
      ep("uno", "5V"),
      ep("uno", "GND"),
    );
    expect(
      validateCircuit(p).some(
        (i) => i.severity === "error" && /short/i.test(i.message),
      ),
    ).toBe(true);
    expect(validateCircuit(blank()).some((i) => i.severity === "warning")).toBe(
      true,
    );
  });
});

describe("project boundary", () => {
  it("roundtrips sample connectivity exactly", () => {
    const p = createSampleProject();
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(buildNets(parseProject(serializeProject(p)))).toEqual(buildNets(p));
  });
  it("exposes complete Uno signal and supply pins", () => {
    expect(catalog.uno.pins).toHaveLength(26);
    expect(catalog.uno.pins.map((p) => p.id)).toEqual(
      expect.arrayContaining([
        "D0",
        "D13",
        "A0",
        "A5",
        "GND",
        "5V",
        "3V3",
        "VIN",
        "RESET",
        "AREF",
      ]),
    );
  });
  it.each([
    (p: CircuitProject) => {
      p.schemaVersion = "2.0.0" as "1.0.0";
    },
    (p: CircuitProject) => {
      p.components.push(p.components[0]);
    },
    (p: CircuitProject) => {
      p.components[0].position.x = 1e20;
    },
    (p: CircuitProject) => {
      p.components[0].kind = "fake" as "led";
    },
    (p: CircuitProject) => {
      p.wires[0].to.pinId = "bad";
    },
    (p: CircuitProject) => {
      p.wires.push(p.wires[0]);
    },
    (p: CircuitProject) => {
      p.components[0].properties.bad = null as unknown as string;
    },
  ])("rejects malformed project %i", (mutate) => {
    const p = createSampleProject();
    mutate(p);
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
  it("rejects huge inputs and malformed JSON", () => {
    expect(() => parseProject(" ".repeat(2_000_001))).toThrow();
    expect(() => parseProject("{")).toThrow();
    expect(() => parseProject("null")).toThrow();
  });
  it("rejects prototype keys, invalid colors, non-quarter rotation, and excessive entities", () => {
    const p = createSampleProject();
    expect(() =>
      parseProject(
        JSON.stringify(p).replace('"clockHz":16000000', '"__proto__":true'),
      ),
    ).toThrow();
    expect(() =>
      parseProject(
        JSON.stringify({ ...p, components: Array(1001).fill(p.components[0]) }),
      ),
    ).toThrow();
    expect(() =>
      parseProject(
        JSON.stringify({ ...p, wires: Array(5001).fill(p.wires[0]) }),
      ),
    ).toThrow();
    p.wires[0].color = "red";
    expect(() => parseProject(JSON.stringify(p))).toThrow();
    p.wires[0].color = "#ffffff";
    p.components[0].rotation = 45;
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
});
