/// <reference lib="webworker" />
import { projectSignals } from "./projection";
import { parseProject } from "../circuit/project";
import type { CircuitProject } from "../circuit/types";
import { UnoRuntime } from "@simulab/engine";
import {
  PROTOCOL_VERSION,
  type SimulationCommand,
  type SimulationReply,
} from "./protocol";
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtime: UnoRuntime | undefined;
let project: CircuitProject | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
const cancel = () => {
  clearTimeout(timer);
  timer = undefined;
};
const reply = (message: SimulationReply) => scope.postMessage(message);
const snapshot = (id: number) => {
  if (!runtime) throw new Error("Load ATmega328P HEX firmware first.");
  reply({
    version: PROTOCOL_VERSION,
    id,
    type: "snapshot",
    ...capture(runtime.snapshot()),
  });
};
function capture(snapshot: ReturnType<UnoRuntime["snapshot"]>) {
  if (!project) throw new Error("Load a validated circuit before execution.");
  return { snapshot, projection: projectSignals(project, snapshot.gpio) };
}
const fail = (id: number, error: unknown) => {
  cancel();
  runtime?.stop();
  reply({
    version: PROTOCOL_VERSION,
    id,
    type: "error",
    message: error instanceof Error ? error.message : "AVR execution failed.",
  });
};
/** @brief Bounded CPU slices execute off the React thread. Time and GPIO derive from CPU cycles. */
function tick() {
  try {
    if (!runtime) return;
    const result = runtime.runCycles(160000);
    if (result.timeMicros >= 60_000_000) {
      runtime.pause();
      result.state = "paused";
    }
    reply({
      version: PROTOCOL_VERSION,
      id: 0,
      type: "snapshot",
      ...capture(result),
    });
    if (result.state === "running") timer = setTimeout(tick, 10);
  } catch (error) {
    fail(0, error);
  }
}
scope.onmessage = (event: MessageEvent<unknown>) => {
  const raw = event.data as Partial<SimulationCommand> | null;
  const id =
    raw && typeof raw.id === "number" && Number.isSafeInteger(raw.id)
      ? raw.id
      : 0;
  try {
    if (
      !raw ||
      raw.version !== PROTOCOL_VERSION ||
      !Number.isSafeInteger(raw.id)
    )
      throw new Error("Unsupported simulation command/version.");
    const command = raw as SimulationCommand;
    switch (command.type) {
      case "load":
        cancel();
        if (typeof command.hex !== "string" || command.hex.length > 131072)
          throw new Error("Firmware must be Intel HEX text below 128 KiB.");
        project = parseProject(JSON.stringify(command.project));
        if (project.components.filter((c) => c.kind === "uno").length !== 1)
          throw new Error("Execution requires exactly one Arduino Uno board.");
        runtime = new UnoRuntime(command.hex);
        snapshot(id);
        break;
      case "start":
      case "resume":
        if (!runtime) throw new Error("Load firmware before execution.");
        cancel();
        runtime[command.type]();
        snapshot(id);
        timer = setTimeout(tick, 0);
        break;
      case "pause":
      case "stop":
      case "reset":
        if (!runtime) throw new Error("Load firmware first.");
        cancel();
        runtime[command.type]();
        snapshot(id);
        break;
      case "input":
        if (
          !runtime ||
          typeof command.pin !== "string" ||
          typeof command.value !== "boolean"
        )
          throw new Error("Invalid digital input command.");
        runtime.setPin(command.pin, command.value);
        snapshot(id);
        break;
      default:
        throw new Error("Unsupported simulation operation.");
    }
  } catch (error) {
    fail(id, error);
  }
};
