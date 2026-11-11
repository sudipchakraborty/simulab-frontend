import { bounded, checkTime } from "./contract";
/** @brief Bounded WS2812B GRB decoder driven by timestamped pin edges, with 280us reset profile.
 * @param count Number of pixels consumed from a daisy chain, 1..256.
 * @param brightness Display/power scale, 0..1; firmware brightness normally resides in transmitted bytes.
 */
export class Ws2812 {
  private time = 0;
  private rise = 0;
  private fall = 0;
  private level = 0;
  private bits: number[] = [];
  private pixels: number[][];
  private errors = 0;
  private invalid = false;
  constructor(
    readonly count = 1,
    readonly brightness = 1,
    readonly offset = 0,
  ) {
    bounded(count, 1, 256, "LED count");
    if (!Number.isInteger(count)) throw new Error("LED count must be integer");
    bounded(brightness, 0, 1, "Brightness");
    this.pixels = Array.from({ length: count }, () => [0, 0, 0]);
    bounded(offset, 0, 255, "Chain offset");
    if (count + offset > 256) throw new Error("Chain exceeds 256 pixels");
  }
  /** @brief Consume a real GPIO edge. High widths distinguish zero/one, malformed frames are discarded. */
  edge(timeUs: number, level: 0 | 1) {
    this.advance(timeUs);
    if (level === this.level) return;
    if (level === 1) {
      if (
        this.bits.length &&
        timeUs - this.fall > 1.1 &&
        timeUs - this.fall < 280
      ) {
        this.invalid = true;
        this.errors++;
      }
      this.rise = timeUs;
    } else {
      const high = timeUs - this.rise;
      if (high >= 0.2 && high <= 0.5) this.bits.push(0);
      else if (high >= 0.55 && high <= 0.95) this.bits.push(1);
      else {
        this.invalid = true;
        this.errors++;
      }
      if (this.bits.length > 256 * 24) {
        this.invalid = true;
        this.bits = [];
        this.errors++;
      }
      this.fall = timeUs;
    }
    this.level = level;
  }
  /** @brief Latch only complete valid frames after the reset low interval. */
  advance(timeUs: number) {
    checkTime(timeUs, this.time);
    this.time = timeUs;
    if (
      this.level === 0 &&
      timeUs - this.fall >= 280 &&
      (this.bits.length || this.invalid)
    ) {
      if (
        !this.invalid &&
        this.bits.length >= (this.count + this.offset) * 24
      ) {
        for (let n = 0; n < this.count; n++) {
          const byte = (offset: number) =>
            this.bits
              .slice(
                (n + this.offset) * 24 + offset,
                (n + this.offset) * 24 + offset + 8,
              )
              .reduce((a, b) => a * 2 + b, 0);
          this.pixels[n] = [byte(8), byte(0), byte(16)];
        }
      } else if (!this.invalid) this.errors++;
      this.bits = [];
      this.invalid = false;
    }
  }
  /** @brief Read RGB output and an approximate 20mA-per-channel power estimate. */
  snapshot() {
    return {
      colors: this.pixels.map(
        (p) =>
          "#" +
          p
            .map((v) =>
              Math.round(v * this.brightness)
                .toString(16)
                .padStart(2, "0"),
            )
            .join(""),
      ),
      currentA:
        this.count * 0.001 +
        (this.pixels.flat().reduce((a, b) => a + b, 0) / 255) *
          0.02 *
          this.brightness,
      errors: this.errors,
    };
  }
  /** @brief Remove power: clear volatile pixels/partial frame, preserving the absolute host time. */
  powerOff() {
    this.pixels = Array.from({ length: this.count }, () => [0, 0, 0]);
    this.bits = [];
    this.invalid = false;
    this.level = 0;
    this.fall = this.time;
  }
}
