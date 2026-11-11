import { expect, it } from "vitest";
import { Mux4067 } from "./mux4067";
it("routes all sixteen bidirectional channels after break-before-make delay", () => {
  const m = new Mux4067("HC");
  for (let channel = 0; channel < 16; channel++) {
    const pins = {
      VCC: 5,
      GND: 0,
      EN: 0,
      ...Object.fromEntries(
        [0, 1, 2, 3].map((i) => [`S${i}`, channel & (1 << i) ? 5 : 0]),
      ),
    };
    expect(m.update(channel * 10, pins).channel).toBe(null);
    expect(m.update(channel * 10 + 1, pins).contacts).toEqual([
      ["COM", `C${channel}`],
    ]);
  }
  expect(m.update(200, { VCC: 5, GND: 0, EN: 5 }).contacts).toEqual([]);
});
it("distinguishes HC and B voltage limits and refuses overvoltage signals", () => {
  expect(
    new Mux4067("HC").update(0, { VCC: 12, GND: 0 }).warnings.join(),
  ).toMatch(/supply/);
  const b = new Mux4067("B");
  const p = { VCC: 12, GND: 0, EN: 0, S0: 0, S1: 0, S2: 0, S3: 0, C0: 13 };
  b.update(0, p);
  expect(b.update(1, p).contacts).toEqual([]);
  expect(b.update(2, p).warnings.join()).toMatch(/range/);
});
