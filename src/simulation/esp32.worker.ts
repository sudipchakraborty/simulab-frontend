/// <reference lib="webworker" />
import { Esp32S3Runtime, loadEspBindings } from "@simulab/engine/esp32";
import { parseProject } from "../circuit/project";
import type { CircuitProject } from "../circuit/types";
import { projectSignals } from "./projection";
import { buttonInputs } from "./buttonInputs";
import {
  PROTOCOL_VERSION,
  type SimulationCommand,
  type SimulationReply,
} from "./protocol";
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtime: Esp32S3Runtime | undefined,
  project: CircuitProject | undefined,
  timer: ReturnType<typeof setTimeout> | undefined;
let loading = false;
const cancel = () => clearTimeout(timer);
const reply = (message: SimulationReply) => scope.postMessage(message);
const capture = (snapshot: ReturnType<Esp32S3Runtime["snapshot"]>) => ({
  snapshot,
  projection: projectSignals(project!, snapshot.gpio),
});
const snapshot = (id: number) => {
  if (!runtime) throw new Error("Load an ESP32-S3 merged flash image first.");
  reply({
    version: PROTOCOL_VERSION,
    id,
    type: "snapshot",
    ...capture(runtime.snapshot()),
  });
};
const fail = (id: number, e: unknown) => {
  cancel();
  try {
    runtime?.stop();
  } catch {
    /* Preserve the original execution error even after a WASM trap. */
  }
  reply({
    version: PROTOCOL_VERSION,
    id,
    type: "error",
    message: e instanceof Error ? e.message : "ESP32-S3 execution failed.",
  });
};
function tick() {
  try {
    if (!runtime) return;
    const result = runtime.runBatch(100000);
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
    if (result.state === "running") timer = setTimeout(tick, 0);
  } catch (e) {
    fail(0, e);
  }
}
function applyInputs() {
  for (const [pin, value] of Object.entries(buttonInputs(project!)))
    runtime!.setPin(pin, value);
}
scope.onmessage = async (event: MessageEvent<SimulationCommand>) => {
  const command = event.data;
  const id = typeof command?.id === "number" ? command.id : 0;
  try {
    if (
      !command ||
      command.version !== PROTOCOL_VERSION ||
      !Number.isSafeInteger(id)
    )
      throw new Error("Unsupported simulation command/version.");
    if (command.type === "load-esp") {
      if (loading)
        throw new Error("Firmware initialization already in progress.");
      loading = true;
      cancel();
      if (
        !(command.firmware instanceof ArrayBuffer) ||
        command.firmware.byteLength > 16 * 1024 * 1024
      )
        throw new Error("Merged ESP32-S3 binary exceeds16MiB limit.");
      project = parseProject(JSON.stringify(command.project));
      if (
        project.components.filter((c) => c.kind === "yd-esp32-s3").length !==
          1 ||
        project.components.some((c) => c.kind === "uno")
      )
        throw new Error(
          "ESP32-S3 execution requires exactly one YD board and no AVR board.",
        );
      const origin = new URL(scope.location.href).origin;
      const bindings = await loadEspBindings({
        bindingsUrl: origin + "/emulators/esp-emu-0.51.0/esp_emu.js",
        wasmUrl: origin + "/emulators/esp-emu-0.51.0/esp_emu_bg.wasm",
      });
      runtime?.dispose();
      runtime = new Esp32S3Runtime(bindings, new Uint8Array(command.firmware));
      applyInputs();
      snapshot(id);
      loading = false;
      return;
    }
    if (!runtime) throw new Error("Load real ESP32-S3 firmware first.");
    switch (command.type) {
      case "start":
      case "resume":
        cancel();
        runtime[command.type]();
        snapshot(id);
        timer = setTimeout(tick, 0);
        break;
      case "pause":
      case "stop":
      case "reset":
        cancel();
        runtime[command.type]();
        if (command.type === "reset") {
          project = {
            ...project!,
            components: project!.components.map((c) =>
              c.kind === "switch"
                ? { ...c, properties: { ...c.properties, pressed: false } }
                : c,
            ),
          };
          applyInputs();
        }
        snapshot(id);
        break;
      case "uart":
        if (
          typeof command.text !== "string" ||
          new TextEncoder().encode(command.text).length > 4095
        )
          throw new Error("UART command too large.");
        runtime.uartInput(new TextEncoder().encode(command.text + "\r"));
        snapshot(id);
        break;
      case "input":
        runtime.setPin(command.pin, command.value);
        snapshot(id);
        break;
      case "button":
        if (
          typeof command.pressed !== "boolean" ||
          !project!.components.some(
            (c) => c.kind === "switch" && c.id === command.componentId,
          )
        )
          throw new Error("Unknown input contact.");
        project = {
          ...project!,
          components: project!.components.map((c) =>
            c.id === command.componentId
              ? {
                  ...c,
                  properties: { ...c.properties, pressed: command.pressed },
                }
              : c,
          ),
        };
        applyInputs();
        snapshot(id);
        break;
      default:
        throw new Error(
          "Unsupported ESP32-S3 operation; AVR substitution is prohibited.",
        );
    }
  } catch (e) {
    loading = false;
    fail(id, e);
  }
};
