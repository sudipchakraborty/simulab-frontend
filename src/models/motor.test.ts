import { expect, it } from "vitest";
import { DcMotor, hBridge } from "./motor";
it("accelerates, changes speed with PWM, reverses and stops", () => {
  const m = new DcMotor({
    ratedVoltage: 6,
    ratedRpm: 6000,
    resistance: 3,
    inertia: 0.00001,
    load: 0,
  });
  let s = m.update(1e6, 6);
  expect(s.rpm).toBeGreaterThan(1000);
  const full = s.rpm;
  s = m.update(2e6, hBridge(6, true, false, 0.25).voltage);
  expect(s.rpm).toBeLessThan(full);
  s = m.update(4e6, -6);
  expect(s.rpm).toBeLessThan(0);
  s = m.update(8e6, 0);
  expect(Math.abs(s.rpm)).toBeLessThan(10);
});
it("models stall current, torque and driver bounds", () => {
  const m = new DcMotor({
    ratedVoltage: 6,
    ratedRpm: 6000,
    resistance: 3,
    inertia: 0.00001,
    load: 0,
  });
  const s = m.update(1e6, 6, true);
  expect(s.rpm).toBe(0);
  expect(s.currentA).toBe(2);
  expect(s.torqueNm).toBeGreaterThan(0);
  expect(() => hBridge(6, true, false, 2)).toThrow();
  expect(() => m.update(0, 6)).toThrow();
});
