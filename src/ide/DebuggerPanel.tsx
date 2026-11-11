import { useEffect, useState } from "react";
import type { SimulationController } from "../simulation/useSimulation";
import { debugCapabilities, type WorkspaceDocument } from "./workspace";
import { GPIOStates } from "../simulation/GPIOStates";
/** @brief Capability-gated real debug inspectors. Requested source breakpoints are never presented as bound. */
export function DebuggerPanel({
  simulation,
  document,
}: {
  simulation: SimulationController;
  document: WorkspaceDocument;
}) {
  const capabilities = debugCapabilities(simulation.target),
    cpu = simulation.projection?.debug;
  const [events, setEvents] = useState<
    { pin: string; level: number | null; cycle: number }[]
  >([]);
  useEffect(() => {
    const s = simulation.snapshot;
    if (!s || s.cycles === 0) setEvents([]);
    else if (s.transitions.length)
      setEvents((p) => [...p, ...s.transitions].slice(-300));
  }, [simulation.snapshot]);
  return (
    <section className="ide-panel debugger-workspace">
      <h2>Debugger</h2>
      <p>{capabilities.reason}</p>
      <div className="ide-actions">
        <button
          disabled={
            !capabilities.instructionStep ||
            !["ready", "paused"].includes(simulation.status)
          }
          onClick={() => simulation.step()}
        >
          Step instruction
        </button>
        <button disabled title="ELF/DWARF source mapping is not integrated">
          Step Into
        </button>
        <button disabled>Step Over</button>
        <button disabled>Step Out</button>
        <button
          disabled={simulation.status !== "paused"}
          onClick={() => simulation.command("resume")}
        >
          Continue
        </button>
        <button
          disabled={simulation.status !== "running"}
          onClick={() => simulation.command("pause")}
        >
          Pause execution
        </button>
        <button
          disabled={!simulation.snapshot}
          onClick={() => simulation.command("reset")}
        >
          Restart
        </button>
      </div>
      <div className="debug-grid">
        <article>
          <h3>Register view</h3>
          {cpu ? (
            <>
              <p>
                PC byte: 0x{cpu.pcBytes.toString(16)} · SP: 0x
                {cpu.sp.toString(16)} · SREG: 0x{cpu.sreg.toString(16)}
              </p>
              <div className="register-grid">
                {cpu.registers.map((v, i) => (
                  <code key={i}>
                    R{i}: {v.toString(16).padStart(2, "0")}
                  </code>
                ))}
              </div>
            </>
          ) : (
            <p>
              Register inspection unavailable for this adapter or no firmware
              loaded.
            </p>
          )}
        </article>
        <article>
          <h3>Requested source breakpoints</h3>
          <p>
            Stored for project continuity. Unbound: source maps are unavailable;
            these do not pause execution.
          </p>
          {Object.entries(document.breakpoints).flatMap(([f, lines]) =>
            lines.map((n) => (
              <code key={`${f}-${n}`}>
                {f}:{n} · unbound
                <br />
              </code>
            )),
          )}
          <h3>Variable Watch / Call Stack</h3>
          <p>
            Unavailable without debug metadata and an execution backend
            providing variables and frames.
          </p>
          <h3>Physical debugging</h3>
          <p>
            OpenOCD/GDB is not connected. No physical debugging controls are
            enabled.
          </p>
        </article>
        <article>
          <h3>GPIO state</h3>
          <div className="register-grid">
            {Object.entries(simulation.snapshot?.gpio ?? {}).map(
              ([pin, level]) => (
                <code key={pin}>
                  {pin}: {level ?? "Z"}
                </code>
              ),
            )}
          </div>
        </article>
        <article>
          <h3>I²C / PWM inspection</h3>
          <p>
            Uno RTC transactions use the real AVR TWI peripheral. GPIO timeline
            below exposes real timer/PWM edges. S3 external buses and waveform
            timing are unavailable.
          </p>
        </article>
      </div>
      <h3>I²C transactions (Uno logical bus; snapshot time resolution)</h3>
      <div className="event-timeline">
        {(simulation.projection?.i2c ?? []).map((t, i) => (
          <code key={i}>
            {t.timeUs} µs · 0x{t.address.toString(16)} {t.direction} [
            {t.bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")}]{" "}
            {t.ack ? "ACK" : "NACK"}
            <br />
          </code>
        ))}
      </div>
      <h3>Simulation event timeline (last 300 edges)</h3>
      <div className="event-timeline">
        {events.map((e, i) => (
          <code key={i}>
            {e.cycle} cycles · {e.pin} → {e.level ?? "Z"}
            <br />
          </code>
        ))}
      </div>
    </section>
  );
}
