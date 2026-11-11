import { expect, it } from "vitest";
import { Hx711, Dht22 } from "./sensors";
import {
  armKinematics,
  RobotArm,
  MotionAssembly,
  ElectromagneticSwitch,
} from "./robotics";
import { solveDc } from "./dcSolver";
it("HX711 selects B32/A64 with 26/27 clocks and resets to A128 after power down", () => {
  const h = new Hx711({ rawValue: 256, rawValueB: 32, rateHz: 80 }),
    p = { VCC: 5, GND: 0, SCK: 0 };
  h.update(0, p);
  h.update(12500, p);
  let t = 12501;
  for (let i = 0; i < 26; i++) {
    h.update(t++, { ...p, SCK: 5 });
    h.update(t++, p);
  }
  expect(h.update(t, p).values.gain).toBe(32);
  expect(h.update(t, p).values.channel).toBe("B");
  h.update(t + 1, { ...p, SCK: 5 });
  h.update(t + 70, { ...p, SCK: 5 });
  expect(h.update(t + 71, p).values.gain).toBe(128);
  expect(h.update(t + 71, p).values.channel).toBe("A");
});
it("DHT22 rejects too-short MCU start without fabricating frames", () => {
  const d = new Dht22({ temperatureC: 0, humidityPct: 0 }),
    p = { VCC: 5, GND: 0, DATA: 5 };
  d.update(0, p);
  d.update(10, { ...p, DATA: 0 });
  const s = d.update(100, p);
  expect(s.values.busy).toBe(false);
  expect(s.values.frames).toBe(0);
  expect(s.outputs.DATA).toBeNull();
});
it("linear DC obeys KCL and Ohm law and reports solver bounds", () => {
  const b = [
      { id: "a", a: "v", b: "m", ohms: 100 },
      { id: "b", a: "m", b: "g", ohms: 200 },
      { id: "c", a: "m", b: "g", ohms: 200 },
    ],
    r = solveDc(["v", "m", "g"], { v: [-5], g: [0] }, b);
  expect(r.volts.m).toBeCloseTo(-2.5);
  expect(r.currents.a).toBeCloseTo(r.currents.b! + r.currents.c!);
  expect(r.currents.a).toBeCloseTo((r.volts.v! - r.volts.m!) / 100);
  expect(
    solveDc(["v", "m", "g"], { v: [5], g: [0] }, b, 0).issues.join(),
  ).toMatch(/exceeds/);
});
it("forward kinematics has verifiable straight and upright link poses and six-joint profiles remain bounded", () => {
  expect(armKinematics([0, 0, 0], 100, 200)).toMatchObject({
    toolX: 300,
    toolY: 0,
    toolZ: 80,
  });
  const up = armKinematics([0, 90, 0], 100, 200);
  expect(up.toolZ).toBeCloseTo(380);
  expect(up.toolX).toBeCloseTo(0);
  for (const profile of ["arm-6dof", "universal-arm"] as const) {
    const a = new RobotArm({
      profile,
      link1Mm: 100,
      link2Mm: 200,
      speedDegS: 180,
    });
    const p = { VCC: 5, GND: 0, J1: 0, J2: 0, J3: 0, J4: 0, J5: 0, J6: 0 };
    a.update(0, p);
    a.update(100, { ...p, J1: 5, J2: 5, J3: 5, J4: 5, J5: 5, J6: 5 });
    a.update(2100, p);
    const s = a.update(2002100, p);
    for (let i = 1; i <= 6; i++)
      expect(Math.abs(Number(s.values[`joint${i}Deg`]))).toBeLessThanOrEqual(
        180,
      );
  }
});
it("conveyor reverses and isolated coil contacts require actual rated coil voltage", () => {
  const c = new MotionAssembly({ type: "conveyor", speed: 0.2, trackM: 0.2 }),
    p = { VCC: 5, VM: 5, GND: 0, EN: 5, IN1: 5, IN2: 0 };
  c.update(0, p);
  expect(c.update(1000000, p).values.distanceM).toBeCloseTo(0.2);
  expect(
    c.update(2000000, { ...p, IN1: 0, IN2: 5 }).values.distanceM,
  ).toBeCloseTo(0);
  const relay = new ElectromagneticSwitch({
    ratedVoltage: 5,
    resistanceOhms: 100,
    delayUs: 100,
  });
  expect(
    relay.update(0, { COIL_POS: null, COIL_NEG: 0, COM: 5 }).contacts,
  ).toEqual([["COM", "NC"]]);
  relay.update(1, { COIL_POS: 5, COIL_NEG: 0 });
  expect(relay.update(101, { COIL_POS: 5, COIL_NEG: 0 }).contacts).toEqual([
    ["COM", "NO"],
  ]);
});
