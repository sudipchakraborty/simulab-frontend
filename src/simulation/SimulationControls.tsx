import { useRef, useState } from "react";
import { Upload, Play, Pause, Square, RotateCcw, Cpu } from "lucide-react";
import type { SimulationController } from "./useSimulation";
/** @brief Target-specific files and controls; instructions execute only in the owning Worker. */
export function SimulationControls({
  simulation,
  enabled=true,
}: {
  simulation: SimulationController;
  enabled?:boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const { status, target, snapshot, firmwareName, error, command, load } =
    simulation;
  const esp = target === "esp32s3",
    supported = ["uno","nano","mega2560"].includes(target) || esp,
    active = ["ready", "running", "paused", "stopped"].includes(status),
    budgetReached = (snapshot?.timeMicros ?? 0) >= 60_000_000;
  return (
    <section
      className="simulation-controls"
      aria-label="MCU firmware execution"
    >
      <div className="firmware-title">
        <Cpu size={17} />
        <div>
          <strong>
            {esp
              ? "ESP32-S3 / Xtensa LX7"
              : target === "mega2560" ? "ATmega2560" : ["uno","nano"].includes(target)
                ? "ATmega328P"
                : "One MCU per session"}
          </strong>
          <small>
            {firmwareName ||
              (esp
                ? "Merged flash / memory profile unconfirmed"
                : "Compiled Intel HEX /16MHz")}
          </small>
        </div>
      </div>
      <div className="firmware-buttons">
        <button
          disabled={!enabled || status === "loading" || !supported}
          onClick={async () => {
            setFileError("");
            try {
              const file = esp ? "esp32s3-reference.bin" : target === "mega2560" ? "mega2560.hex" : "blink-uart.hex";
              const response = await fetch("/firmware/" + file);
              if (!response.ok)
                throw new Error("Reference firmware unavailable.");
              load(
                esp ? await response.arrayBuffer() : await response.text(),
                file,
              );
            } catch (e) {
              setFileError(
                e instanceof Error ? e.message : "Firmware load failed.",
              );
            }
          }}
        >
          {esp ? "Load ESP32-S3 reference" : "Load AVR sample"}
        </button>
        <button
          aria-label={esp ? "Upload ESP32-S3 firmware" : "Upload HEX firmware"}
          disabled={!enabled || status === "loading" || !supported}
          onClick={() => input.current?.click()}
        >
          <Upload size={13} />
          <span>{esp ? "Upload BIN" : "Upload HEX"}</span>
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
            disabled={!enabled || budgetReached}
            onClick={() => command("resume")}
          >
            <Play size={15} />
          </button>
        ) : (
          <button
            aria-label="Start simulation"
            disabled={!enabled || !active}
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
          disabled={!enabled || !active}
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
      {(error || fileError || budgetReached || !supported) && (
        <div className="simulation-error" role="alert">
          {error ||
            fileError ||
            (budgetReached
              ? "60-second simulation budget reached. Reset to run again."
              : "Keep exactly one MCU board, or open the YD example. Multiple MCU execution is unsupported.")}
        </div>
      )}
      {esp && (
        <div className="simulation-capabilities">
          GPIO/UART validated. RGB/I2C device hooks unavailable. Reference
          firmware reports4MiB flash; fullN16R8 memory sizing is unverified.
        </div>
      )}
      <input
        ref={input}
        type="file"
        aria-label={esp ? "Firmware merged flash file" : "Firmware HEX file"}
        accept={esp ? ".bin,application/octet-stream" : ".hex,text/plain"}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setFileError("");
          try {
            if (file.size > (esp ? 16 * 1024 * 1024 : target==='mega2560'?1048576:131072))
              throw new Error("Firmware exceeds target size limit.");
            load(esp ? await file.arrayBuffer() : await file.text(), file.name);
          } catch (e) {
            setFileError(e instanceof Error ? e.message : "Invalid firmware");
          }
          e.target.value = "";
        }}
      />
    </section>
  );
}
