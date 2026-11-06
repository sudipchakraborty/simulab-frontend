import raw from "./yd-esp32-s3.json";
import type { BoardDefinition, BoardPin } from "./types";
export type { BoardDefinition, BoardPin } from "./types";
const leftGPIO = [
  null,
  null,
  null,
  4,
  5,
  6,
  7,
  15,
  16,
  17,
  18,
  8,
  3,
  46,
  9,
  10,
  11,
  12,
  13,
  14,
  null,
  null,
];
const rightGPIO = [
  null,
  43,
  44,
  1,
  2,
  42,
  41,
  40,
  39,
  38,
  37,
  36,
  35,
  0,
  45,
  48,
  47,
  21,
  20,
  19,
  null,
  null,
];
const invalid = (message: string): never => {
  throw new Error(`Invalid YD board definition: ${message}`);
};
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : invalid("expected object");
const text = (v: unknown, max = 1500): string =>
  typeof v === "string" && v.length > 0 && v.length <= max
    ? v
    : invalid("invalid text");
const strings = (v: unknown): string[] =>
  Array.isArray(v) &&
  v.length <= 40 &&
  v.every((x) => typeof x === "string" && x.length > 0 && x.length <= 120)
    ? v
    : invalid("invalid string list");
const integer = (v: unknown, min: number, max: number): number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max
    ? v
    : invalid("invalid integer");
const bool = (v: unknown): boolean =>
  typeof v === "boolean" ? v : invalid("missing boolean capability");
const keys = (v: Record<string, unknown>, names: string[]) => {
  if (
    Object.keys(v).some((k) => !names.includes(k)) ||
    names.some((k) => !Object.hasOwn(v, k))
  )
    invalid("unexpected or missing fields");
};
/** @brief Validate the physical board JSON before exposing pins to wiring or emulation.
 * @param input Untrusted board-definition object, not a circuit document.
 * @returns An independently cloned validated board definition.
 * @throws Error on invalid physical mapping, missing metadata or unsupported version.
 */
export function parseBoardDefinition(input: unknown): BoardDefinition {
  const b = record(input);
  keys(b, [
    "schemaVersion",
    "id",
    "name",
    "manufacturer",
    "revision",
    "mcu",
    "cpu",
    "physicalPins",
    "numberingConvention",
    "dimensionsMm",
    "dimensionStatus",
    "verification",
    "memory",
    "onboard",
    "internalNets",
    "sources",
    "pins",
  ]);
  if (
    b.schemaVersion !== "1.0.0" ||
    b.id !== "yd-esp32-s3-2022-v1.3" ||
    b.mcu !== "ESP32-S3" ||
    b.physicalPins !== 44
  )
    invalid("unsupported identity or44-pin schema");
  for (const key of [
    "name",
    "manufacturer",
    "revision",
    "cpu",
    "numberingConvention",
  ])
    text(b[key]);
  if (b.dimensionsMm !== null) {
    const d = record(b.dimensionsMm);
    keys(d, ["width", "height"]);
    for (const key of ["width", "height"])
      if (
        typeof d[key] !== "number" ||
        !Number.isFinite(d[key]) ||
        d[key] <= 0 ||
        d[key] > 200
      )
        invalid("invalid dimensions");
  }
  if (
    !["requires-confirmation", "manufacturer-drawing-verified"].includes(
      String(b.dimensionStatus),
    )
  )
    invalid("invalid dimension verification");
  const v = record(b.verification);
  keys(v, ["pinout", "exactRevision", "note"]);
  if (
    v.pinout !== "manufacturer-family-verified" ||
    v.exactRevision !== "requires-confirmation"
  )
    invalid("unverified exact board revision");
  text(v.note);
  const memory = record(b.memory);
  keys(memory, ["defaultVariant", "profiles"]);
  if (memory.defaultVariant !== "unconfirmed")
    invalid("memory variant requires module confirmation");
  const profiles = record(memory.profiles);
  keys(profiles, ["N16R8"]);
  const n = record(profiles.N16R8);
  keys(n, ["flashMB", "psramMB", "psramMode", "reservedGpio", "verification"]);
  if (
    n.flashMB !== 16 ||
    n.psramMB !== 8 ||
    n.psramMode !== "octal" ||
    n.verification !== "module-marking-required" ||
    JSON.stringify(n.reservedGpio) !== "[35,36,37]"
  )
    invalid("invalid N16R8 profile");
  if (!Array.isArray(b.pins) || b.pins.length !== 44)
    invalid("expected44 pins");
  const ids = new Set<string>();
  const gpios = new Set<number>();
  (b.pins as unknown[]).forEach((entry: unknown, index: number) => {
    const p = record(entry);
    keys(p, [
      "id",
      "physicalNumber",
      "header",
      "headerIndex",
      "side",
      "label",
      "gpio",
      "arduinoPin",
      "electricalType",
      "functions",
      "restrictions",
      "adc",
      "ledc",
      "i2c",
      "spi",
      "uart",
    ]);
    const side = index < 22 ? "left" : "right",
      header = index < 22 ? "P1" : "P2",
      headerIndex = (index % 22) + 1;
    if (
      p.header !== header ||
      p.side !== side ||
      p.headerIndex !== headerIndex ||
      p.physicalNumber !== index + 1 ||
      p.id !== `${header}.${headerIndex}`
    )
      invalid("physical position/header mismatch");
    const id = text(p.id);
    if (ids.has(id)) invalid("duplicate pin ID");
    ids.add(id);
    text(p.label, 40);
    const expected = (index < 22 ? leftGPIO : rightGPIO)[headerIndex - 1];
    if (p.gpio !== expected || p.arduinoPin !== expected)
      invalid("GPIO/Arduino alias does not match published header");
    const specialLabels: Record<number, string> = {
      0: "3V3",
      1: "3V3",
      2: "RST",
      20: "5V",
      21: "G",
      22: "G",
      23: "TX",
      24: "RX",
      42: "G",
      43: "G",
    };
    const expectedLabel = specialLabels[index] ?? String(expected);
    if (p.label !== expectedLabel)
      invalid("pin label does not match published header");
    if (
      p.gpio === null &&
      p.electricalType !==
        (expectedLabel === "RST"
          ? "input"
          : expectedLabel === "G"
            ? "ground"
            : "power")
    )
      invalid("power/reset electrical type mismatch");
    if (p.gpio !== null) {
      const gpio = integer(p.gpio, 0, 48);
      if (gpios.has(gpio)) invalid("duplicate GPIO");
      gpios.add(gpio);
      if (p.electricalType !== "bidirectional")
        invalid("invalid GPIO electrical type");
    } else if (!["power", "ground", "input"].includes(String(p.electricalType)))
      invalid("invalid non-GPIO electrical type");
    strings(p.functions);
    const restrictions = strings(p.restrictions);
    if (
      expected !== null &&
      [0, 3, 45, 46].includes(expected) &&
      !restrictions.includes("strapping")
    )
      invalid("missing strapping restriction");
    if (
      expected !== null &&
      [35, 36, 37].includes(expected) &&
      !restrictions.includes("reserved-on-octal-memory-variants")
    )
      invalid("missing memory reservation");
    const adc =
      expected !== null && expected >= 1 && expected <= 10
        ? { unit: 1, channel: expected - 1 }
        : expected !== null && expected >= 11 && expected <= 20
          ? { unit: 2, channel: expected - 11 }
          : null;
    if (adc === null) {
      if (p.adc !== null) invalid("ADC not available");
    } else {
      const a = record(p.adc);
      keys(a, ["unit", "channel"]);
      if (a.unit !== adc.unit || a.channel !== adc.channel)
        invalid("ADC channel mismatch");
    }
    for (const key of ["ledc", "i2c", "spi"])
      if (bool(p[key]) !== (expected !== null))
        invalid("GPIO capability mismatch");
    const uart = record(p.uart);
    keys(uart, ["tx", "rx"]);
    if (
      bool(uart.tx) !== (expected !== null) ||
      bool(uart.rx) !== (expected !== null)
    )
      invalid("UART capability mismatch");
  });
  const onboard = record(b.onboard);
  keys(onboard, ["rgb", "boot", "reset", "usb"]);
  const rgb = record(onboard.rgb);
  keys(rgb, ["gpio", "type", "verification"]);
  if (
    rgb.gpio !== 48 ||
    rgb.type !== "WS2812" ||
    rgb.verification !== "manufacturer-family"
  )
    invalid("invalid onboard RGB mapping");
  const boot = record(onboard.boot);
  keys(boot, ["gpio", "activeLow"]);
  if (boot.gpio !== 0 || boot.activeLow !== true)
    invalid("invalid BOOT mapping");
  const reset = record(onboard.reset);
  keys(reset, ["signal", "activeLow"]);
  if (reset.signal !== "EN" || reset.activeLow !== true)
    invalid("invalid reset mapping");
  if (!Array.isArray(onboard.usb) || onboard.usb.length !== 2)
    invalid("expected two USB connectors");
  const native = record((onboard.usb as unknown[])[0]);
  keys(native, ["type", "role", "gpioDm", "gpioDp"]);
  if (
    native.type !== "USB-C" ||
    native.role !== "native" ||
    native.gpioDm !== 19 ||
    native.gpioDp !== 20
  )
    invalid("invalid native USB mapping");
  const bridge = record((onboard.usb as unknown[])[1]);
  keys(bridge, ["type", "role", "bridge", "uartTx", "uartRx"]);
  if (
    bridge.type !== "USB-C" ||
    bridge.role !== "usb-to-uart" ||
    bridge.bridge !== "CH343P" ||
    bridge.uartTx !== 43 ||
    bridge.uartRx !== 44
  )
    invalid("invalid bridge mapping");
  if (
    !Array.isArray(b.internalNets) ||
    JSON.stringify(b.internalNets) !==
      JSON.stringify([
        { name: "3V3", pinIds: ["P1.1", "P1.2"] },
        { name: "GND", pinIds: ["P1.22", "P2.1", "P2.21", "P2.22"] },
      ])
  )
    invalid("invalid shared rail mapping");
  if (
    !Array.isArray(b.sources) ||
    b.sources.length < 2 ||
    b.sources.length > 10
  )
    invalid("missing sources");
  for (const source of b.sources as unknown[]) {
    const s = record(source);
    keys(s, ["url", "revision", "purpose"]);
    if (!text(s.url).startsWith("https://")) invalid("invalid source URL");
    text(s.revision);
    text(s.purpose);
  }
  return structuredClone(input) as BoardDefinition;
}
/** @brief Published family pinout; exact V1.3 revision and installed memory remain explicitly unconfirmed. */
export const ydBoard = parseBoardDefinition(raw);
/** @brief Resolve a physical header terminal without interpreting it as a GPIO number. */
export function getBoardPin(id: string): BoardPin | undefined {
  return ydBoard.pins.find((pin) => pin.id === id);
}
/** @brief Check external output eligibility after module-memory reservations. */
export function supportsGPIOOutput(
  pin: BoardPin,
  memoryVariant = "unconfirmed",
): boolean {
  if (pin.gpio === null || pin.restrictions.includes("input-only"))
    return false;
  if (
    pin.restrictions.includes("reserved-on-octal-memory-variants") &&
    (memoryVariant === "N16R8" ||
      memoryVariant === "unconfirmed" ||
      !Object.hasOwn(ydBoard.memory.profiles, memoryVariant))
  )
    return false;
  return true;
}
/** @brief Describe physical position, GPIO aliases, functions and memory-dependent restrictions. */
export function boardPinTooltip(
  pin: BoardPin,
  memoryVariant = "unconfirmed",
): string {
  const alias =
    pin.gpio === null
      ? pin.label
      : `GPIO${pin.gpio}; Arduino-ESP32 digital${pin.arduinoPin}`;
  const memory = pin.restrictions.includes("reserved-on-octal-memory-variants")
    ? ` Memory: reserved on N16R8/octal-memory modules; ${memoryVariant === "unconfirmed" ? "confirm installed module before use" : memoryVariant}.`
    : "";
  return `${pin.id}; physical${pin.physicalNumber}; ${pin.side} header position${pin.headerIndex}; ${alias}; ${pin.electricalType}. ${pin.functions.join(", ")}.${pin.restrictions.length ? " Restrictions: " + pin.restrictions.join(", ") + "." : ""}${memory}`;
}
