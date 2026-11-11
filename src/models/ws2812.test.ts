import { expect, it } from "vitest";
import { Ws2812 } from "./ws2812";
const send = (m: Ws2812, bytes: number[], start = 100) => {
  let t = start;
  for (const byte of bytes)
    for (let bit = 7; bit >= 0; bit--) {
      m.edge(t, 1);
      m.edge(t + ((byte >> bit) & 1 ? 0.7 : 0.35), 0);
      t += 1.25;
    }
  m.advance(t + 300);
  return t + 300;
};
it("decodes timed GRB frames, daisy-chain pixels and brightness without interpreting source", () => {
  const m = new Ws2812(2, 0.5);
  send(m, [0, 255, 0, 255, 0, 0]);
  expect(m.snapshot().colors).toEqual(["#800000", "#008000"]);
  expect(m.snapshot().currentA).toBeGreaterThan(0.01);
});
it("rejects invalid pulses and waits for reset before latching", () => {
  const m = new Ws2812(1);
  m.edge(100, 1);
  m.edge(105, 0);
  m.advance(500);
  expect(m.snapshot().colors).toEqual(["#000000"]);
  expect(m.snapshot().errors).toBeGreaterThan(0);
  expect(() => m.edge(1, 1)).toThrow(/monotonic/);
});
it("consumes upstream pixel words before decoding downstream DOUT data", () => {
  const downstream = new Ws2812(1, 1, 1);
  send(downstream, [0, 255, 0, 0, 0, 255]);
  expect(downstream.snapshot().colors).toEqual(["#0000ff"]);
});
