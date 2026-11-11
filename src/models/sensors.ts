import { bounded, checkTime, type Pins, type ComponentModel } from "./contract";
import { modelState, supply, logic } from "./robotics";
/** @brief HX711 signed 24-bit serial behavioral converter. Ideal configured samples, not a precision analog/noise model.
 * @details Protocol source: AVIA HX711 V2.0 datasheet, MSB first, 25/26/27 clocks select A128/B32/A64.
 */
export class Hx711 implements ComponentModel {
  private time = 0;
  private readyAt: number;
  private clock: 0 | 1 | null = 0;
  private highAt = 0;
  private pulses = 0;
  private data = 1;
  private word = 0;
  private gain = 128;
  private channel = "A";
  private sleeping = false;
  private frames = 0;
  constructor(
    readonly profile: { rawValue: number; rateHz: number; rawValueB?: number },
  ) {
    bounded(profile.rawValue, -8388608, 8388607, "Signed sample");
    if (profile.rawValueB !== undefined)
      bounded(profile.rawValueB, -8388608, 8388607, "Channel B sample");
    if (![10, 80].includes(profile.rateHz))
      throw new Error("HX711 rate must be 10 or 80 Hz");
    this.readyAt = 1e6 / profile.rateHz;
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    this.time = t;
    const s = modelState(),
      powered = supply(p, "VCC", 2.6, 5.5),
      clock = logic(p, "SCK");
    if (!powered) {
      this.readyAt = t + 1e6 / this.profile.rateHz;
      this.pulses = 0;
      this.sleeping = false;
      this.gain = 128;
      this.channel = "A";
      this.data = 1;
      s.warnings.push("HX711 requires 2.6..5.5 V and GND");
    } else {
      if (clock === 1 && this.clock !== 1) this.highAt = t;
      if (clock === 1 && t - this.highAt > 60) {
        this.sleeping = true;
        this.pulses = 0;
        this.gain = 128;
        this.channel = "A";
        this.data = 1;
        this.readyAt = Infinity;
      }
      if (this.sleeping && clock === 0) {
        this.sleeping = false;
        this.readyAt = t + 1e6 / this.profile.rateHz;
      }
      if (!this.sleeping && t >= this.readyAt && this.pulses === 0) {
        this.data = 0;
        this.word =
          (Math.round(
            this.channel === "B"
              ? (this.profile.rawValueB ?? this.profile.rawValue)
              : this.profile.rawValue,
          ) *
            (this.channel === "A" ? this.gain / 128 : 1)) &
          0xffffff;
      }
      if (
        !this.sleeping &&
        clock === 1 &&
        this.clock === 0 &&
        t >= this.readyAt
      ) {
        this.pulses++;
        if (this.pulses <= 24)
          this.data = (this.word >>> (24 - this.pulses)) & 1;
        else {
          this.data = 1;
          if (this.pulses > 27)
            s.warnings.push("HX711 invalid frame: more than 27 clocks");
        }
      }
      // Keep gain-selection pulses available until the next conversion deadline.
      if (
        clock === 0 &&
        this.clock === 1 &&
        this.pulses >= 25 &&
        this.readyAt <= t
      ) {
        this.channel = this.pulses === 26 ? "B" : "A";
        this.gain = this.pulses === 26 ? 32 : this.pulses === 27 ? 64 : 128;
        this.readyAt = t + 1e6 / this.profile.rateHz;
        this.frames++;
      } else if (
        clock === 1 &&
        this.clock === 0 &&
        this.pulses >= 25 &&
        this.pulses < 27 &&
        t < this.readyAt
      ) {
        this.pulses++;
        this.channel = this.pulses === 26 ? "B" : "A";
        this.gain = this.pulses === 26 ? 32 : 64;
      }
      if (this.pulses >= 25 && clock === 0 && t >= this.readyAt) {
        this.pulses = 0;
        this.data = 0;
      }
    }
    this.clock = clock;
    s.outputs.DOUT = powered ? (this.data ? p.VCC! : p.GND!) : null;
    s.values = {
      ready: powered && !this.sleeping && this.data === 0 && this.pulses === 0,
      powered,
      powerDown: this.sleeping,
      pulses: this.pulses,
      gain: this.gain,
      channel: this.channel,
      frames: this.frames,
      rawValue: this.profile.rawValue,
    };
    s.warnings.push(
      "Ideal sample stimulus; bridge noise, calibration drift and analog conversion accuracy are not modeled",
    );
    return s;
  }
}
/** @brief AM2302/DHT22 open-drain 40-bit timed sensor frame using supplied simulation microseconds.
 * @details Start >=800us; response 80us LOW/HIGH; bits 50us LOW then 28/70us HIGH; minimum 2s between frames.
 * Connect an external pull-up resistor. Temperature/humidity are scene stimulus, never fabricated MCU results.
 */
export class Dht22 implements ComponentModel {
  private time = 0;
  private lowAt: number | null = null;
  private previous: 0 | 1 | null = 1;
  private frameStart: number | null = null;
  private end = 0;
  private next = -Infinity;
  private frames = 0;
  private segments: { end: number; low: boolean }[] = [];
  constructor(readonly profile: { temperatureC: number; humidityPct: number }) {
    bounded(profile.temperatureC, -40, 80, "Temperature");
    bounded(profile.humidityPct, 0, 100, "Humidity");
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    this.time = t;
    const s = modelState(),
      powered = supply(p, "VCC", 3.3, 5.5),
      input = logic(p, "DATA");
    if (!powered) {
      this.frameStart = null;
      this.lowAt = null;
      this.segments = [];
      s.warnings.push("DHT22 requires 3.3..5.5 V and GND");
    } else if (this.frameStart !== null) {
      if (t >= this.end) {
        this.frameStart = null;
        this.frames++;
        this.previous = input;
        this.lowAt = null;
      }
    } else {
      if (input === 0 && this.previous !== 0) this.lowAt = t;
      if (input !== 0 && this.previous === 0 && this.lowAt !== null) {
        if (t - this.lowAt >= 800 && t >= this.next) {
          this.frameStart = t;
          this.next = t + 2e6;
          let at = t + 20;
          this.segments = [
            { end: at, low: false },
            { end: (at += 80), low: true },
            { end: (at += 80), low: false },
          ];
          const h = Math.round(this.profile.humidityPct * 10),
            temp =
              Math.round(Math.abs(this.profile.temperatureC) * 10) |
              (this.profile.temperatureC < 0 ? 0x8000 : 0),
            bytes = [h >> 8, h & 255, temp >> 8, temp & 255];
          bytes.push(bytes.reduce((a, b) => a + b, 0) & 255);
          for (const byte of bytes)
            for (let bit = 7; bit >= 0; bit--) {
              this.segments.push(
                { end: (at += 50), low: true },
                { end: (at += (byte >> bit) & 1 ? 70 : 28), low: false },
              );
            }
          this.segments.push({ end: (at += 50), low: true });
          this.end = at;
        } else if (t < this.next)
          s.warnings.push("DHT22 read interval must be at least 2 seconds");
        this.lowAt = null;
      }
      this.previous = input;
    }
    const low =
      this.frameStart !== null &&
      this.segments.find((segment) => t < segment.end)?.low === true;
    s.outputs.DATA = powered && low ? p.GND! : null;
    s.values = {
      powered,
      temperatureC: this.profile.temperatureC,
      humidityPct: this.profile.humidityPct,
      busy: this.frameStart !== null,
      frames: this.frames,
    };
    return s;
  }
}
