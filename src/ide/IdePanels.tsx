import { DockPanel } from "../layout/DockPanel";
import type { WorkspaceLayoutController } from "../layout/useWorkspaceLayout";
import componentSketch from "../../public/examples/components/sketch.ino?raw";
import { lazy, Suspense, useState } from "react";
import type { IdeController } from "./useIde";
import type { SimulationController } from "../simulation/useSimulation";
import { DebuggerPanel } from "./DebuggerPanel";
import { SerialMonitor } from "./SerialMonitor";
import { s3Sketch, unoSketch } from "./workspace";
const CodeEditor = lazy(() => import("./CodeEditor"));
/** @brief Main-workspace panels stay mounted while hidden to preserve editor, serial and debugger state. */
export function IdePanels({
  ide,
  simulation,
  layout,
}: {
  ide: IdeController;
  simulation: SimulationController;
  layout: WorkspaceLayoutController;
}) {
  const w = ide.document;
  const [filename, setFilename] = useState("helper.h");
  return (
    <>
      <div
        className="ide-main"
        hidden={w.activeTab !== "code"}
        role="tabpanel"
        id="panel-code"
        aria-labelledby="tab-code"
      >
        {ide.pairing}
        <div className="ide-actions">
          <button disabled={!ide.canEdit} onClick={ide.open}>
            Open Project
          </button>
          <button disabled={!ide.paired} onClick={ide.inspectLibraries}>
            Installed libraries
          </button>
          <select
            aria-label="Component library package"
            onChange={(e) => {
              if (e.target.value) ide.installLibrary(e.target.value);
              e.target.value = "";
            }}
            disabled={!ide.canEdit || !ide.paired || ide.busy}
          >
            <option value="">Install component library?</option>
            {["RTClib", "Adafruit NeoPixel", "FastLED"].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <input
            disabled={!ide.canEdit}
            aria-label="New source filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <button
            disabled={!ide.canEdit}
            onClick={() => {
              if (
                !/^[A-Za-z][A-Za-z0-9_-]{0,63}\.(ino|h|hpp|cpp|c)$/.test(
                  filename,
                ) ||
                w.files.some(
                  (f) => f.name.toLowerCase() === filename.toLowerCase(),
                ) ||
                w.files.length >= 32
              )
                return;
              ide.editFiles([...w.files, { name: filename, content: "" }]);
              ide.setDocument((p) => ({ ...p, activeFile: filename }));
            }}
          >
            Add file
          </button>
          <button
            disabled={!ide.canEdit}
            onClick={() => {
              ide.resetSources();
              ide.editFiles([
                {
                  name: "sketch.ino",
                  content: ["uno", "nano", "mega2560"].includes(w.board)
                    ? unoSketch
                    : s3Sketch,
                },
              ]);
              ide.setDocument((p) => ({
                ...p,
                activeFile: "sketch.ino",
                breakpoints: {},
              }));
            }}
          >
            Load board sample
          </button>
        </div>
        <div className="ide-actions">
          <button
            disabled={!ide.canEdit}
            onClick={() => {
              ide.resetSources();
              ide.editFiles([{ name: "sketch.ino", content: componentSketch }]);
              ide.setDocument((p) => ({
                ...p,
                activeFile: "sketch.ino",
                breakpoints: {},
              }));
            }}
          >
            Load component sketch
          </button>
          <span>
            Use the Uno component laboratory circuit. Install Adafruit NeoPixel
            before building.
          </span>
        </div>
        <div className="source-tabs" role="tablist" aria-label="Source files">
          {w.files.map((f) => (
            <div key={f.name}>
              <button
                role="tab"
                aria-selected={w.activeFile === f.name}
                onClick={() =>
                  ide.setDocument((p) => ({ ...p, activeFile: f.name }))
                }
              >
                {f.name}
              </button>
              {f.name !== "sketch.ino" && (
                <button
                  disabled={!ide.canEdit}
                  aria-label={`Close ${f.name}`}
                  onClick={() => {
                    ide.editFiles(w.files.filter((s) => s.name !== f.name));
                    ide.setDocument((p) => ({
                      ...p,
                      activeFile:
                        p.activeFile === f.name ? "sketch.ino" : p.activeFile,
                      breakpoints: Object.fromEntries(
                        Object.entries(p.breakpoints).filter(
                          ([name]) => name !== f.name,
                        ),
                      ),
                    }));
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {ide.codeVisited && (
          <Suspense fallback={<p>Loading code editor…</p>}>
            <CodeEditor
              readOnly={!ide.canEdit}
              key={ide.sourceRevision}
              files={w.files}
              activeFile={w.activeFile}
              diagnostics={ide.result?.diagnostics ?? []}
              breakpoints={w.breakpoints}
              onChange={(name, content) =>
                ide.editFiles(
                  w.files.map((f) => (f.name === name ? { ...f, content } : f)),
                )
              }
              onCursor={(name, cursor) =>
                ide.setDocument((p) => ({
                  ...p,
                  files: p.files.map((f) =>
                    f.name === name ? { ...f, cursor } : f,
                  ),
                }))
              }
              onBreakpoint={(name, line) =>
                ide.setDocument((p) => {
                  const lines = p.breakpoints[name] ?? [];
                  return {
                    ...p,
                    breakpoints: {
                      ...p.breakpoints,
                      [name]: lines.includes(line)
                        ? lines.filter((n) => n !== line)
                        : [...lines, line],
                    },
                  };
                })
              }
            />
          </Suspense>
        )}
        {ide.libraries && (
          <details className="library-list" open>
            <summary>
              Installed libraries (install packages locally with Arduino CLI)
            </summary>
            <pre>{ide.libraries}</pre>
          </details>
        )}
      </div>
      <div
        className="ide-main"
        hidden={w.activeTab !== "debugger"}
        role="tabpanel"
        id="panel-debugger"
        aria-labelledby="tab-debugger"
      >
        <DebuggerPanel simulation={simulation} document={w} />
      </div>
      <div
        className="ide-main"
        hidden={w.activeTab !== "serial"}
        role="tabpanel"
        id="panel-serial"
        aria-labelledby="tab-serial"
      >
        <SerialMonitor
          simulation={simulation}
          canSave={ide.canSave}
          canRun={ide.canRun}
          canUpload={ide.canUpload}
        />
      </div>
      <DockPanel
        {...layout.pane("bottom")}
        inactive={w.activeTab === "hardware"}
      >
        <section className="build-output" aria-label="Build output">
          <details open>
            <summary>
              {ide.busy ? "Toolchain running…" : "Build output / console"}{" "}
              {ide.result
                ? ide.result.success
                  ? "· Build passed"
                  : "· Build failed"
                : ""}
            </summary>
            <pre aria-live="polite">{ide.log}</pre>
          </details>
        </section>
      </DockPanel>
      {ide.fileInput}
    </>
  );
}
