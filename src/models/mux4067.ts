import { checkTime, type Pins, type Contact } from "./contract";
/** @brief Separate single-supply behavioral profiles; delays are configurable nominal approximations. */
export const muxProfiles = {
  HC: { min: 2, max: 6, delayUs: 0.1, onOhms: 70 },
  B: { min: 3, max: 18, delayUs: 0.3, onOhms: 125 },
} as const;
/** @brief Bidirectional ideal contact plus validation; no voltage source is fabricated. */
export class Mux4067 {
  private time = 0;
  private selected: number | null = null;
  private changed = 0;
  constructor(readonly variant: "HC" | "B" = "HC") {
    if (!muxProfiles[variant]) throw new Error("Unknown 4067 variant");
  }
  /** @param timeUs Absolute simulation time. @param pins Resolved supply, select, inhibit and signal voltages. */
  update(timeUs: number, pins: Pins) {
    checkTime(timeUs, this.time);
    this.time = timeUs;
    const profile = muxProfiles[this.variant],
      g = pins.GND,
      supply = pins.VCC;
    const warnings: string[] = [];
    const v =
      typeof g === "number" && typeof supply === "number" ? supply - g : NaN;
    const valid = Number.isFinite(v) && v >= profile.min && v <= profile.max;
    if (!valid)
      warnings.push(
        `${this.variant} supply must be ${profile.min}..${profile.max} V`,
      );
    const logic = (key: string) => {
      const n = pins[key];
      if (typeof n !== "number" || typeof g !== "number") return null;
      return n - g <= 0.3 * v ? 0 : n - g >= 0.7 * v ? 1 : null;
    };
    const bits = [0, 1, 2, 3].map((i) => logic(`S${i}`));
    const next =
      valid && logic("EN") === 0 && bits.every((b) => b !== null)
        ? bits.reduce<number>((n, b, i) => n + ((b ?? 0) << i), 0)
        : null;
    if (next !== this.selected) {
      this.selected = next;
      this.changed = timeUs;
    }
    let channel =
      timeUs - this.changed >= profile.delayUs ? this.selected : null;
    if (channel !== null)
      for (const key of ["COM", `C${channel}`]) {
        const n = pins[key];
        if (typeof n === "number" && (n < g! || n > supply!)) {
          warnings.push(`${key} signal outside supply range`);
          channel = null;
          break;
        }
      }
    const contacts: Contact[] =
      channel === null ? [] : [["COM", `C${channel}`]];
    return {
      channel,
      contacts,
      warnings,
      onOhms: profile.onOhms,
      value:
        channel === null ? null : (pins[`C${channel}`] ?? pins.COM ?? null),
    };
  }
}
