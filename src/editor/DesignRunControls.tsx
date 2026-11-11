import { Play, Pause, Square, Link2 } from "lucide-react";
import type { SimulationController } from "../simulation/useSimulation";
/** @brief Compile-current-source controls are separate from manually loaded reference firmware tools. */
export function DesignRunControls({
  simulation,
  canRun,
  paired,
  busy,
  onRun,
  onStop,
  onPair,
}: {
  simulation: SimulationController;
  canRun: boolean;
  paired: boolean;
  busy: boolean;
  onRun: () => void;
  onStop: () => void;
  onPair: () => void;
}) {
  const active = ["ready", "running", "paused", "stopped"].includes(
      simulation.status,
    ),
    paused = simulation.status === "paused";
  return (
    <div
      className="design-run-controls"
      role="group"
      aria-label="Run design code"
    >
      <button
        className="run-code"
        disabled={!canRun || busy || simulation.status === "loading" || !paired}
        onClick={onRun}
        title="Compile current Code Editor files, attach the generated firmware to this design and execute it"
      >
        <Play size={15} />
        {busy ? "Compiling..." : "Run code"}
      </button>
      <button
        aria-label={paused ? "Resume code execution" : "Pause code execution"}
        disabled={!canRun || !["running", "paused"].includes(simulation.status)}
        onClick={() => simulation.command(paused ? "resume" : "pause")}
      >
        {paused ? <Play size={15} /> : <Pause size={15} />}{" "}
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        aria-label="Stop code execution"
        disabled={!busy && !active && simulation.status !== "loading"}
        onClick={onStop}
      >
        <Square size={14} />
        Stop
      </button>
      {!paired ? (
        <button className="pair-compiler" onClick={onPair}>
          <Link2 size={13} />
          Pair local compiler
        </button>
      ) : (
        <small>
          Run compiles the current editor source. Space + drag pans the design.
        </small>
      )}
    </div>
  );
}
