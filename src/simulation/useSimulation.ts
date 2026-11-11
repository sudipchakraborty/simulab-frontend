import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalProjection } from "./projection";
import type { RuntimeSnapshot } from "@simulab/engine";
import type { CircuitProject } from "../circuit/types";
import { simulationTarget } from "./targets";
import {
  PROTOCOL_VERSION,
  type SimulationCommand,
  type SimulationReply,
} from "./protocol";
export type SimulationStatus =
  "idle" | "loading" | "error" | RuntimeSnapshot["state"];
/** @brief Own a target-specific Worker. Circuit edits terminate execution; firmware never falls back to another MCU. */
export function useSimulation(project: CircuitProject) {
  const currentProject = useRef(project);
  currentProject.current = project;
  const worker = useRef<Worker | undefined>(undefined);
  const loadSequence = useRef(0);
  const [loadSession, setLoadSession] = useState(0);
  const autoStart = useRef(false);
  const generation = useRef(0),
    sequence = useRef(0),
    heartbeat = useRef(0);
  const statusRef = useRef<SimulationStatus>("idle");
  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [projection, setProjection] = useState<SignalProjection>();
  const [serial, setSerial] = useState(""),
    [error, setError] = useState(""),
    [firmwareName, setFirmwareName] = useState("");
  const [buttons, setButtons] = useState<Record<string, boolean>>({});
  const target = simulationTarget(project);
  const updateStatus = (next: SimulationStatus) => {
    statusRef.current = next;
    setStatus(next);
  };
  const terminate = useCallback(() => {
    generation.current++;
    autoStart.current = false;
    worker.current?.terminate();
    worker.current = undefined;
  }, []);
  useEffect(() => {
    terminate();
    updateStatus("idle");
    setSnapshot(undefined);
    setProjection(undefined);
    setSerial("");
    setError("");
    setFirmwareName("");
    setButtons({});
    return terminate;
  }, [project, terminate]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        worker.current &&
        ["loading", "running"].includes(statusRef.current) &&
        Date.now() - heartbeat.current >
          (simulationTarget(currentProject.current) === "esp32s3"
            ? 10000
            : 5000)
      ) {
        terminate();
        updateStatus("error");
        setError("MCU worker stopped responding; execution terminated.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [terminate]);
  /** @brief Load target firmware; optional execution waits for this Worker session to report ready. @returns Monotonic identity for every load attempt, including rejection. */
  const load = useCallback(
    (
      firmware: string | ArrayBuffer,
      name: string,
      options?: { autoStart?: boolean },
    ): number | undefined => {
      const loadId = ++loadSequence.current;
      setLoadSession(loadId);
      terminate();
      setSnapshot(undefined);
      setProjection(undefined);
      setSerial("");
      setError("");
      setButtons({});
      const selected = simulationTarget(currentProject.current);
      const reject = (message: string) => {
        updateStatus("error");
        setError(message);
      };
      if (selected === "none" || selected === "multiple") {
        reject(
          "Execution requires exactly one MCU board. Remove extra boards or open a single-board example.",
        );
        return loadId;
      }
      if (
        ["uno", "nano", "mega2560"].includes(selected) &&
        (typeof firmware !== "string" ||
          firmware.length > (selected === "mega2560" ? 1048576 : 131072))
      ) {
        reject("AVR requires target-compatible Intel HEX text.");
        return loadId;
      }
      if (
        selected === "esp32s3" &&
        (!(firmware instanceof ArrayBuffer) ||
          firmware.byteLength > 16 * 1024 * 1024)
      ) {
        reject(
          "ESP32-S3 requires a merged flash binary below16MiB; AVR HEX is incompatible.",
        );
        return loadId;
      }
      autoStart.current = options?.autoStart === true;
      updateStatus("loading");
      setFirmwareName(name);
      heartbeat.current = Date.now();
      const session = generation.current;
      try {
        const next =
          selected === "esp32s3"
            ? new Worker(new URL("./esp32.worker.ts", import.meta.url), {
                type: "module",
              })
            : new Worker(new URL("./avr.worker.ts", import.meta.url), {
                type: "module",
              });
        worker.current = next;
        next.onmessage = (event: MessageEvent<SimulationReply>) => {
          if (session !== generation.current) return;
          heartbeat.current = Date.now();
          const message = event.data;
          if (message.version !== PROTOCOL_VERSION) {
            terminate();
            reject("Incompatible engine protocol.");
            return;
          }
          if (message.type === "error") {
            terminate();
            reject(message.message);
            return;
          }
          setSnapshot(message.snapshot);
          setProjection(message.projection);
          setSerial((s) => (s + message.snapshot.serial).slice(-16384));
          updateStatus(message.snapshot.state);
          if (autoStart.current && message.snapshot.state === "ready") {
            autoStart.current = false;
            next.postMessage({
              version: PROTOCOL_VERSION,
              id: ++sequence.current,
              type: "start",
            });
          }
        };
        next.onerror = (event) => {
          if (session !== generation.current) return;
          terminate();
          reject(event.message || "Unable to start MCU Worker.");
        };
        const common = {
          version: PROTOCOL_VERSION,
          id: ++sequence.current,
          project: currentProject.current,
        };
        next.postMessage(
          selected === "esp32s3"
            ? { ...common, type: "load-esp", firmware: firmware as ArrayBuffer }
            : { ...common, type: "load", hex: firmware as string },
        );
      } catch (e) {
        terminate();
        reject(e instanceof Error ? e.message : "Worker unavailable.");
      }
      return loadId;
    },
    [terminate],
  );
  const post = (message: Omit<SimulationCommand, "version" | "id">) =>
    worker.current?.postMessage({
      ...message,
      version: PROTOCOL_VERSION,
      id: ++sequence.current,
    });
  const command = (type: "start" | "pause" | "resume" | "stop" | "reset") => {
    if (type === "stop" || type === "pause" || type === "reset")
      autoStart.current = false;
    if (type === "reset") {
      setSerial("");
      setError("");
      setButtons({});
    }
    post({ type });
  };
  const sendUART = (text: string) => {
    if (new TextEncoder().encode(text).length > 4095) {
      setError("UART command exceeds4095 bytes.");
      return;
    }
    worker.current?.postMessage({
      version: PROTOCOL_VERSION,
      id: ++sequence.current,
      type: "uart",
      text,
    } satisfies SimulationCommand);
  };
  const input = (pin: string, value: boolean) =>
    worker.current?.postMessage({
      version: PROTOCOL_VERSION,
      id: ++sequence.current,
      type: "input",
      pin,
      value,
    } satisfies SimulationCommand);
  const setButton = (componentId: string, pressed: boolean) => {
    if (!worker.current) return;
    setButtons((s) => ({ ...s, [componentId]: pressed }));
    worker.current.postMessage({
      version: PROTOCOL_VERSION,
      id: ++sequence.current,
      type: "button",
      componentId,
      pressed,
    } satisfies SimulationCommand);
  };
  return {
    status,
    loadSession,
    target,
    snapshot,
    projection,
    serial,
    error,
    firmwareName,
    buttons,
    load,
    command,
    sendUART,
    input,
    setButton,
    clearSerial: () => setSerial(""),
    step: () => post({ type: "step" }),
  };
}
export type SimulationController = ReturnType<typeof useSimulation>;
