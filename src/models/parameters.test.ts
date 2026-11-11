import { expect, it } from "vitest";
import { createComponent } from "../circuit/catalog";
import { parseProject } from "../circuit/project";
import { validateModelProperties } from "./parameters";
it("rejects nonphysical imported parameters before starting a model", () => {
  const c = createComponent("servo", { x: 0, y: 0 });
  c.properties.speedDegS = -1;
  expect(() => validateModelProperties(c.kind, c.properties)).toThrow(
    /speedDegS/,
  );
  expect(() =>
    parseProject(
      JSON.stringify({
        schemaVersion: "1.3.0",
        name: "bad",
        components: [c],
        wires: [],
      }),
    ),
  ).toThrow(/speedDegS/);
});
it("rejects reversed joint limits and out of range sensor stimulus", () => {
  expect(() =>
    validateModelProperties("servo", { minAngle: 90, maxAngle: 0 }),
  ).toThrow(/angle/);
  expect(() => validateModelProperties("dht22", { humidityPct: 101 })).toThrow(
    /humidityPct/,
  );
  expect(() => validateModelProperties("hx711", { rateHz: 11 })).toThrow(
    /rateHz/,
  );
});
