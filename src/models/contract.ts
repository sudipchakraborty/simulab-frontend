/** @file Portable behavioral model contracts. Voltages are relative to the circuit reference. */
export type Pins = Readonly<Record<string, number | null | undefined>>;
export type Contact = readonly [string, string];
export interface ModelSnapshot {
  values: Record<string, string | number | boolean | null>;
  warnings: string[];
  contacts: Contact[];
  outputs: Record<string, number | null>;
}
/** @brief Model hosts supply monotonic simulation microseconds and resolved pin voltages. */
export interface ComponentModel {
  update(timeUs: number, pins: Pins): ModelSnapshot;
}
/** @brief Reject reversed or nonfinite time before mutating model state. */
export function checkTime(next: number, previous: number) {
  if (!Number.isFinite(next) || next < previous || next < 0)
    throw new Error("Simulation time must be finite and monotonic");
}
/** @brief Return a bounded numeric configuration value or throw a useful validation error. */
export function bounded(value: number, min: number, max: number, name: string) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} must be ${min}..${max}`);
  return value;
}
