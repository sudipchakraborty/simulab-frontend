import { describe, it, expect } from "vitest";
import { Ds3231 } from "./ds3231";
describe("DS3231 real register model", () => {
  it("reads/writes BCD over addressed I2C and advances deterministically across leap day", () => {
    const rtc = new Ds3231({ epoch: "2024-02-28T23:59:59Z" });
    expect(rtc.write(0x69, [0])).toBe(false);
    rtc.write(0x68, [0]);
    expect(rtc.read(0x68, 3)).toEqual([0x59, 0x59, 0x23]);
    rtc.advance(1_000_000);
    expect(rtc.snapshot().iso).toBe("2024-02-29T00:00:00.000Z");
    rtc.write(0x68, [0, 0x30, 0x12, 0x41]);
    rtc.write(0x68, [0]);
    expect(rtc.read(0x68, 3)).toEqual([0x30, 0x12, 0x41]);
  });
  it("latches alarm flags and honors clear-on-zero status and open-drain interrupt", () => {
    const rtc = new Ds3231({ epoch: "2026-01-01T00:00:00Z" });
    expect(rtc.snapshot().lostPower).toBe(true);
    rtc.write(0x68, [0x0f, 0x08]);
    expect(rtc.snapshot().lostPower).toBe(false);
    rtc.write(0x68, [7, 0x01, 0x80, 0x80, 0x80]);
    rtc.write(0x68, [0x0e, 5]);
    rtc.advance(1_000_000);
    expect(rtc.snapshot().interruptLow).toBe(true);
    rtc.write(0x68, [0x0f, 0x08]);
    expect(rtc.snapshot().interruptLow).toBe(false);
    expect(() => rtc.advance(0)).toThrow(/monotonic/);
  });
});
