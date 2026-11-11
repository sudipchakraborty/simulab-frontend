import type { ComponentKind, CircuitComponent } from "../circuit/types";
/** @brief Reusable scene parameter bounds shared by import validation and Inspector UI. */
export const parameterBounds: Readonly<
  Record<string, readonly [number, number]>
> = {
  rangeV: [0.001, 10000],
  rangeA: [0.000001, 10000],
  shuntOhms: [0.000001, 1000000],
  rawValue: [-8388608, 8388607],
  rawValueB: [-8388608, 8388607],
  temperatureC: [-40, 80],
  humidityPct: [0, 100],
  stepsPerTurn: [1, 10000],
  maxStepHz: [1, 100000],
  minAngle: [-360, 360],
  maxAngle: [-360, 360],
  speedDegS: [0.01, 2000],
  ratedVoltage: [1, 48],
  resistanceOhms: [1, 100000],
  delayUs: [0, 1e6],
  link1Mm: [1, 5000],
  link2Mm: [1, 5000],
  speedMps: [0.001, 20],
  trackM: [0.01, 10],
  xM: [-10000, 10000],
  yM: [-10000, 10000],
  rangeM: [0.001, 10000],
};
const kinds = [
  "voltmeter",
  "ammeter",
  "hx711",
  "dht22",
  "stepper",
  "stepper-driver",
  "servo",
  "electromagnetic-switch",
  "arm-6dof",
  "universal-arm",
  "dobot-magician",
  "uarm-metal",
  "conveyor",
  "robotic-car",
  "ir-emitter",
  "ir-detector",
];
/** @brief Validate public model configuration without instantiating stateful devices. Unknown extension properties remain portable. */
export function validateModelProperties(
  kind: ComponentKind,
  properties: CircuitComponent["properties"],
) {
  if (!kinds.includes(kind)) return;
  for (const [key, value] of Object.entries(properties)) {
    const range = parameterBounds[key];
    if (
      range &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < range[0] ||
        value > range[1])
    )
      throw new Error(`${key} must be ${range[0]}..${range[1]}`);
    if (key === "rateHz" && value !== 10 && value !== 80)
      throw new Error("rateHz must be 10 or 80");
    if (["blocked", "pressed"].includes(key) && typeof value !== "boolean")
      throw new Error(`${key} must be boolean`);
    if (
      key === "channel" &&
      (typeof value !== "string" || !value.length || value.length > 100)
    )
      throw new Error("channel must be 1..100 characters");
  }
  if (
    kind === "servo" &&
    Number(properties.minAngle ?? -90) > Number(properties.maxAngle ?? 90)
  )
    throw new Error("Minimum angle must not exceed maximum angle");
}
