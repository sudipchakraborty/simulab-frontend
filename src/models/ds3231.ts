/** @file Deterministic DS3231 register device; no wall clock or host API dependencies. */
const bcd = (n: number) => (Math.floor(n / 10) << 4) | (n % 10);
const dec = (n: number) => (n >> 4) * 10 + (n & 15);
const hour = (n: number) =>
  n & 0x40 ? (dec(n & 0x1f) % 12) + (n & 0x20 ? 12 : 0) : dec(n & 0x3f);
/** @brief Addressable I2C register device with alarm flags and sampled clock outputs.
 * @param options UTC power-on epoch and optional nonphysical address override for circuit exercises.
 */
export class Ds3231 {
  readonly address: number;
  private registers = new Uint8Array(0x13);
  private pointer = 0;
  private epoch: number;
  private timeUs = 0;
  private fractionUs = 0;
  private twelveHour = false;
  private day = 1;
  constructor(options: { epoch?: string; address?: number } = {}) {
    this.address = options.address ?? 0x68;
    this.epoch = Date.parse(options.epoch ?? "2026-01-01T00:00:00Z");
    if (
      !Number.isFinite(this.epoch) ||
      this.epoch < Date.UTC(2000, 0, 1) ||
      this.epoch >= Date.UTC(2200, 0, 1)
    )
      throw new Error("RTC epoch must be in 2000..2199");
    if (
      !Number.isInteger(this.address) ||
      this.address < 8 ||
      this.address > 0x77
    )
      throw new Error("Invalid I2C address");
    this.day = new Date(this.epoch).getUTCDay() + 1;
    this.registers[0x0e] = 0x1c;
    this.registers[0x0f] = 0x88;
    this.registers[0x11] = 25;
    this.refresh();
  }
  private refresh() {
    const d = new Date(this.epoch),
      h = d.getUTCHours();
    this.registers.set(
      [
        bcd(d.getUTCSeconds()),
        bcd(d.getUTCMinutes()),
        this.twelveHour
          ? 0x40 | (h >= 12 ? 0x20 : 0) | bcd(h % 12 || 12)
          : bcd(h),
        this.day,
        bcd(d.getUTCDate()),
        bcd(d.getUTCMonth() + 1) | (d.getUTCFullYear() >= 2100 ? 0x80 : 0),
        bcd(d.getUTCFullYear() % 100),
      ],
      0,
    );
  }
  private alarm(offset: number, second: boolean) {
    const d = new Date(this.epoch),
      r = this.registers;
    let i = offset;
    if (second && !(r[i] & 128) && dec(r[i] & 0x7f) !== d.getUTCSeconds())
      return false;
    if (second) i++;
    if (!(r[i] & 128) && dec(r[i] & 0x7f) !== d.getUTCMinutes()) return false;
    i++;
    if (!(r[i] & 128) && hour(r[i] & 0x7f) !== d.getUTCHours()) return false;
    i++;
    return (
      !!(r[i] & 128) ||
      dec(r[i] & 0x3f) === (r[i] & 0x40 ? this.day : d.getUTCDate())
    );
  }
  /** @brief Advance to absolute simulation microseconds, latching every intervening alarm second. */
  advance(timeUs: number) {
    if (!Number.isFinite(timeUs) || timeUs < this.timeUs)
      throw new Error("RTC time must be monotonic");
    this.fractionUs += timeUs - this.timeUs;
    this.timeUs = timeUs;
    const seconds = Math.floor(this.fractionUs / 1e6);
    if (seconds > 86400)
      throw new Error("RTC advance exceeds one-day batch limit");
    this.fractionUs -= seconds * 1e6;
    for (let n = 0; n < seconds; n++) {
      this.epoch += 1000;
      const d = new Date(this.epoch);
      if (
        d.getUTCHours() === 0 &&
        d.getUTCMinutes() === 0 &&
        d.getUTCSeconds() === 0
      )
        this.day = (this.day % 7) + 1;
      if (this.alarm(7, true)) this.registers[0x0f] |= 1;
      if (d.getUTCSeconds() === 0 && this.alarm(0x0b, false))
        this.registers[0x0f] |= 2;
    }
    this.refresh();
  }
  /** @brief Perform a complete I2C write: first byte is register pointer; false means NACK. */
  write(address: number, bytes: number[]): boolean {
    if (address !== this.address) return false;
    if (
      !bytes.length ||
      bytes.some((v) => !Number.isInteger(v) || v < 0 || v > 255)
    )
      throw new Error("Invalid I2C write");
    this.pointer = bytes[0] % 0x13;
    for (const value of bytes.slice(1)) {
      const p = this.pointer;
      if (p === 0x0f)
        this.registers[p] = (this.registers[p] & value & 0x83) | (value & 8);
      else if (p < 0x11) this.registers[p] = value;
      if (p <= 6) {
        const r = this.registers;
        this.twelveHour = !!(r[2] & 0x40);
        this.day = Math.min(7, Math.max(1, r[3] & 7));
        const year = 2000 + dec(r[6]) + (r[5] & 128 ? 100 : 0);
        this.epoch = Date.UTC(
          year,
          Math.max(0, dec(r[5] & 31) - 1),
          Math.max(1, dec(r[4] & 63)),
          hour(r[2]),
          dec(r[1] & 127),
          dec(r[0] & 127),
        );
        if (p === 0) this.fractionUs = 0;
      }
      this.pointer = (p + 1) % 0x13;
    }
    this.refresh();
    return true;
  }
  /** @brief Read sequential registers after setting the register pointer. */
  read(address: number, count: number): number[] {
    if (address !== this.address) return [];
    if (!Number.isInteger(count) || count < 0 || count > 256)
      throw new Error("Invalid I2C read length");
    return Array.from({ length: count }, () => {
      const v = this.registers[this.pointer];
      this.pointer = (this.pointer + 1) % 0x13;
      return v;
    });
  }
  /** @brief Return observable state; SQW and 32K are sampled levels, INT is open-drain. */
  snapshot() {
    const control = this.registers[14],
      status = this.registers[15];
    const hz = [1, 1024, 4096, 8192][(control >> 3) & 3];
    return {
      iso: new Date(this.epoch).toISOString(),
      lostPower: !!(status & 128),
      alarm1: !!(status & 1),
      alarm2: !!(status & 2),
      interruptLow: !!(
        control & 4 &&
        ((control & 1 && status & 1) || (control & 2 && status & 2))
      ),
      sqw: control & 4 ? null : Math.floor((this.timeUs * hz * 2) / 1e6) % 2,
      clock32k:
        status & 8 ? Math.floor((this.timeUs * 32768 * 2) / 1e6) % 2 : null,
    };
  }
}
