import { useEffect, useRef, useState } from "react";
import type { SimulationController } from "../simulation/useSimulation";
import { download } from "./workspace";
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}
/** @brief UART presentation and user-selected Web Serial port; display pause never pauses the CPU. */
export function SerialMonitor({
  simulation,
  canSave,
  canRun,
  canUpload,
}: {
  simulation: SimulationController;
  canSave: boolean;
  canRun: boolean;
  canUpload: boolean;
}) {
  const [baud, setBaud] = useState(115200),
    [mode, setMode] = useState("simulation"),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [physical, setPhysical] = useState(""),
    [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false),
    [frozen, setFrozen] = useState(""),
    [offset, setOffset] = useState(0),
    [timestamps, setTimestamps] = useState(false),
    [auto, setAuto] = useState(true);
  const port = useRef<SerialPort | undefined>(undefined),
    reader = useRef<ReadableStreamDefaultReader<Uint8Array> | undefined>(
      undefined,
    ),
    consoleRef = useRef<HTMLPreElement>(null);
  const log = mode === "simulation" ? simulation.serial : physical,
    visible = (paused ? frozen : log).slice(offset);
  useEffect(() => {
    if (auto && consoleRef.current)
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [visible, auto]);
  const disconnect = async () => {
    await reader.current?.cancel();
    reader.current = undefined;
    try {
      await port.current?.close();
    } catch {
      /* Reader loop may still be releasing its lock. */
    }
    port.current = undefined;
    setConnected(false);
  };
  useEffect(
    () => () => {
      void reader.current?.cancel();
      void port.current?.close().catch(() => {});
    },
    [],
  );
  useEffect(() => {
    if (!canUpload && connected) void disconnect();
  }, [canUpload, connected]);
  const connect = async () => {
    if (!canUpload) return;
    try {
      const serial = (
        navigator as unknown as {
          serial?: { requestPort(): Promise<SerialPort> };
        }
      ).serial;
      if (!serial)
        throw new Error(
          "Web Serial needs a supported browser on localhost/HTTPS",
        );
      const next = await serial.requestPort();
      await next.open({ baudRate: baud });
      port.current = next;
      setConnected(true);
      setError("");
      const r = next.readable.getReader();
      reader.current = r;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { value, done } = await r.read();
          if (done) break;
          if (value)
            setPhysical((p) =>
              (p + decoder.decode(value, { stream: true })).slice(-65536),
            );
        }
      } finally {
        r.releaseLock();
        reader.current = undefined;
        setConnected(false);
        await next.close();
        port.current = undefined;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Serial connection failed");
    }
  };
  return (
    <section className="ide-panel serial-workspace">
      <h2>Serial Monitor</h2>
      <div className="ide-actions">
        <label>
          Connection{" "}
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setOffset(0);
              setPaused(false);
            }}
          >
            <option value="simulation">Simulation UART</option>
            <option value="physical">Physical USB serial</option>
          </select>
        </label>
        <label>
          Baud rate{" "}
          <select
            value={baud}
            disabled={connected}
            onChange={(e) => setBaud(Number(e.target.value))}
          >
            {[9600, 19200, 38400, 57600, 115200, 230400].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        {mode === "physical" && (
          <button
            disabled={!canUpload && !connected}
            onClick={() => void (connected ? disconnect() : connect())}
          >
            {connected ? "Disconnect USB" : "Select USB serial port"}
          </button>
        )}
        <button
          onClick={() => {
            if (!paused) setFrozen(log);
            setPaused(!paused);
          }}
        >
          {paused ? "Resume display" : "Pause display"}
        </button>
        <button
          onClick={() => {
            setOffset(0);
            setFrozen("");
            if (mode === "simulation") simulation.clearSerial();
            else setPhysical("");
          }}
        >
          Clear output
        </button>
        <label>
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />{" "}
          Auto-scroll
        </label>
        <label>
          <input
            type="checkbox"
            checked={timestamps}
            onChange={(e) => setTimestamps(e.target.checked)}
          />{" "}
          Snapshot timestamp
        </label>
        <button
          disabled={!canSave}
          onClick={() => {
            if (canSave) download("simulab-serial.txt", visible, "text/plain");
          }}
        >
          Export serial log
        </button>
      </div>
      <p className="muted">
        Simulation baud is configured by firmware; the baud selector configures
        physical USB only. Timestamp labels identify the current captured
        snapshot, not each byte’s arrival.
      </p>
      {error && <p role="alert">{error}</p>}
      {timestamps && (
        <small>
          {mode === "simulation"
            ? `${simulation.snapshot?.timeMicros ?? 0} µs simulated`
            : `Captured ${new Date().toISOString()}`}
        </small>
      )}
      <pre
        className="ide-serial"
        ref={consoleRef}
        data-testid="ide-serial-output"
      >
        {visible || "Waiting for UART output."}
      </pre>
      <form
        className="ide-actions"
        onSubmit={async (e) => {
          e.preventDefault();
          if (mode === "physical" ? !canUpload : !canRun) return;
          try {
            if (mode === "simulation") simulation.sendUART(text);
            else {
              const writer = port.current?.writable.getWriter();
              if (!writer) throw new Error("Connect a serial port first");
              try {
                await writer.write(new TextEncoder().encode(text + "\r\n"));
              } finally {
                writer.releaseLock();
              }
            }
            setText("");
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        <input
          aria-label="Serial input"
          value={text}
          maxLength={4095}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          disabled={
            mode === "simulation"
              ? !canRun || simulation.status !== "running"
              : !canUpload || !connected
          }
        >
          Send serial input
        </button>
      </form>
    </section>
  );
}
