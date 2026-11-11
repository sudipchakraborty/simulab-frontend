import { expect, it } from "vitest";
import { RelayModule } from "./relay";
it("switches COM from NC to NO after delay and releases on power loss", () => {
  const r = new RelayModule({
    activeLow: true,
    logic3v3: true,
    delayUs: 10000,
  });
  expect(r.update(0, { VCC: 5, GND: 0, IN: 0 }).contacts).toEqual([
    ["COM", "NC"],
  ]);
  expect(r.update(10000, { VCC: 5, GND: 0, IN: 0 }).energized).toBe(true);
  expect(r.update(10001, { VCC: 0, GND: 0, IN: 0 }).energized).toBe(true);
  expect(r.update(20001, { VCC: 0, GND: 0, IN: 0 }).contacts).toEqual([
    ["COM", "NC"],
  ]);
});
it("honors trigger polarity and profile-specific 3.3V compatibility", () => {
  const r = new RelayModule({ activeLow: false, logic3v3: false, delayUs: 10 });
  expect(r.update(0, { VCC: 5, GND: 0, IN: 3.3 }).warnings.join()).toMatch(
    /3.3/,
  );
  r.update(1, { VCC: 5, GND: 0, IN: 5 });
  expect(r.update(11, { VCC: 5, GND: 0, IN: 5 }).contacts).toEqual([
    ["COM", "NO"],
  ]);
});
