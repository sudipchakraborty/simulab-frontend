import { useEffect, useRef, useState } from "react";
import type { CircuitProject } from "../circuit/types";
import type { SimulationController } from "../simulation/useSimulation";
import {
  boardProfiles,
  blankSketch,
  newWorkspace,
  parseWorkspace,
  serializeWorkspace,
  download,
  type WorkspaceDocument,
  type WorkspaceTab,
  type BoardId,
} from "./workspace";
import { simulationTarget } from "../simulation/targets";
import { ToolchainClient, type BuildResult } from "./ToolchainClient";
/** @brief Inject account authority without coupling IDE to authentication. */
export interface IdeAccess {
  canSave: boolean;
  canEdit: boolean;
  canRun: boolean;
  canUpload: boolean;
  storageKey: string;
  saveProject: (name: string, data: unknown) => Promise<unknown>;
}
/** @brief Own persistent IDE document and bounded toolchain jobs, separate from hardware simulation state. */
export function useIde(
  project: CircuitProject,
  commit: (p: CircuitProject) => void,
  simulation: SimulationController,
  access: IdeAccess,
) {
  const [document, setDocument] = useState<WorkspaceDocument>(() => {
    try {
      const saved = localStorage.getItem(access.storageKey);
      return saved ? parseWorkspace(saved) : newWorkspace(project);
    } catch {
      return newWorkspace(project);
    }
  });
  const initialized = useRef(false);
  const latest = useRef({ project, access, document, simulation });
  latest.current = { project, access, document, simulation };
  const pendingRun = useRef(false);
  const expectedLoadSession = useRef<number | undefined>(undefined);
  const pendingRevision = useRef(-1);
  const operationBusy = useRef(false);
  const buildRevision = useRef(0);
  const [token, setToken] = useState(""),
    [paired, setPaired] = useState(false),
    [busy, setBusy] = useState(false),
    [log, setLog] = useState(
      "Pair the local companion to build or upload. Firmware upload and sample execution remain available on the Hardware tab.",
    );
  const [result, setResult] = useState<BuildResult>(),
    [ports, setPorts] = useState<string[]>([]),
    [port, setPort] = useState(""),
    [consent, setConsent] = useState(false),
    [libraries, setLibraries] = useState("");
  const [codeVisited, setCodeVisited] = useState(document.activeTab === "code");
  const [sourceRevision, setSourceRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null),
    saveRef = useRef<() => void>(() => {});
  const client = new ToolchainClient(token);
  const signature = JSON.stringify([
    project,
    document.board,
    document.files.map(({ name, content }) => ({ name, content })),
    access.canRun,
    token,
  ]);
  const previousSignature = useRef(signature);
  if (previousSignature.current !== signature) {
    previousSignature.current = signature;
    buildRevision.current++;
  }
  useEffect(() => {
    if (
      pendingRun.current &&
      pendingRevision.current !== buildRevision.current
    ) {
      pendingRun.current = false;
      if (simulation.loadSession === expectedLoadSession.current)
        simulation.command("stop");
    }
  }, [signature]);
  useEffect(
    () => () => {
      buildRevision.current++;
    },
    [],
  );
  // Explicit manual/reference loading takes ownership without stopping its new Worker.
  useEffect(() => {
    if (
      pendingRun.current &&
      simulation.loadSession !== expectedLoadSession.current
    ) {
      buildRevision.current++;
      pendingRun.current = false;
      expectedLoadSession.current = undefined;
    }
  }, [simulation.loadSession]);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (localStorage.getItem(access.storageKey)) commit(document.circuit);
  }, []);
  useEffect(() => {
    setDocument((w) => ({ ...w, circuit: project }));
  }, [project]);
  useEffect(() => {
    if (!access.canSave) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(access.storageKey, serializeWorkspace(document));
      } catch (e) {
        setLog(
          `Autosave unavailable: ${String(e)}. Use Save Project to download.`,
        );
      }
    }, 450);
    return () => clearTimeout(t);
  }, [document, access.canSave, access.storageKey]);
  const save = async () => {
    if (!access.canSave) {
      setLog("Saving requires an active paid plan and write permission.");
      return;
    }
    try {
      await access.saveProject(project.name, { ...document, circuit: project });
      download(
        "simulab-project.json",
        serializeWorkspace({ ...document, circuit: project }),
      );
      setLog(
        "Saved circuit, source files, cursor positions and requested breakpoints.",
      );
    } catch (e) {
      setLog(String(e));
    }
  };
  saveRef.current = save;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const tab = (activeTab: WorkspaceTab) => {
    if (activeTab === "code") setCodeVisited(true);
    setDocument((w) => ({ ...w, activeTab }));
  };
  const runOperation = async (fn: () => Promise<void>) => {
    if (operationBusy.current) return;
    operationBusy.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setLog(e instanceof Error ? e.message : "Operation failed");
    } finally {
      operationBusy.current = false;
      setBusy(false);
    }
  };
  /** @brief Invalidate late compiler/artifact replies and pending Worker automatic starts. */
  const stopDesign = () => {
    buildRevision.current++;
    pendingRun.current = false;
    expectedLoadSession.current = undefined;
    simulation.command("stop");
  };
  /** @brief Invalidate code jobs and code-owned execution while preserving manually loaded firmware. */
  const invalidateCodeRun = () => {
    buildRevision.current++;
    if (
      pendingRun.current &&
      simulation.loadSession === expectedLoadSession.current
    )
      simulation.command("stop");
    pendingRun.current = false;
    expectedLoadSession.current = undefined;
  };
  /** @brief Compile current editor sources for the circuit's single MCU and run only its compatible artifact. */
  const runDesign = () =>
    runOperation(async () => {
      if (!access.canRun) throw new Error("Simulation permission unavailable.");
      if (!paired)
        throw new Error("Pair the local companion before running the design.");
      const target = simulationTarget(project);
      if (target === "none" || target === "multiple")
        throw new Error("Execution requires exactly one supported MCU board.");
      const board: BoardId =
        boardProfiles[document.board].target === target
          ? document.board
          : target;
      stopDesign();
      if (board !== document.board) setDocument((w) => ({ ...w, board }));
      // Selecting a matching profile is part of this job, not a subsequent user edit.
      previousSignature.current = JSON.stringify([
        project,
        board,
        document.files.map(({ name, content }) => ({ name, content })),
        access.canRun,
        token,
      ]);
      const revision = buildRevision.current;
      pendingRun.current = true;
      expectedLoadSession.current = simulation.loadSession;
      pendingRevision.current = revision;
      const current = () =>
        revision === buildRevision.current &&
        latest.current.access.canRun &&
        pendingRun.current &&
        latest.current.simulation.loadSession === expectedLoadSession.current;
      setResult(undefined);
      setConsent(false);
      setLog(
        "Compiling current editor source with the paired Arduino CLI companion...",
      );
      const built = await client.compile(board, document.files);
      if (!current()) return;
      setResult(built);
      setLog(built.log);
      if (!built.success) {
        pendingRun.current = false;
        return;
      }
      if (built.board !== board)
        throw new Error(
          "Compiler result board does not match the requested circuit target.",
        );
      const artifact = built.artifacts.find((name) =>
        target === "esp32s3"
          ? name.endsWith(".merged.bin")
          : name.endsWith(".hex") && !name.includes("with_bootloader"),
      );
      if (!artifact)
        throw new Error(
          "Compatible simulation image absent. S3 requires a merged flash image.",
        );
      const bytes = await client.artifact(built.job, artifact);
      if (!current()) return;
      expectedLoadSession.current = simulation.load(
        target === "esp32s3" ? bytes : new TextDecoder().decode(bytes),
        artifact,
        { autoStart: true },
      );
      tab("hardware");
    });
  /** @brief Reset IDE project state while retaining the in-memory compiler pairing; host resets circuit history. */
  const newProject = (circuit: CircuitProject) => {
    if (!access.canEdit) return;
    stopDesign();
    setDocument({
      ...newWorkspace(circuit),
      files: [{ name: "sketch.ino", content: blankSketch }],
    });
    setCodeVisited(false);
    setSourceRevision((n) => n + 1);
    setResult(undefined);
    setConsent(false);
    setLog("New blank project created.");
  };
  const build = () =>
    runOperation(async () => {
      if (!access.canRun) throw new Error("Build permission unavailable.");
      setLog(
        "Compiling with Arduino CLI… detailed output will appear when the job completes.",
      );
      setResult(undefined);
      const revision = buildRevision.current;
      const r = await client.compile(document.board, document.files);
      if (revision !== buildRevision.current) {
        setLog(
          "Build discarded because source or board changed during compilation. Build again.",
        );
        return;
      }
      setResult(r);
      setLog(r.log);
    });
  const start = () =>
    runOperation(async () => {
      if (!access.canRun) throw new Error("Simulation permission unavailable.");
      if (!result?.success)
        throw new Error(
          "Build successfully before starting compiled source. Or load a sample on Hardware.",
        );
      const target = boardProfiles[document.board].target;
      if (target === null)
        throw new Error(
          "Original ESP32 firmware execution backend is not integrated. Build/upload is available.",
        );
      if (target !== simulation.target)
        throw new Error("Selected build board does not match the circuit MCU.");
      const artifact = result.artifacts.find((a) =>
        target !== "esp32s3"
          ? a.endsWith(".hex") && !a.includes("with_bootloader")
          : a.endsWith(".merged.bin"),
      );
      if (!artifact)
        throw new Error(
          "Compatible simulation image absent. S3 requires a merged flash image; app-only binaries cannot run.",
        );
      const revision = buildRevision.current;
      const bytes = await client.artifact(result.job, artifact);
      if (revision !== buildRevision.current || !latest.current.access.canRun)
        return;
      simulation.load(
        target !== "esp32s3" ? new TextDecoder().decode(bytes) : bytes,
        artifact,
      );
      setLog(
        "Built firmware loaded. Use Run in the simulation controls to execute it.",
      );
      tab("hardware");
    });
  // Changes invalidate build/consent; never upload a stale binary after editing source or selecting a new target.
  const editFiles = (files: WorkspaceDocument["files"]) => {
    if (!access.canEdit) return;
    invalidateCodeRun();
    setDocument((w) => ({ ...w, files }));
    setResult(undefined);
    setConsent(false);
  };
  const selectBoard = (board: BoardId) => {
    if (!access.canEdit) return;
    invalidateCodeRun();
    setDocument((w) => ({ ...w, board }));
    setResult(undefined);
    setConsent(false);
  };
  const upload = () =>
    runOperation(async () => {
      if (!access.canUpload)
        throw new Error("Hardware upload permission unavailable.");
      if (!consent || !result?.success || !port)
        throw new Error(
          "Select a port, build successfully and authorize this physical upload.",
        );
      const grant = await client.request<{ consent: string }>(
        "/authorize-upload",
        { job: result.job, port, confirm: true },
      );
      setConsent(false);
      setLog("Uploading and verifying physical board…");
      const r = await client.request<{ success: boolean; log: string }>(
        "/upload",
        { job: result.job, port, consent: grant.consent },
      );
      setLog(`${r.success ? "Upload verified" : "Upload failed"}\n${r.log}`);
    });
  const toolbar = (
    <>
      <select
        aria-label="Build board"
        disabled={!access.canEdit}
        value={document.board}
        onChange={(e) => selectBoard(e.target.value as BoardId)}
      >
        {Object.entries(boardProfiles).map(([id, b]) => (
          <option key={id} value={id}>
            {b.name}
          </option>
        ))}
      </select>
      <button disabled={!access.canSave} onClick={() => void save()}>
        Save Project
      </button>
      <button
        disabled={!access.canRun || busy || !paired}
        onClick={() => void build()}
      >
        Build
      </button>
      <button
        disabled={
          !access.canUpload ||
          busy ||
          !paired ||
          !consent ||
          !result?.success ||
          !port
        }
        onClick={() => void upload()}
      >
        Upload
      </button>
      <button
        disabled={!access.canRun || busy || !result?.success}
        onClick={() => void start()}
      >
        Load build
      </button>
      <button
        disabled={!access.canRun || busy || !paired}
        title="Compile current editor code and run it on the circuit MCU"
        onClick={() => void runDesign()}
      >
        Run
      </button>
      <button
        disabled={!["running", "paused"].includes(simulation.status)}
        onClick={stopDesign}
      >
        Stop
      </button>
    </>
  );
  const pairing = (
    <div className="companion-bar">
      <label>
        Local companion token{" "}
        <input
          aria-label="Companion token"
          type="password"
          value={token}
          autoComplete="off"
          onChange={(e) => {
            setToken(e.target.value);
            setPaired(false);
          }}
        />
      </label>
      <button
        disabled={busy || token.length < 8}
        onClick={() =>
          void runOperation(async () => {
            const s = await client.request<{ available: boolean }>("/status");
            setPaired(s.available);
            setLog(
              s.available
                ? "Local Arduino CLI connected."
                : "CLI unavailable; run npm run setup:toolchain in simulab-backend.",
            );
          })
        }
      >
        Connect companion
      </button>
      <button
        disabled={!paired || busy}
        onClick={() =>
          void runOperation(async () => {
            const r = await client.request<{
              ports: { port: { address: string } }[];
            }>("/ports");
            setPorts(r.ports.map((p) => p.port.address));
            setLog(
              r.ports.length
                ? "Detected serial ports refreshed."
                : "No physical boards detected. Hardware upload remains unverified.",
            );
          })
        }
      >
        Refresh ports
      </button>
      <select
        aria-label="Physical board port"
        value={port}
        onChange={(e) => {
          setPort(e.target.value);
          setConsent(false);
        }}
      >
        <option value="">Select physical port</option>
        {ports.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <label className="upload-consent">
        <input
          type="checkbox"
          checked={consent}
          disabled={!access.canUpload || !port || !result?.success}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        Authorize flashing the selected board with this build
      </label>
    </div>
  );
  const fileInput = (
    <input
      hidden
      ref={input}
      type="file"
      accept=".json"
      aria-label="Open IDE project"
      onChange={async (e) => {
        if (!access.canEdit) return;
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          if (file.size > 3_100_000) throw new Error("Project exceeds 3 MB");
          const w = parseWorkspace(await file.text());
          buildRevision.current++;
          setDocument(w);
          commit(w.circuit);
          setCodeVisited(true);
          setSourceRevision((n) => n + 1);
          setResult(undefined);
          setConsent(false);
          setLog("Loaded complete project.");
        } catch (error) {
          setLog(String(error));
        }
        e.target.value = "";
      }}
    />
  );
  return {
    canSave: access.canSave,
    canEdit: access.canEdit,
    canRun: access.canRun,
    canUpload: access.canUpload,
    document,
    setDocument,
    tab,
    toolbar,
    pairing,
    fileInput,
    input,
    codeVisited,
    editFiles,
    result,
    busy,
    log,
    libraries,
    sourceRevision,
    resetSources: () => setSourceRevision((n) => n + 1),
    open: () => {
      if (access.canEdit) input.current?.click();
    },
    inspectLibraries: () =>
      void runOperation(async () => {
        const r = await client.request<{ output: string }>("/libraries");
        setLibraries(r.output);
      }),
    installLibrary: (name: string) =>
      void runOperation(async () => {
        if (!access.canEdit)
          throw new Error("Library modification permission unavailable.");
        setLog(`Installing ${name} through Arduino Library Manager…`);
        const r = await client.request<{ log: string }>("/libraries/install", {
          name,
        });
        setLog(r.log);
      }),
    paired,
    runDesign,
    stopDesign,
    newProject,
  };
}
export type IdeController = ReturnType<typeof useIde>;
