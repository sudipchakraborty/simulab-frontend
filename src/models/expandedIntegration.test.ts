import { expect, it } from "vitest";
import { catalog, createComponent } from "../circuit/catalog";
import { parseProject, serializeProject } from "../circuit/project";
import { boardPins, boardTarget, boardI2cPins } from "../circuit/boardRegistry";
import type { CircuitProject, ComponentKind } from "../circuit/types";
import { CircuitRuntime } from "./circuitRuntime";
const part = (kind: ComponentKind, id: string) => ({
  ...createComponent(kind, { x: 0, y: 0 }),
  id,
});
const wire = (a: string, ap: string, b: string, bp: string, i: number) => ({
  id: `w${i}`,
  from: { componentId: a, pinId: ap },
  to: { componentId: b, pinId: bp },
  color: "#000000",
  label: "",
});
it("roundtrips schema1.3 catalog and keeps every old schema readable", () => {
  for (const kind of [
    "nano",
    "mega2560",
    "voltmeter",
    "ammeter",
    "hx711",
    "dht22",
    "stepper",
    "stepper-driver",
    "servo",
    "tactile-switch",
    "electromagnetic-switch",
    "arm-6dof",
    "universal-arm",
    "dobot-magician",
    "uarm-metal",
    "conveyor",
    "robotic-car",
    "ir-emitter",
    "ir-detector",
  ] as ComponentKind[])
    expect(catalog[kind]).toBeDefined();
  const p: CircuitProject = {
    schemaVersion: "1.3.0",
    name: "all",
    components: Object.keys(catalog).map((kind, i) =>
      part(kind as ComponentKind, `p${i}`),
    ),
    wires: [],
  };
  expect(parseProject(serializeProject(p))).toEqual(p);
  for (const schemaVersion of ["1.0.0", "1.1.0", "1.2.0"] as const)
    expect(
      parseProject(
        JSON.stringify({
          schemaVersion,
          name: "old",
          components: [part("uno", "u")],
          wires: [],
        }),
      ).schemaVersion,
    ).toBe(schemaVersion);
});
it("exposes native Nano/Mega pins without inventing digital A6/A7", () => {
  expect(boardTarget("mega2560")).toBe("mega2560");
  expect(boardPins("mega2560").find((p) => p.id === "D53")).toBeDefined();
  expect(boardPins("nano").find((p) => p.id === "A7")?.digital).toBe(false);
  expect(boardI2cPins("mega2560")).toEqual({ sda: "D20", scl: "D21" });
});
it("meters solve a real loaded divider with signed branch current and high impedance voltage probes", () => {
  const components = [
    part("uno", "u"),
    part("resistor", "r"),
    part("ammeter", "a"),
    part("voltmeter", "v"),
  ];
  components[1].properties.resistanceOhms = 1000;
  components[2].properties.shuntOhms = 1;
  const pairs = [
    ["u", "5V", "r", "1"],
    ["r", "2", "a", "POS"],
    ["a", "NEG", "u", "GND"],
    ["v", "POS", "r", "2"],
    ["v", "NEG", "u", "GND"],
  ];
  const p: CircuitProject = {
    schemaVersion: "1.3.0",
    name: "meter",
    components,
    wires: pairs.map(([a, ap, b, bp], i) => wire(a, ap, b, bp, i)),
  };
  const r = new CircuitRuntime(p, "uno"),
    s = r.advance(0, {});
  expect(s.a.values.currentA).toBeCloseTo(5 / 1001, 8);
  expect(s.v.values.voltageV).toBeCloseTo(5 / 1001, 8);
  expect(r.pinVoltage("r", "2")).toBeCloseTo(5 / 1001, 8);
});
it("feeds serial HX711 output into actual MCU input nets", () => {
  const components = [part("nano", "u"), part("hx711", "h")],
    pairs = [
      ["5V", "VCC"],
      ["GND", "GND"],
      ["D3", "SCK"],
      ["D2", "DOUT"],
    ];
  const r = new CircuitRuntime(
    {
      schemaVersion: "1.3.0",
      name: "hx",
      components,
      wires: pairs.map(([a, b], i) => wire("u", a, "h", b, i)),
    },
    "nano",
  );
  r.advance(0, { D3: 0, D2: null });
  expect(r.inputLevels().D2).toBe(1);
  r.advance(100000, { D3: 0, D2: null });
  expect(r.inputLevels().D2).toBe(0);
});
it("routes Mega RTC only through native D20/D21 I2C", () => {
  const components = [part("mega2560", "u"), part("ds3231", "r")],
    pairs = [
      ["5V", "VCC"],
      ["GND", "GND"],
      ["D20", "SDA"],
      ["D21", "SCL"],
    ];
  const r = new CircuitRuntime(
    {
      schemaVersion: "1.3.0",
      name: "rtc",
      components,
      wires: pairs.map(([a, b], i) => wire("u", a, "r", b, i)),
    },
    "mega2560",
  );
  r.advance(0, {});
  expect(r.i2cWrite(104, [0])).toBe(true);
});

it("models coil resistance in the DC network without joining isolated contacts", () => {
  const components = [
    part("uno", "u"),
    part("resistor", "r"),
    part("electromagnetic-switch", "c"),
  ];
  components[1].properties.resistanceOhms = 70;
  const pairs = [
    ["u", "5V", "r", "1"],
    ["r", "2", "c", "COIL_POS"],
    ["u", "GND", "c", "COIL_NEG"],
  ];
  const r = new CircuitRuntime(
    {
      schemaVersion: "1.3.0",
      name: "coil divider",
      components,
      wires: pairs.map(([a, ap, b, bp], i) => wire(a, ap, b, bp, i)),
    },
    "uno",
  );
  const s = r.advance(0, {});
  expect(r.pinVoltage("c", "COIL_POS")).toBeCloseTo(2.5);
  expect(s.c.values.coilCurrentA).toBeCloseTo(2.5 / 70);
  expect(r.pinVoltage("c", "COM")).toBeNull();
});
