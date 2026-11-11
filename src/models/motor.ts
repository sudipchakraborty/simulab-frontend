import { bounded, checkTime } from "./contract";
/** @brief Ideal powered H-bridge output. PWM is a duty-averaged terminal voltage, not a GPIO supply. */
export function hBridge(
  supply: number,
  in1: boolean,
  in2: boolean,
  duty: number,
) {
  bounded(supply, 0, 48, "Motor supply");
  bounded(duty, 0, 1, "PWM duty");
  return {
    voltage: in1 === in2 ? 0 : supply * duty * (in1 ? 1 : -1),
    brake: in1 === in2,
  };
}
/** @brief Approximate brushed motor with winding resistance, back EMF and viscous load.
 * @param config SI units except ratedRpm. Load is viscous drag in N m s/rad.
 */
export class DcMotor {
  private time = 0;
  private omega = 0;
  private angle = 0;
  readonly ke: number;
  constructor(
    readonly config: {
      ratedVoltage: number;
      ratedRpm: number;
      resistance: number;
      inertia: number;
      load: number;
    },
  ) {
    bounded(config.ratedVoltage, 0.1, 48, "Rated voltage");
    bounded(config.ratedRpm, 1, 100000, "Rated RPM");
    bounded(config.resistance, 0.01, 1e5, "Resistance");
    bounded(config.inertia, 1e-9, 100, "Inertia");
    bounded(config.load, 0, 100, "Load");
    this.ke = config.ratedVoltage / ((config.ratedRpm * Math.PI) / 30);
  }
  /** @brief Integrate exact first-order winding/mechanical approximation at the supplied terminal voltage. */
  update(timeUs: number, voltage: number, stalled = false) {
    checkTime(timeUs, this.time);
    bounded(voltage, -100, 100, "Terminal voltage");
    const dt = (timeUs - this.time) / 1e6;
    this.time = timeUs;
    const { resistance: r, inertia: j, load } = this.config;
    const friction = load + (this.ke * this.ke) / r + 1e-7;
    const target = (this.ke * voltage) / r / friction;
    const previous = this.omega;
    this.omega = stalled
      ? 0
      : target + (this.omega - target) * Math.exp((-friction / j) * dt);
    this.angle =
      (this.angle + (previous + this.omega) * 0.5 * dt) % (2 * Math.PI);
    const backEmfV = this.omega * this.ke,
      currentA = (voltage - backEmfV) / r;
    return {
      rpm: (this.omega * 30) / Math.PI,
      currentA,
      torqueNm: currentA * this.ke,
      backEmfV,
      angle: this.angle,
      stalled,
      direction: this.omega >= 0 ? "CW" : "CCW",
    };
  }
}
