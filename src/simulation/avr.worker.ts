/// <reference lib="webworker" />
import { projectSignals } from "./projection";
import { parseProject } from "../circuit/project";
import type { CircuitProject } from "../circuit/types";
import { AvrRuntime } from "@simulab/engine";
import { CircuitRuntime } from "../models/circuitRuntime";
import { buttonInputs } from "./buttonInputs";
import {
  PROTOCOL_VERSION,
  type SimulationCommand,
  type SimulationReply,
} from "./protocol";
import { simulationTarget } from "./targets";
let target: "uno" | "nano" | "mega2560" = "uno";
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtime: AvrRuntime | undefined;
let devices: CircuitRuntime | undefined;
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
function capture(snapshot: ReturnType<AvrRuntime["snapshot"]>) {
  if (!project) throw new Error("Load a validated circuit before execution.");
  if (snapshot.timeMicros < devices!.timeMicros)
    devices = new CircuitRuntime(project, target);
  const components = devices!.advance(
    snapshot.timeMicros,
    snapshot.gpio,
    snapshot.transitions,
  );
  const projection = projectSignals(
    { ...project, wires: [...project.wires, ...devices!.contactWires()] },
    snapshot.gpio,
  );
  projection.components = components;
  projection.debug = runtime!.debugSnapshot();
  projection.i2c = [...devices!.transactions];
  Object.assign(projection.ledStates, devices!.ledStates());
  applyDeviceInputs(snapshot.gpio);
  projection.issues.push(
    ...Object.values(components).flatMap((c) => c.warnings),
  );
  return { snapshot, projection };
}
function applyDeviceInputs(gpio: Record<string, 0 | 1 | null>) {
  if (!runtime || !devices) return;
  for (const [pin, level] of Object.entries(devices.inputLevels()))
    if (gpio[pin] === null) runtime.setPinLevel(pin, level);
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
    // Mega has more native pins and per-read device-bus work. Yield smaller batches so
    // Pause/Stop and heartbeat replies are serviced promptly; emulated time remains cycle-derived.
    const mega = target === "mega2560";
    const result = runtime.runCycles(mega ? 16000 : 160000);
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
    if (result.state === "running") timer = setTimeout(tick, mega ? 1 : 10);
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
        project = parseProject(JSON.stringify(command.project));
        const selected = simulationTarget(project);
        if (
          selected !== "uno" &&
          selected !== "nano" &&
          selected !== "mega2560"
        )
          throw new Error(
            "Execution requires exactly one supported AVR board.",
          );
        target = selected;
        if (
          typeof command.hex !== "string" ||
          command.hex.length > (target === "mega2560" ? 1048576 : 131072)
        )
          throw new Error("Intel HEX exceeds target size limit.");
        devices = new CircuitRuntime(project, target);
        devices.advance(0, {});
        runtime = new AvrRuntime(command.hex, {
          mcu: target === "mega2560" ? "atmega2560" : "atmega328p",
          i2c: {
            write: (a, b) => devices!.i2cWrite(a, b),
            read: (a, n) => devices!.i2cRead(a, n),
          },
          onGpioTransition: (event, gpio) => {
            const at = event.cycle / 16;
            if (at < devices!.timeMicros)
              devices = new CircuitRuntime(project!, target);
            devices!.advance(at, gpio, [event]);
            applyDeviceInputs(gpio);
          },
          onBeforeInputRead: (timeUs, gpio) => {
            if (timeUs < devices!.timeMicros)
              devices = new CircuitRuntime(project!, target);
            devices!.advance(timeUs, gpio);
            applyDeviceInputs(gpio);
          },
        });
        for (const [pin, value] of Object.entries(buttonInputs(project)))
          runtime.setPin(pin, value);
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
        if (command.type === "reset")
          devices = new CircuitRuntime(project!, target);
        snapshot(id);
        break;
      case "step":
        if (!runtime) throw new Error("Load firmware first");
        reply({
          version: PROTOCOL_VERSION,
          id,
          type: "snapshot",
          ...capture(runtime.stepInstruction()),
        });
        break;
      case "uart":
        if (
          !runtime ||
          typeof command.text !== "string" ||
          command.text.length > 4095
        )
          throw new Error("Invalid UART input");
        runtime.uartInput(new TextEncoder().encode(command.text + "\n"));
        snapshot(id);
        break;
      case "button":
        if (
          !project ||
          !runtime ||
          typeof command.pressed !== "boolean" ||
          !project.components.some(
            (c) =>
              c.id === command.componentId &&
              ["switch", "tactile-switch"].includes(c.kind),
          )
        )
          throw new Error("Unknown input contact");
        project = {
          ...project,
          components: project.components.map((c) =>
            c.id === command.componentId
              ? {
                  ...c,
                  properties: { ...c.properties, pressed: command.pressed },
                }
              : c,
          ),
        };
        devices!.setButton(command.componentId, command.pressed);
        for (const [pin, value] of Object.entries(buttonInputs(project)))
          runtime.setPin(pin, value);
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
