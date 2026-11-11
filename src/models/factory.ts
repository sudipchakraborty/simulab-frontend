import { validateModelProperties } from "./parameters";
import type { CircuitComponent } from "../circuit/types";
import type { ComponentModel } from "./contract";
import { expandedDefinitions } from "./expandedDefinitions";
import {
  StepperDriver,
  StepperMotor,
  Servo,
  RobotArm,
  MotionAssembly,
  IrModule,
  OpticalChannel,
  ElectromagneticSwitch,
  type ArmProfile,
} from "./robotics";
import { Hx711, Dht22 } from "./sensors";
/** @brief Factory registry accepts circuit parameters and a host-local optical bus; no engine or React dependencies. */
export function createExpandedModel(
  c: CircuitComponent,
  optical: OpticalChannel,
): ComponentModel | undefined {
  const defaults =
    expandedDefinitions[c.kind as keyof typeof expandedDefinitions];
  if (!defaults) return;
  const p = { ...defaults.defaultProperties, ...c.properties };
  validateModelProperties(c.kind, p);
  const n = (key: string) => Number(p[key]);
  switch (c.kind) {
    case "hx711":
      return new Hx711({
        rawValue: n("rawValue"),
        rawValueB: n("rawValueB"),
        rateHz: n("rateHz"),
      });
    case "dht22":
      return new Dht22({
        temperatureC: n("temperatureC"),
        humidityPct: n("humidityPct"),
      });
    case "stepper-driver":
      return new StepperDriver({
        stepsPerTurn: n("stepsPerTurn"),
        maxStepHz: n("maxStepHz"),
      });
    case "stepper":
      return new StepperMotor({ stepsPerTurn: n("stepsPerTurn") });
    case "servo":
      return new Servo({
        minAngle: n("minAngle"),
        maxAngle: n("maxAngle"),
        speedDegS: n("speedDegS"),
      });
    case "arm-6dof":
    case "universal-arm":
    case "dobot-magician":
    case "uarm-metal":
      return new RobotArm({
        profile: c.kind as ArmProfile,
        link1Mm: n("link1Mm"),
        link2Mm: n("link2Mm"),
        speedDegS: n("speedDegS"),
      });
    case "conveyor":
    case "robotic-car":
      return new MotionAssembly({
        type: c.kind === "conveyor" ? "conveyor" : "car",
        speed: n("speedMps"),
        trackM: n("trackM"),
      });
    case "electromagnetic-switch":
      return new ElectromagneticSwitch({
        ratedVoltage: n("ratedVoltage"),
        resistanceOhms: n("resistanceOhms"),
        delayUs: n("delayUs"),
      });
    case "ir-emitter":
    case "ir-detector":
      return new IrModule(
        {
          id: c.id,
          emitter: c.kind === "ir-emitter",
          channel: String(p.channel),
          x: n("xM"),
          y: n("yM"),
          range: n("rangeM"),
          blocked: p.blocked === true,
        },
        optical,
      );
  }
}
