import { GPIOStates } from "./simulation/GPIOStates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
} from "@xyflow/react";

import {
  Cpu,
  Undo2,
  Redo2,
  Download,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  FolderOpen,
  SquareTerminal,
  Info,
} from "lucide-react";

import { createComponent } from "./circuit/catalog";

import type { CircuitProject, ComponentKind } from "./circuit/types";

import { parseProject, serializeProject } from "./circuit/project";

import { buildNets, validateCircuit } from "./circuit/netlist";

import { connect, splitWire } from "./circuit/editing";

import { ComponentNode } from "./editor/ComponentNode";

import { ComponentPalette } from "./editor/ComponentPalette";
import { Inspector } from "./editor/Inspector";
import { useSimulation } from "./simulation/useSimulation";
import { UartInput } from "./simulation/UartInput";
import { createYdExample } from "./circuit/yd-example";
import { SimulationControls } from "./simulation/SimulationControls";

import { useEditor } from "./editor/store";

const nodeTypes = { part: ComponentNode };
const EMPTY_PROJECTION = {
  ledStates: {} as Record<string, boolean | null>,
  issues: [] as string[],
};

const kinds: ComponentKind[] = [
  "uno",
  "yd-esp32-s3",
  "led",
  "resistor",
  "switch",
  "junction",
];

/** @brief Phase 1 studio. Execution is deliberately unavailable until a real emulator adapter exists. */

export default function App() {
  const { project, commit, undo, redo, past, future } = useEditor();
  const flow = useReactFlow();
  const simulation = useSimulation(project);
  const projection = simulation.projection ?? EMPTY_PROJECTION;
  const showingSignals = ["running", "paused"].includes(simulation.status);
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice] = useState(
    "Ready. Click two pins to connect, or drag between pins.",
  );
  const [tab, setTab] = useState("checks");
  const [draft, setDraft] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [dimensions, setDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const input = useRef<HTMLInputElement>(null);
  const edgeSelectionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(edgeSelectionTimer.current), []);
  const cancelEdgeSelection = () => clearTimeout(edgeSelectionTimer.current);
  const nets = useMemo(() => buildNets(project), [project]);
  const checks = useMemo(
    () => [
      ...validateCircuit(project),
      ...(showingSignals
        ? projection.issues.map((message) => ({
            severity: "warning" as const,
            message,
          }))
        : []),
    ],
    [project, projection.issues, showingSignals],
  );

  // Keep node data stable during selection; handle measurements must survive a click.
  const baseNodes: Node[] = useMemo(
    () =>
      project.components.map((c) => ({
        id: c.id,
        type: "part",
        position: draft[c.id] ?? c.position,
        measured: dimensions[c.id],
        data: {
          part: c,
          ledState: showingSignals ? projection.ledStates[c.id] : null,
          buttonPressed: simulation.buttons[c.id],
          onButtonChange:
            simulation.target === "esp32s3" && showingSignals
              ? (pressed: boolean) => simulation.setButton(c.id, pressed)
              : undefined,
          onBootChange:
            simulation.target === "esp32s3" && showingSignals
              ? (pressed: boolean) => simulation.input("GPIO0", !pressed)
              : undefined,
          onReset:
            simulation.target === "esp32s3" && simulation.snapshot
              ? () => simulation.command("reset")
              : undefined,
        },
      })),
    [
      simulation.target,
      simulation.status,
      simulation.buttons,
      project.components,
      draft,
      dimensions,
      showingSignals,
      projection.ledStates,
    ],
  );
  const nodes = useMemo(
    () => baseNodes.map((n) => ({ ...n, selected: selected === n.id })),
    [baseNodes, selected],
  );
  const edges: Edge[] = useMemo(
    () =>
      project.wires.map((w) => ({
        id: w.id,
        source: w.from.componentId,
        sourceHandle: w.from.pinId,
        target: w.to.componentId,
        targetHandle: w.to.pinId,
        type: "step",
        style: { stroke: w.color, strokeWidth: 2.5 },
        label: w.label,
        selected: selected === w.id,
        interactionWidth: 22,
      })),
    [project.wires, selected],
  );

  const attempt = useCallback(
    (fn: () => CircuitProject) => {
      try {
        commit(fn());
        setNotice("Circuit updated. Connectivity checks refreshed.");
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Unable to update circuit.");
      }
    },
    [commit],
  );

  const add = (kind: ComponentKind, position?: { x: number; y: number }) => {
    const p =
      position ??
      flow.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    const c = createComponent(kind, {
      x: Math.round(p.x / 20) * 20,
      y: Math.round(p.y / 20) * 20,
    });
    commit({
      ...project,
      schemaVersion: kind === "yd-esp32-s3" ? "1.1.0" : project.schemaVersion,
      components: [...project.components, c],
    });
    setSelected(c.id);
    if (kind === "yd-esp32-s3")
      setTimeout(() => flow.fitView({ padding: 0.15 }), 100);
  };

  const onConnect = (c: Connection) =>
    attempt(() =>
      connect(
        project,
        { componentId: c.source, pinId: c.sourceHandle ?? "" },
        { componentId: c.target, pinId: c.targetHandle ?? "" },
      ),
    );

  const changes = (list: NodeChange[]) => {
    for (const change of list) {
      // Controlled XYFlow nodes must retain measurements across GPIO/selection rerenders.
      if (change.type === "dimensions" && change.dimensions) {
        const next = change.dimensions;
        setDimensions((previous) =>
          previous[change.id]?.width === next.width &&
          previous[change.id]?.height === next.height
            ? previous
            : { ...previous, [change.id]: next },
        );
      }
      if (change.type === "position" && change.position)
        setDraft((s) => ({ ...s, [change.id]: change.position! }));
    }
  };

  const remove = () => {
    if (!selected) return;
    commit({
      ...project,
      components: project.components.filter((c) => c.id !== selected),
      wires: project.wires.filter(
        (w) =>
          w.id !== selected &&
          w.from.componentId !== selected &&
          w.to.componentId !== selected,
      ),
    });
    setSelected(undefined);
  };

  const exportProject = () => {
    try {
      const blob = new Blob([serializeProject(project)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulab-circuit.json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Circuit exported with all pin and junction connections.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Export failed");
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SimuLab home">
          <span className="brand-mark">
            <Cpu size={24} />
          </span>
          Simu<span>Lab</span>
          <em>STUDIO</em>
        </a>
        <div className="breadcrumb">
          Workspace <ChevronRight size={13} /> <strong>{project.name}</strong>
          <span className="saved-dot" />
        </div>
        <div className="header-actions">
          <span className="local-tag">LOCAL WORKSPACE</span>
          <button onClick={() => input.current?.click()}>
            <FolderOpen size={15} /> Open
          </button>
          <button className="primary" onClick={exportProject}>
            <Download size={15} /> Export project
          </button>
        </div>
      </header>

      <div className="workspace">
        <ComponentPalette
          onAdd={add}
          onLoadYdExample={() => {
            commit(createYdExample());
            setSelected(undefined);
            setDraft({});
            setTimeout(() => flow.fitView({ padding: 0.15 }), 100);
          }}
        />

        <main className="studio">
          <div className="canvas-toolbar">
            <div className="document-title">
              <span className="document-icon">
                <Cpu size={17} />
              </span>
              <div>
                <strong>{project.name}</strong>
                <small>
                  Circuit design <span> </span> MCU circuit studio
                </small>
              </div>
            </div>
            <div className="tool-actions">
              <button aria-label="Undo" disabled={!past.length} onClick={undo}>
                <Undo2 size={17} />
              </button>
              <button
                aria-label="Redo"
                disabled={!future.length}
                onClick={redo}
              >
                <Redo2 size={17} />
              </button>
              <span className="divider" />
              <span className={`demo-badge ${showingSignals ? "genuine" : ""}`}>
                {showingSignals
                  ? simulation.target === "esp32s3"
                    ? "ESP32-S3 EXECUTION"
                    : "AVR EXECUTION"
                  : simulation.status === "ready"
                    ? "FIRMWARE READY"
                    : "DEMO MODE"}
              </span>
              <button
                className="validate"
                onClick={() => {
                  setTab("checks");
                  setNotice(
                    `Connectivity checked: ${checks.length} finding(s).`,
                  );
                }}
              >
                <CheckCircle2 size={15} /> Check circuit
              </button>
            </div>
          </div>

          <SimulationControls simulation={simulation} />
          <div
            className="canvas"
            data-testid="circuit-canvas"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const k = e.dataTransfer.getData(
                "application/simulab",
              ) as ComponentKind;
              if (kinds.includes(k))
                add(
                  k,
                  flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
                );
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={changes}
              onNodeDragStop={(_, node) => {
                commit({
                  ...project,
                  components: project.components.map((c) =>
                    c.id === node.id ? { ...c, position: node.position } : c,
                  ),
                });
                setDraft({});
              }}
              onConnect={onConnect}
              connectionMode={ConnectionMode.Loose}
              connectionRadius={18}
              connectOnClick
              snapToGrid
              snapGrid={[20, 20]}
              onNodeClick={(_, n) => {
                cancelEdgeSelection();
                setSelected(n.id);
              }}
              onEdgeClick={(_, e) => {
                // Defer inspector selection so a rapid second click retains its SVG hit target.
                cancelEdgeSelection();
                edgeSelectionTimer.current = setTimeout(
                  () => setSelected(e.id),
                  180,
                );
              }}
              onPaneClick={() => {
                cancelEdgeSelection();
                setSelected(undefined);
              }}
              onEdgeDoubleClick={(e, edge) => {
                cancelEdgeSelection();
                attempt(() =>
                  splitWire(
                    project,
                    edge.id,
                    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
                  ),
                );
              }}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.25}
              maxZoom={2}
              elevateEdgesOnSelect={false}
              elevateNodesOnSelect={false}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              selectionOnDrag={false}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#c9d3d6"
              />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor="#178477"
                maskColor="rgba(239,244,244,.75)"
              />
            </ReactFlow>
            <div className="canvas-note">
              <span /> ELECTRICAL DESIGN CANVAS{" "}
              <span className="note-separator">/</span> 20 px grid
            </div>
            <div className="canvas-tip">
              <GitBranch size={14} /> Double-click a wire to add a junction
            </div>
          </div>

          <section className="bottom-panel">
            <div className="panel-tabs">
              <button
                className={tab === "checks" ? "active" : ""}
                onClick={() => setTab("checks")}
              >
                <CheckCircle2 size={14} /> Connectivity{" "}
                <span>{checks.length}</span>
              </button>
              <button
                className={tab === "nets" ? "active" : ""}
                onClick={() => setTab("nets")}
              >
                <GitBranch size={14} /> Netlist <span>{nets.length}</span>
              </button>
              <button
                className={tab === "serial" ? "active" : ""}
                onClick={() => setTab("serial")}
              >
                <SquareTerminal size={14} /> Serial monitor
              </button>
              <button
                className={tab === "gpio" ? "active" : ""}
                onClick={() => setTab("gpio")}
              >
                GPIO states
              </button>
              <span className="panel-state">
                <span /> Editor ready
              </span>
            </div>
            <div className="panel-content">
              {tab === "checks" ? (
                checks.length ? (
                  <div className="findings">
                    {checks.map((c, i) => (
                      <div key={i} className={`finding ${c.severity}`}>
                        <Info size={14} />
                        <span>{c.message}</span>
                        <small>{c.severity}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-check">
                    <CheckCircle2 size={25} />
                    <div>
                      <strong>Connections look good</strong>
                      <p>
                        No structural connectivity issues. Analog behavior is
                        not evaluated.
                      </p>
                    </div>
                  </div>
                )
              ) : tab === "nets" ? (
                <div className="net-list">
                  {nets.map((n) => (
                    <div key={n.id}>
                      <strong>{n.id}</strong>
                      <code>
                        {n.endpoints
                          .map((p) => `${p.componentId}.${p.pinId}`)
                          .join(" / ")}
                      </code>
                    </div>
                  ))}
                </div>
              ) : tab === "gpio" ? (
                <GPIOStates simulation={simulation} />
              ) : (
                <div
                  className="serial-console"
                  data-testid="serial-output"
                  aria-label="Firmware UART output"
                >
                  <div className="serial-heading">
                    <SquareTerminal size={13} /> UART /{" "}
                    {simulation.target === "esp32s3"
                      ? "ESP32-S3 guest console"
                      : "9600 sample baud"}{" "}
                    <span>
                      {simulation.target === "esp32s3"
                        ? "ESP32-S3 Xtensa LX7"
                        : "ATmega328P"}{" "}
                      - CPU timestamped
                    </span>
                  </div>
                  <UartInput simulation={simulation} />
                  {simulation.error ? (
                    <p role="alert">{simulation.error}</p>
                  ) : simulation.serial ? (
                    <pre>{simulation.serial}</pre>
                  ) : (
                    <p>
                      {simulation.status === "idle"
                        ? "Load target-compatible firmware to connect the serial monitor."
                        : "Waiting for firmware UART output. No synthetic output is generated."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        <Inspector
          project={project}
          selected={selected}
          commit={commit}
          onDelete={remove}
          onNotice={setNotice}
        />
      </div>

      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          {notice}
        </span>
        <div>
          <span>{project.components.length} components</span>
          <span>{project.wires.length} wires</span>
          <span>{nets.length} nets</span>
          <strong>SimuLab 0.3.0</strong>
        </div>
      </footer>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Import circuit JSON"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 2_000_000)
              throw new Error("Project exceeds 2 MB limit.");
            const p = parseProject(await file.text());
            commit(p);
            setSelected(undefined);
            setDraft({});
            setNotice("Project imported. Electrical connectivity restored.");
            setTimeout(() => flow.fitView({ padding: 0.2 }), 100);
          } catch (error) {
            setNotice(
              error instanceof Error ? error.message : "Invalid project",
            );
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
