import { bounded, checkTime, type Pins, type Contact } from "./contract";
/** @brief Powered 5V relay module (includes driver), not a bare coil. Contacts are isolated ideal switches. */
export class RelayModule {
  private time = 0;
  private changed = 0;
  private requested = false;
  private energized = false;
  constructor(
    readonly profile: {
      activeLow: boolean;
      logic3v3: boolean;
      delayUs: number;
      ratingV?: number;
      ratingA?: number;
    },
  ) {
    bounded(profile.delayUs, 0, 1e6, "Switch delay");
  }
  /** @brief Resolve input logic and mechanical delay; uncertain logic releases the relay after delay. */
  update(timeUs: number, pins: Pins) {
    checkTime(timeUs, this.time);
    this.time = timeUs;
    const warnings: string[] = [],
      g = pins.GND,
      v = pins.VCC,
      input = pins.IN;
    const powered =
      typeof v === "number" &&
      typeof g === "number" &&
      v - g >= 4.5 &&
      v - g <= 5.5;
    if (!powered) warnings.push("Relay module needs 4.5..5.5 V supply");
    const relative =
      typeof input === "number" && typeof g === "number" ? input - g : NaN;
    const high =
        relative >= (this.profile.logic3v3 ? 2 : 3.5) && relative <= 5.5,
      low = relative >= 0 && relative <= 0.8;
    if (!high && !low)
      warnings.push(
        "Relay input floating/ambiguous; 3.3 V compatibility depends on module profile",
      );
    const requested = powered && (this.profile.activeLow ? low : high);
    if (requested !== this.requested) {
      this.requested = requested;
      this.changed = timeUs;
    }
    if (timeUs - this.changed >= this.profile.delayUs)
      this.energized = requested;
    const contacts: Contact[] = [["COM", this.energized ? "NO" : "NC"]];
    const contactVoltage = pins.COM;
    if (
      typeof contactVoltage === "number" &&
      Math.abs(contactVoltage) > (this.profile.ratingV ?? 30)
    )
      warnings.push(
        "Contact voltage exceeds configured DC rating; mains simulation is unsupported",
      );
    return {
      energized: this.energized,
      contacts,
      warnings,
      currentA: powered ? (this.energized ? 0.075 : 0.003) : 0,
    };
  }
}
