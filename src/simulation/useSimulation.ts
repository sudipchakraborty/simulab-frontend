import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalProjection } from "./projection";
import type { RuntimeSnapshot } from "@simulab/engine";
import type { CircuitProject } from "../circuit/types";
import {
  PROTOCOL_VERSION,
  type SimulationCommand,
  type SimulationReply,
} from "./protocol";
export type SimulationStatus =
  "idle" | "loading" | "error" | RuntimeSnapshot["state"];
/** @brief Own a bounded Worker session; any circuit edit discards stale execution and outputs. */
export function useSimulation(project: CircuitProject) {
  const currentProject = useRef(project);
  currentProject.current = project;
  const worker = useRef<Worker | undefined>(undefined);
  const generation = useRef(0);
  const sequence = useRef(0);
  const heartbeat = useRef(0);
  const statusRef = useRef<SimulationStatus>("idle");
  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [projection, setProjection] = useState<SignalProjection>();
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");
  const [firmwareName, setFirmwareName] = useState("");
  const updateStatus = (next: SimulationStatus) => {
    statusRef.current = next;
    setStatus(next);
  };
  const terminate = useCallback(() => {
    generation.current++;
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
    return terminate;
  }, [project, terminate]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        worker.current &&
        ["loading", "running"].includes(statusRef.current) &&
        Date.now() - heartbeat.current > 5000
      ) {
        terminate();
        updateStatus("error");
        setError("AVR worker stopped responding; execution terminated.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [terminate]);
  const load = useCallback(
    (hex: string, name: string) => {
      terminate();
      setSnapshot(undefined);
      setProjection(undefined);
      setSerial("");
      setError("");
      if (
        currentProject.current.components.filter((c) => c.kind === "uno")
          .length !== 1
      ) {
        updateStatus("error");
        setError("Execution requires exactly one Arduino Uno board.");
        return;
      }
      if (hex.length > 131072) {
        updateStatus("error");
        setError("Firmware exceeds 128 KiB HEX text limit.");
        return;
      }
      updateStatus("loading");
      setFirmwareName(name);
      heartbeat.current = Date.now();
      const session = generation.current;
      try {
        const next = new Worker(new URL("./avr.worker.ts", import.meta.url), {
          type: "module",
        });
        worker.current = next;
        next.onmessage = (event: MessageEvent<SimulationReply>) => {
          if (session !== generation.current) return;
          heartbeat.current = Date.now();
          const message = event.data;
          if (message.version !== PROTOCOL_VERSION) {
            terminate();
            updateStatus("error");
            setError("Incompatible engine protocol.");
            return;
          }
          if (message.type === "error") {
            terminate();
            updateStatus("error");
            setError(message.message);
            return;
          }
          setSnapshot(message.snapshot);
          setProjection(message.projection);
          setSerial((previous) =>
            (previous + message.snapshot.serial).slice(-16384),
          );
          updateStatus(message.snapshot.state);
        };
        next.onerror = (event) => {
          if (session !== generation.current) return;
          terminate();
          updateStatus("error");
          setError(event.message || "Unable to start AVR worker.");
        };
        next.postMessage({
          version: PROTOCOL_VERSION,
          id: ++sequence.current,
          type: "load",
          hex,
          project: currentProject.current,
        } satisfies SimulationCommand);
      } catch (err) {
        terminate();
        updateStatus("error");
        setError(err instanceof Error ? err.message : "Worker unavailable.");
      }
    },
    [terminate],
  );
  const command = (type: "start" | "pause" | "resume" | "stop" | "reset") => {
    if (!worker.current) return;
    if (type === "reset") {
      setSerial("");
      setError("");
    }
    worker.current.postMessage({
      version: PROTOCOL_VERSION,
      id: ++sequence.current,
      type,
    } satisfies SimulationCommand);
  };
  return {
    status,
    snapshot,
    projection,
    serial,
    error,
    firmwareName,
    load,
    command,
  };
}
export type SimulationController = ReturnType<typeof useSimulation>;
