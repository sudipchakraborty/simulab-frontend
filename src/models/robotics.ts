import {
  bounded,
  checkTime,
  type ComponentModel,
  type ModelSnapshot,
  type Pins,
} from "./contract";
/** @brief Shared electrically bounded primitives for powered driver assemblies. */
export const modelState = (): ModelSnapshot => ({
  values: {},
  outputs: {},
  contacts: [],
  warnings: [],
});
export function supply(p: Pins, rail = "VCC", min = 3, max = 6) {
  const v = p[rail],
    g = p.GND;
  return (
    typeof v === "number" &&
    typeof g === "number" &&
    v - g >= min &&
    v - g <= max
  );
}
export function logic(p: Pins, pin: string): 0 | 1 | null {
  const v = p[pin],
    g = p.GND;
  if (typeof v !== "number" || typeof g !== "number") return null;
  const r = v - g;
  return r >= 0 && r <= 0.8 ? 0 : r >= 2 && r <= 5.5 ? 1 : null;
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
/** @brief Active-low enable STEP/DIR driver with ideal bounded coil outputs, no fabricated mechanical feedback. */
export class StepperDriver implements ComponentModel {
  private time = 0;
  private last: 0 | 1 | null = null;
  private edge = -Infinity;
  private steps = 0;
  constructor(readonly profile: { stepsPerTurn: number; maxStepHz: number }) {
    bounded(profile.stepsPerTurn, 1, 10000, "Steps per turn");
    bounded(profile.maxStepHz, 1, 100000, "Step frequency");
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    this.time = t;
    const s = modelState(),
      step = logic(p, "STEP"),
      dir = logic(p, "DIR"),
      enabled = supply(p) && supply(p, "VM", 2, 48) && logic(p, "EN") === 0;
    if (enabled && step === 1 && this.last === 0 && dir !== null) {
      if (t - this.edge >= 1e6 / this.profile.maxStepHz) {
        this.steps += dir ? 1 : -1;
        this.edge = t;
      } else s.warnings.push("Step rate exceeds configured driver limit");
    }
    this.last = step;
    const sequence = [
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1],
      ],
      phase = sequence[((this.steps % 4) + 4) % 4];
    ["A1", "A2", "B1", "B2"].forEach(
      (pin, i) =>
        (s.outputs[pin] = enabled ? (phase[i] ? p.VM! : p.GND!) : null),
    );
    s.values = {
      enabled,
      steps: this.steps,
      angleDeg: (this.steps * 360) / this.profile.stepsPerTurn,
    };
    if (!enabled)
      s.warnings.push(
        "Driver disabled or missing valid VCC/VM/GND and active-low EN",
      );
    return s;
  }
}
/** @brief Four-terminal full-step educational winding model; accepts powered driver sequence only. */
export class StepperMotor implements ComponentModel {
  private time = 0;
  private phase: number | null = null;
  private steps = 0;
  constructor(readonly profile: { stepsPerTurn: number }) {
    bounded(profile.stepsPerTurn, 1, 10000, "Steps per turn");
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    this.time = t;
    const s = modelState(),
      vs = ["A1", "A2", "B1", "B2"].map((k) => p[k]);
    let phase: number | null = null;
    if (vs.every((v) => typeof v === "number" && v >= 0 && v <= 48)) {
      const [a, b, c, d] = vs as number[];
      const x = a - b,
        y = c - d;
      if (Math.abs(x) >= 1 && Math.abs(y) < 0.1) phase = x > 0 ? 0 : 2;
      if (Math.abs(y) >= 1 && Math.abs(x) < 0.1) phase = y > 0 ? 1 : 3;
    }
    if (phase !== null && this.phase !== null && phase !== this.phase) {
      const delta = (phase - this.phase + 4) % 4;
      if (delta === 1) this.steps++;
      else if (delta === 3) this.steps--;
      else s.warnings.push("Skipped/invalid full-step sequence");
    }
    this.phase = phase;
    s.values = {
      steps: this.steps,
      angleDeg: (this.steps * 360) / this.profile.stepsPerTurn,
      powered: phase !== null,
    };
    if (phase === null)
      s.warnings.push("No valid powered full-step coil sequence");
    return s;
  }
}
/** @brief Standard hobby-servo PWM decoder and deterministic slew. Timings are configurable simulation assumptions. */
export class Servo implements ComponentModel {
  private time = 0;
  private rising: number | null = null;
  private previous: 0 | 1 | null = null;
  private target = 0;
  private angle = 0;
  private frames = 0;
  constructor(
    readonly profile: { minAngle: number; maxAngle: number; speedDegS: number },
  ) {
    bounded(profile.minAngle, -360, 360, "Minimum angle");
    bounded(profile.maxAngle, profile.minAngle, 360, "Maximum angle");
    bounded(profile.speedDegS, 0.01, 2000, "Servo speed");
    this.angle = this.target = clamp(0, profile.minAngle, profile.maxAngle);
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    const dt = (t - this.time) / 1e6;
    this.time = t;
    const s = modelState(),
      powered = supply(p, "VCC", 4.5, 6),
      input = logic(p, "PWM");
    if (powered) {
      this.angle += clamp(
        this.target - this.angle,
        -this.profile.speedDegS * dt,
        this.profile.speedDegS * dt,
      );
      if (input === 1 && this.previous !== 1) this.rising = t;
      if (input === 0 && this.previous === 1 && this.rising !== null) {
        const width = t - this.rising;
        if (width >= 1000 && width <= 2000) {
          this.target =
            this.profile.minAngle +
            ((width - 1000) / 1000) *
              (this.profile.maxAngle - this.profile.minAngle);
          this.frames++;
        } else s.warnings.push("Invalid servo pulse: expected 1000..2000 us");
        this.rising = null;
      }
    } else {
      this.rising = null;
      s.warnings.push("Servo requires 4.5..6 V power and ground");
    }
    this.previous = input;
    s.values = {
      powered,
      angleDeg: this.angle,
      targetDeg: this.target,
      frames: this.frames,
    };
    return s;
  }
}
export type ArmProfile =
  "arm-6dof" | "universal-arm" | "dobot-magician" | "uarm-metal";
/** @brief Approximate educational geometry. Profiles are configurable, not vendor USB or certified CAD emulations. */
export const armProfiles: Record<
  ArmProfile,
  {
    joints: number;
    limits: readonly (readonly [number, number])[];
    link1Mm: number;
    link2Mm: number;
  }
> = {
  "arm-6dof": {
    joints: 6,
    limits: [
      [-180, 180],
      [-90, 90],
      [-135, 135],
      [-180, 180],
      [-120, 120],
      [-180, 180],
    ],
    link1Mm: 200,
    link2Mm: 160,
  },
  "universal-arm": {
    joints: 6,
    limits: [
      [-180, 180],
      [-180, 180],
      [-180, 180],
      [-180, 180],
      [-180, 180],
      [-180, 180],
    ],
    link1Mm: 250,
    link2Mm: 220,
  },
  "dobot-magician": {
    joints: 4,
    limits: [
      [-135, 135],
      [-5, 85],
      [-10, 95],
      [-90, 90],
    ],
    link1Mm: 135,
    link2Mm: 147,
  },
  "uarm-metal": {
    joints: 4,
    limits: [
      [-90, 90],
      [0, 90],
      [-90, 90],
      [-90, 90],
    ],
    link1Mm: 148,
    link2Mm: 160,
  },
};
/** @brief Forward kinematics: base yaw, shoulder/elbow planar links plus wrist orientation. Units millimetres/degrees. */
export function armKinematics(
  joints: readonly number[],
  link1Mm: number,
  link2Mm: number,
) {
  const r = Math.PI / 180,
    yaw = (joints[0] ?? 0) * r,
    a = (joints[1] ?? 0) * r,
    b = a + (joints[2] ?? 0) * r,
    reach = link1Mm * Math.cos(a) + link2Mm * Math.cos(b);
  return {
    toolX: reach * Math.cos(yaw),
    toolY: reach * Math.sin(yaw),
    toolZ: 80 + link1Mm * Math.sin(a) + link2Mm * Math.sin(b),
    yawDeg: (joints[0] ?? 0) + (joints[5] ?? 0),
    pitchDeg: (joints[1] ?? 0) + (joints[2] ?? 0) + (joints[4] ?? 0),
    rollDeg: joints[3] ?? 0,
  };
}
/** @brief Reusable integrated powered servo arm, each joint commanded by actual J1..J6 PWM pulses. */
export class RobotArm implements ComponentModel {
  private servos: Servo[];
  readonly geometry: (typeof armProfiles)[ArmProfile];
  constructor(
    readonly profile: {
      profile: ArmProfile;
      link1Mm: number;
      link2Mm: number;
      speedDegS: number;
    },
  ) {
    this.geometry = armProfiles[profile.profile];
    if (!this.geometry) throw new Error("Unknown arm profile");
    bounded(profile.link1Mm, 1, 5000, "Link 1");
    bounded(profile.link2Mm, 1, 5000, "Link 2");
    this.servos = this.geometry.limits.map(
      ([minAngle, maxAngle]) =>
        new Servo({ minAngle, maxAngle, speedDegS: profile.speedDegS }),
    );
  }
  update(t: number, p: Pins) {
    const s = modelState(),
      joints = this.servos.map((servo, i) => {
        const state = servo.update(t, { ...p, PWM: p[`J${i + 1}`] });
        s.values[`joint${i + 1}Deg`] = state.values.angleDeg;
        s.values[`target${i + 1}Deg`] = state.values.targetDeg;
        for (const w of state.warnings) s.warnings.push(`J${i + 1}: ${w}`);
        return Number(state.values.angleDeg);
      });
    s.values = {
      ...s.values,
      ...armKinematics(joints, this.profile.link1Mm, this.profile.link2Mm),
      powered: supply(p, "VCC", 4.5, 6),
      profile: this.profile.profile,
      joints: this.geometry.joints,
    };
    s.warnings.push(
      "Approximate educational profile; configurable geometry and limits; no vendor USB/serial or collision dynamics",
    );
    return s;
  }
}
/** @brief Powered conveyor or four-wheel skid-steer assembly with integrated H-bridges. */
export class MotionAssembly implements ComponentModel {
  private time = 0;
  private x = 0;
  private y = 0;
  private heading = 0;
  private distance = 0;
  constructor(
    readonly profile: {
      type: "car" | "conveyor";
      speed: number;
      trackM: number;
    },
  ) {
    bounded(profile.speed, 0.001, 20, "Assembly speed");
    bounded(profile.trackM, 0.01, 10, "Wheel track");
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    const dt = (t - this.time) / 1e6;
    this.time = t;
    const s = modelState(),
      enabled = supply(p) && supply(p, "VM", 3, 48) && logic(p, "EN") === 1;
    const direction = (a: string, b: string) => {
      const x = logic(p, a),
        y = logic(p, b);
      return x === null || y === null ? 0 : x - y;
    };
    const l = enabled ? direction("IN1", "IN2") * this.profile.speed : 0,
      r =
        this.profile.type === "car"
          ? enabled
            ? direction("IN3", "IN4") * this.profile.speed
            : 0
          : l,
      speed = (l + r) / 2,
      omega = (r - l) / this.profile.trackM;
    const h = this.heading;
    if (Math.abs(omega) > 1e-9) {
      this.x += (speed / omega) * (Math.sin(h + omega * dt) - Math.sin(h));
      this.y -= (speed / omega) * (Math.cos(h + omega * dt) - Math.cos(h));
    } else {
      this.x += speed * Math.cos(h) * dt;
      this.y += speed * Math.sin(h) * dt;
    }
    this.heading += omega * dt;
    this.distance += speed * dt;
    s.values = {
      enabled,
      speedMps: speed,
      leftMps: l,
      rightMps: r,
      distanceM: this.distance,
      xM: this.x,
      yM: this.y,
      headingRad: this.heading,
    };
    if (!enabled)
      s.warnings.push("Assembly requires VM, VCC, GND and valid EN");
    s.warnings.push(
      "Ideal no-slip educational mechanics; no load, collision or traction dynamics",
    );
    return s;
  }
}
/** @brief Host-local optical channel. Pair IDs, geometry and obstruction are explicit parameters. */
export class OpticalChannel {
  private emitters = new Map<
    string,
    { channel: string; on: boolean; x: number; y: number; range: number }
  >();
  emit(
    id: string,
    channel: string,
    on: boolean,
    x: number,
    y: number,
    range: number,
  ) {
    this.emitters.set(id, { channel, on, x, y, range });
  }
  detect(channel: string, x: number, y: number, blocked: boolean) {
    return (
      !blocked &&
      [...this.emitters.values()].some(
        (e) =>
          e.channel === channel &&
          e.on &&
          Math.hypot(e.x - x, e.y - y) <= e.range,
      )
    );
  }
}
/** @brief Powered digital IR modules; detector uses shared optical pairing, not a direct fake electrical wire. */
export class IrModule implements ComponentModel {
  private time = 0;
  constructor(
    readonly config: {
      id: string;
      emitter: boolean;
      channel: string;
      x: number;
      y: number;
      range: number;
      blocked: boolean;
    },
    readonly optical: OpticalChannel,
  ) {
    bounded(config.x, -10000, 10000, "Optical x");
    bounded(config.y, -10000, 10000, "Optical y");
    bounded(config.range, 0.001, 10000, "Optical range");
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    this.time = t;
    const s = modelState(),
      powered = supply(p);
    if (this.config.emitter) {
      const on = powered && logic(p, "IN") === 1;
      this.optical.emit(
        this.config.id,
        this.config.channel,
        on,
        this.config.x,
        this.config.y,
        this.config.range,
      );
      s.values = { powered, emitting: on, channel: this.config.channel };
    } else {
      const detected =
        powered &&
        this.optical.detect(
          this.config.channel,
          this.config.x,
          this.config.y,
          this.config.blocked,
        );
      s.outputs.OUT = powered ? (detected ? p.GND! : p.VCC!) : null;
      s.values = { powered, detected, channel: this.config.channel };
    }
    if (!powered) s.warnings.push("IR module requires VCC and ground");
    return s;
  }
}
/** @brief Bare electromagnetic coil and isolated contact set. A driver is required; no GPIO power is implied. */
export class ElectromagneticSwitch implements ComponentModel {
  private time = 0;
  private since = 0;
  private requested = false;
  private active = false;
  constructor(
    readonly profile: {
      ratedVoltage: number;
      resistanceOhms: number;
      delayUs: number;
    },
  ) {
    bounded(profile.ratedVoltage, 1, 48, "Coil voltage");
    bounded(profile.resistanceOhms, 1, 100000, "Coil resistance");
    bounded(profile.delayUs, 0, 1e6, "Coil delay");
  }
  update(t: number, p: Pins) {
    checkTime(t, this.time);
    this.time = t;
    const s = modelState(),
      v =
        typeof p.COIL_POS === "number" && typeof p.COIL_NEG === "number"
          ? Math.abs(p.COIL_POS - p.COIL_NEG)
          : 0,
      requested =
        v >= this.profile.ratedVoltage * 0.8 &&
        v <= this.profile.ratedVoltage * 1.2;
    if (requested !== this.requested) {
      this.requested = requested;
      this.since = t;
    }
    if (t - this.since >= this.profile.delayUs) this.active = requested;
    s.contacts = [["COM", this.active ? "NO" : "NC"]];
    s.values = {
      energized: this.active,
      coilCurrentA: v / this.profile.resistanceOhms,
    };
    if (v > this.profile.ratedVoltage * 1.2)
      s.warnings.push("Coil overvoltage; deenergization requested");
    return s;
  }
}
