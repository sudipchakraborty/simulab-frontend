import { ydBoard } from "../boards/yd-esp32-s3";
import type {
  ComponentDefinition,
  ComponentKind,
  CircuitComponent,
  Point,
} from "./types";

const pin = (id: string, electricalType = "passive") => ({
  id,
  label: id,
  electricalType,
});

/** @brief Reusable definitions only; none of these components execute MCU instructions. */

export const catalog: Record<ComponentKind, ComponentDefinition> = {
  uno: {
    name: "Arduino Uno",
    description: "ATmega328P board   firmware execution unavailable in Phase 1",
    pins: [
      ...Array.from({ length: 14 }, (_, i) => pin(`D${i}`, "bidirectional")),

      ...Array.from({ length: 6 }, (_, i) => pin(`A${i}`, "analog")),

      pin("5V", "power"),
      pin("3V3", "power"),
      pin("GND", "ground"),
      pin("VIN", "power-input"),
      pin("RESET", "input"),
      pin("AREF", "analog-reference"),
    ],
    defaultProperties: { clockHz: 16000000 },
  },

  "yd-esp32-s3": {
    name: "YD-ESP32-S3-2022-V1.3",
    description:
      "44 physical pins / ESP32-S3 / exact revision and module marking require confirmation",
    pins: ydBoard.pins.map((p) => ({
      id: p.id,
      label: p.label,
      electricalType: p.electricalType,
    })),
    defaultProperties: {
      memoryVariant: "unconfirmed",
      boardRevision: "2022-V1.3",
    },
  },
  led: {
    name: "LED",
    description: "Polarized indicator   A anode / K cathode",
    pins: [pin("A"), pin("K")],
    defaultProperties: { color: "#ef6461" },
  },

  resistor: {
    name: "Resistor",
    description: "Passive resistor   no analog solver",
    pins: [pin("1"), pin("2")],
    defaultProperties: { resistanceOhms: 220 },
  },

  switch: {
    name: "Push button",
    description: "Normally open switch   editable state metadata",
    pins: [pin("1"), pin("2")],
    defaultProperties: { pressed: false },
  },

  junction: {
    name: "Junction",
    description: "Explicit shared electrical node",
    pins: [pin("J")],
    defaultProperties: {},
  },
};

/** @brief Instantiate an independent definition with caller-supplied placement. */

export function createComponent(
  kind: ComponentKind,
  position: Point,
): CircuitComponent {
  return {
    id: crypto.randomUUID(),
    kind,
    label: catalog[kind].name,
    position: { ...position },
    rotation: 0,
    properties: { ...catalog[kind].defaultProperties },
  };
}
