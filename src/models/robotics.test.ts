import { expect, it } from "vitest";
import { solveDc } from "./dcSolver";
import {
  StepperDriver,
  StepperMotor,
  Servo,
  RobotArm,
  MotionAssembly,
  OpticalChannel,
} from "./robotics";
import { Hx711, Dht22 } from "./sensors";
it("solves resistor divider and signed shunt current with floating and conflict isolation", () => {
  const r = solveDc(["v", "m", "g", "f"], { v: [5], g: [0] }, [
    { id: "a", a: "v", b: "m", ohms: 1000 },
    { id: "b", a: "m", b: "g", ohms: 1000 },
  ]);
  expect(r.volts.m).toBeCloseTo(2.5);
  expect(r.currents.a).toBeCloseTo(0.0025);
  expect(r.volts.f).toBeNull();
  expect(
    solveDc(["a", "b"], { a: [0, 5] }, [{ id: "r", a: "a", b: "b", ohms: 100 }])
      .volts.b,
  ).toBeNull();
});
it("steps only valid powered enabled rising edges and reverses direction", () => {
  const d = new StepperDriver({ stepsPerTurn: 200, maxStepHz: 10000 });
  const p = { VCC: 5, VM: 5, GND: 0, EN: 0, DIR: 5, STEP: 0 };
  d.update(0, p);
  expect(d.update(100, { ...p, STEP: 5 }).values.steps).toBe(1);
  d.update(200, p);
  expect(d.update(300, { ...p, DIR: 0, STEP: 5 }).values.steps).toBe(0);
  expect(d.update(400, { ...p, VM: null }).outputs.A1).toBeNull();
  const m = new StepperMotor({ stepsPerTurn: 200 });
  m.update(0, { A1: 5, A2: 0, B1: 0, B2: 0 });
  expect(m.update(100, { A1: 0, A2: 0, B1: 5, B2: 0 }).values.steps).toBe(1);
});
it("servo follows actual bounded PWM with slew and releases invalid power", () => {
  const s = new Servo({ minAngle: -90, maxAngle: 90, speedDegS: 90 });
  const p = { VCC: 5, GND: 0, PWM: 0 };
  s.update(0, p);
  s.update(100, { ...p, PWM: 5 });
  s.update(2100, p);
  expect(s.update(1002100, p).values.angleDeg).toBeCloseTo(90);
  expect(s.update(1002200, { ...p, VCC: null }).values.powered).toBe(false);
});
it("shared robot profiles enforce joint limits and produce deterministic kinematics", () => {
  const a = new RobotArm({
    profile: "dobot-magician",
    link1Mm: 150,
    link2Mm: 150,
    speedDegS: 180,
  });
  const p = { VCC: 5, GND: 0, J1: 0, J2: 0, J3: 0, J4: 0, J5: 0, J6: 0 };
  a.update(0, p);
  a.update(100, { ...p, J2: 5 });
  a.update(2100, p);
  const r = a.update(1002100, p);
  expect(Number(r.values.joint2Deg)).toBeLessThanOrEqual(85);
  expect(Number.isFinite(r.values.toolX)).toBe(true);
  expect(r.warnings.join()).toMatch(/educational/);
});
it("conveyor and differential car use powered direction inputs and stop without power", () => {
  const a = new MotionAssembly({ type: "car", speed: 1, trackM: 0.2 });
  const p = { VCC: 5, VM: 5, GND: 0, EN: 5, IN1: 5, IN2: 0, IN3: 0, IN4: 5 };
  a.update(0, p);
  const r = a.update(1000000, p);
  expect(Number(r.values.headingRad)).toBeLessThan(0);
  expect(r.values.xM).toBeCloseTo(0);
  expect(a.update(2000000, { ...p, VM: null }).values.speedMps).toBe(0);
});
it("optical channel only detects matching powered emitter, geometry and unobstructed beam", () => {
  const bus = new OpticalChannel();
  bus.emit("a", "beam", true, 0, 0, 1);
  expect(bus.detect("beam", 0.5, 0, false)).toBe(true);
  expect(bus.detect("other", 0.5, 0, false)).toBe(false);
  expect(bus.detect("beam", 0.5, 0, true)).toBe(false);
});
it("HX711 exposes ready and 24 signed data bits on actual clock edges then converts again", () => {
  const h = new Hx711({ rawValue: -2, rateHz: 10 });
  const p = { VCC: 5, GND: 0, SCK: 0 };
  expect(h.update(0, p).outputs.DOUT).toBe(5);
  expect(h.update(100000, p).outputs.DOUT).toBe(0);
  let word = 0;
  for (let i = 0; i < 24; i++) {
    const r = h.update(100001 + i * 2, { ...p, SCK: 5 });
    word = word * 2 + (r.outputs.DOUT === 5 ? 1 : 0);
    h.update(100002 + i * 2, p);
  }
  expect(word).toBe(0xfffffe);
  h.update(100050, { ...p, SCK: 5 });
  expect(h.update(100051, p).outputs.DOUT).toBe(5);
});
it("DHT22 emits a timed humidity/temperature frame with checksum after MCU start and release", () => {
  const d = new Dht22({ temperatureC: 24.5, humidityPct: 60 });
  const p = { VCC: 5, GND: 0, DATA: 5 };
  d.update(0, p);
  d.update(1, { ...p, DATA: 0 });
  d.update(2001, { ...p, DATA: 5 });
  expect(d.update(2021, p).outputs.DATA).toBe(0);
  expect(d.update(2101, p).outputs.DATA).toBeNull();
  const bytes = [2, 88, 0, 245, 79];
  let t = 2181;
  for (const byte of bytes)
    for (let bit = 7; bit >= 0; bit--) {
      expect(d.update(t + 1, p).outputs.DATA).toBe(0);
      expect(d.update(t + 51, p).outputs.DATA).toBeNull();
      t += 50 + ((byte >> bit) & 1 ? 70 : 28);
    }
  expect(d.update(t + 100, p).values.frames).toBe(1);
});
it("servo applies a newly decoded command after its falling edge, never before it", () => {
  const s = new Servo({ minAngle: -90, maxAngle: 90, speedDegS: 180 }),
    p = { VCC: 5, GND: 0, PWM: 0 };
  s.update(0, p);
  s.update(100, { ...p, PWM: 5 });
  expect(s.update(2100, p).values.angleDeg).toBe(0);
  expect(s.update(102100, p).values.angleDeg).toBeCloseTo(18);
});
