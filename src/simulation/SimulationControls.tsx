import { useRef, useState } from "react";
import { Upload, Play, Pause, Square, RotateCcw, Cpu } from "lucide-react";
import type { SimulationController } from "./useSimulation";
/** @brief Firmware controls consume a session controller, never execute instructions in React. */
export function SimulationControls({
  simulation,
}: {
  simulation: SimulationController;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const { status, snapshot, firmwareName, error, command, load } = simulation;
  const active = ["ready", "running", "paused", "stopped"].includes(status);
  const budgetReached = (snapshot?.timeMicros ?? 0) >= 60_000_000;
  return (
    <section
      className="simulation-controls"
      aria-label="AVR firmware execution"
    >
      <div className="firmware-title">
        <Cpu size={17} />
        <div>
          <strong>ATmega328P</strong>
          <small>{firmwareName || "Compiled Intel HEX / 16 MHz"}</small>
        </div>
      </div>
      <div className="firmware-buttons">
        <button
          onClick={async () => {
            setFileError("");
            try {
              const response = await fetch("/firmware/blink-uart.hex");
              if (!response.ok)
                throw new Error("Compiled sample is unavailable.");
              load(await response.text(), "blink-uart.hex");
            } catch (e) {
              setFileError(
                e instanceof Error ? e.message : "Unable to load sample.",
              );
            }
          }}
          disabled={status === "loading"}
        >
          Load AVR sample
        </button>
        <button
          aria-label="Upload HEX firmware"
          onClick={() => input.current?.click()}
          disabled={status === "loading"}
        >
          <Upload size={13} />
          <span>Upload HEX</span>
        </button>
        <span className="divider" />
        {status === "running" ? (
          <button
            aria-label="Pause simulation"
            onClick={() => command("pause")}
          >
            <Pause size={15} />
          </button>
        ) : status === "paused" ? (
          <button
            aria-label="Resume simulation"
            disabled={budgetReached}
            onClick={() => command("resume")}
          >
            <Play size={15} />
          </button>
        ) : (
          <button
            aria-label="Start simulation"
            disabled={!active}
            onClick={() => command("start")}
          >
            <Play size={15} />
          </button>
        )}
        <button
          aria-label="Stop simulation"
          disabled={!active || status === "stopped"}
          onClick={() => command("stop")}
        >
          <Square size={14} />
        </button>
        <button
          aria-label="Reset simulation"
          disabled={!active}
          onClick={() => command("reset")}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="simulation-clock">
        <span data-testid="simulation-status">{status}</span>
        <strong data-testid="simulation-time">
          {((snapshot?.timeMicros ?? 0) / 1e6).toFixed(3)} s
        </strong>
      </div>
      {(error || fileError || budgetReached) && (
        <div className="simulation-error" role="alert">
          {error ||
            fileError ||
            "60-second simulation budget reached. Reset to run again."}
        </div>
      )}
      <input
        ref={input}
        type="file"
        aria-label="Firmware HEX file"
        accept=".hex,text/plain"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setFileError("");
          try {
            if (file.size > 131072)
              throw new Error("Firmware exceeds 128 KiB limit.");
            load(await file.text(), file.name);
          } catch (error) {
            setFileError(
              error instanceof Error ? error.message : "Invalid firmware file.",
            );
          }
          e.target.value = "";
        }}
      />
    </section>
  );
}
