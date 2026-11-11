import type { ComponentKind } from "./types";
import { isMcuKind } from "./boardRegistry";
export const CATEGORIES = [
  "Microcontroller",
  "Module",
  "Robotics",
  "Sensor",
  "Actuator",
  "Meter",
  "Connection",
] as const;
/** @brief Stable reusable library grouping independent of editor framework. */
export function componentCategory(
  kind: ComponentKind,
): (typeof CATEGORIES)[number] {
  if (isMcuKind(kind)) return "Microcontroller";
  if (["voltmeter", "ammeter"].includes(kind)) return "Meter";
  if (
    [
      "arm-6dof",
      "universal-arm",
      "dobot-magician",
      "uarm-metal",
      "conveyor",
      "robotic-car",
    ].includes(kind)
  )
    return "Robotics";
  if (["dht22", "hx711", "ir-detector"].includes(kind)) return "Sensor";
  if (
    ["dc-motor", "stepper", "servo", "led", "ws2812", "ir-emitter"].includes(
      kind,
    )
  )
    return "Actuator";
  if (
    [
      "junction",
      "resistor",
      "switch",
      "tactile-switch",
      "electromagnetic-switch",
    ].includes(kind)
  )
    return "Connection";
  return "Module";
}
