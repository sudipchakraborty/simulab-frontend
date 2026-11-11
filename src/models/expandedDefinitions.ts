import type { ComponentDefinition, ComponentKind } from "../circuit/types";
import { armProfiles } from "./robotics";
const pins = (names: string[]) =>
  names.map((id) => ({
    id,
    label: id,
    electricalType: ["VCC", "VM"].includes(id)
      ? "power-input"
      : id === "GND"
        ? "ground-input"
        : "bidirectional",
  }));
const define = (
  name: string,
  description: string,
  ids: string[],
  defaultProperties: ComponentDefinition["defaultProperties"],
): ComponentDefinition => ({
  name,
  description,
  pins: pins(ids),
  defaultProperties,
});
export type ExpandedKind = Exclude<
  ComponentKind,
  | "uno"
  | "nano"
  | "mega2560"
  | "yd-esp32-s3"
  | "led"
  | "resistor"
  | "switch"
  | "junction"
  | "ds3231"
  | "mux4067"
  | "dc-motor"
  | "ws2812"
  | "relay"
  | "h-bridge"
>;
/** @brief Parameterized definitions for portable sensor and robotics modules. Every stimulus is explicitly configured. */
export const expandedDefinitions: Record<ExpandedKind, ComponentDefinition> = {
  voltmeter: define(
    "DC voltmeter",
    "Ideal high-impedance differential probe; floating/conflict states explicit",
    ["POS", "NEG"],
    { rangeV: 60 },
  ),
  ammeter: define(
    "DC ammeter",
    "Series shunt branch in bounded linear DC resistor solver; current positive POS to NEG",
    ["POS", "NEG"],
    { shuntOhms: 0.1, rangeA: 10 },
  ),
  hx711: define(
    "HX711 load-cell amplifier",
    "Clocked 24-bit signed samples with gain/channel selection; ideal scene stimulus",
    ["VCC", "GND", "SCK", "DOUT"],
    { rawValue: 100000, rawValueB: 0, rateHz: 10 },
  ),
  dht22: define(
    "DHT22 temperature / humidity",
    "Timed open-drain 40-bit frames; requires DATA pull-up; minimum 2 s read interval",
    ["VCC", "GND", "DATA"],
    { temperatureC: 24, humidityPct: 50 },
  ),
  stepper: define(
    "Full-step stepper motor",
    "Four-terminal winding sequence; requires powered stepper driver",
    ["A1", "A2", "B1", "B2"],
    { stepsPerTurn: 200 },
  ),
  "stepper-driver": define(
    "STEP/DIR stepper driver",
    "Integrated safe powered driver; active-low enable; ideal full-step coils",
    ["VCC", "VM", "GND", "STEP", "DIR", "EN", "A1", "A2", "B1", "B2"],
    { stepsPerTurn: 200, maxStepHz: 10000 },
  ),
  servo: define(
    "PWM servo",
    "Powered integrated hobby servo; actual 1000..2000 us pulses command bounded angle",
    ["VCC", "GND", "PWM"],
    { minAngle: -90, maxAngle: 90, speedDegS: 180 },
  ),
  "tactile-switch": define(
    "Tactile push switch",
    "Four leads: 1A/1B and 2A/2B are internally paired; press joins pairs",
    ["1A", "1B", "2A", "2B"],
    { pressed: false },
  ),
  "electromagnetic-switch": define(
    "Electromagnetic switch",
    "Bare powered coil distinct from isolated COM/NO/NC contacts; use external driver",
    ["COIL_POS", "COIL_NEG", "COM", "NO", "NC"],
    { ratedVoltage: 5, resistanceOhms: 70, delayUs: 10000 },
  ),
  ...(Object.fromEntries(
    Object.entries(armProfiles).map(([kind, g]) => [
      kind,
      define(
        kind === "arm-6dof"
          ? "Generic 6DOF arm"
          : kind === "universal-arm"
            ? "Generic Universal-style arm"
            : kind === "dobot-magician"
              ? "Dobot Magician educational profile"
              : "uArm Metal educational profile",
        "Approximate configurable educational kinematics with powered integrated servo drivers; no vendor USB/serial/CAD compatibility",
        [
          "VCC",
          "GND",
          ...Array.from({ length: g.joints }, (_, i) => `J${i + 1}`),
        ],
        { link1Mm: g.link1Mm, link2Mm: g.link2Mm, speedDegS: 90 },
      ),
    ]),
  ) as Record<
    "arm-6dof" | "universal-arm" | "dobot-magician" | "uarm-metal",
    ComponentDefinition
  >),
  conveyor: define(
    "Conveyor assembly",
    "Powered integrated bidirectional driver; ideal no-slip belt motion",
    ["VCC", "VM", "GND", "EN", "IN1", "IN2"],
    { speedMps: 0.2, trackM: 0.2 },
  ),
  "robotic-car": define(
    "Four-wheel robotic car",
    "Powered left/right integrated H-bridges; deterministic differential drive",
    ["VCC", "VM", "GND", "EN", "IN1", "IN2", "IN3", "IN4"],
    { speedMps: 0.5, trackM: 0.18 },
  ),
  "ir-emitter": define(
    "IR emitter module",
    "Powered switched optical source; paired channel and explicit scene geometry",
    ["VCC", "GND", "IN"],
    { channel: "beam-1", xM: 0, yM: 0, rangeM: 1 },
  ),
  "ir-detector": define(
    "IR detector module",
    "Powered active-low digital detector; matching optical channel, range and obstruction",
    ["VCC", "GND", "OUT"],
    { channel: "beam-1", xM: 0.5, yM: 0, rangeM: 1, blocked: false },
  ),
};
