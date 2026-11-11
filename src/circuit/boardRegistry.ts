import type { ComponentKind } from "./types";
/** @brief Supported MCU catalog kinds; CPU implementations remain host supplied. */
export const mcuKinds = ["uno", "nano", "mega2560", "yd-esp32-s3"] as const;
export type BoardKind = (typeof mcuKinds)[number];
export function isMcuKind(kind: string): kind is BoardKind {
  return (mcuKinds as readonly string[]).includes(kind);
}
export function boardTarget(
  kind: string,
): "uno" | "nano" | "mega2560" | "esp32s3" | undefined {
  return kind === "yd-esp32-s3"
    ? "esp32s3"
    : kind === "uno" || kind === "nano" || kind === "mega2560"
      ? kind
      : undefined;
}
/** @brief Logical native AVR headers. Nano A6/A7 are ADC-only and not digital inputs/outputs. */
export function boardPins(kind: ComponentKind) {
  const digital = kind === "mega2560" ? 54 : 14,
    analog = kind === "mega2560" ? 16 : kind === "nano" ? 8 : 6;
  return [
    ...Array.from({ length: digital }, (_, i) => ({
      id: `D${i}`,
      label: `D${i}`,
      electricalType: "bidirectional",
      digital: true,
    })),
    ...Array.from({ length: analog }, (_, i) => ({
      id: `A${i}`,
      label: `A${i}`,
      electricalType:
        kind === "nano" && i > 5 ? "adc-only-unimplemented" : "analog",
      digital: !(kind === "nano" && i > 5),
    })),
    ...["5V", "3V3", "GND", "VIN", "RESET", "AREF"].map((id) => ({
      id,
      label: id,
      electricalType:
        id === "GND"
          ? "ground"
          : id === "5V" || id === "3V3"
            ? "power"
            : id === "VIN"
              ? "power-input"
              : "input",
      digital: false,
    })),
  ];
}
/** @brief Native I2C pin IDs for real AVR peripheral integration. */
export function boardI2cPins(kind: string) {
  return kind === "mega2560"
    ? { sda: "D20", scl: "D21" }
    : { sda: "A4", scl: "A5" };
}
