import type { CircuitProject } from "../circuit/types";
import type { SignalProjection } from "./projection";
import type { RuntimeSnapshot } from "@simulab/engine";
/** @brief Stable browser transport; circuit schema and engine protocol version independently. */
export const PROTOCOL_VERSION = "1.0.0" as const;
export type SimulationCommand = {
  version: typeof PROTOCOL_VERSION;
  id: number;
} & (
  | { type: "load"; hex: string; project: CircuitProject }
  | { type: "start" | "pause" | "resume" | "stop" | "reset" }
  | { type: "input"; pin: string; value: boolean }
);
export type SimulationReply = {
  version: typeof PROTOCOL_VERSION;
  id: number;
} & (
  | {
      type: "snapshot";
      snapshot: RuntimeSnapshot;
      projection: SignalProjection;
    }
  | { type: "error"; message: string }
);
