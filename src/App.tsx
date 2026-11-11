import {
  copySelection,
  pasteSelection,
  deleteSelection,
  moveComponents,
  selectAll,
  emptySelection,
  type CircuitSelection,
  type CircuitClipboard,
} from "./circuit/selection";
import { SelectionToolbar } from "./editor/SelectionToolbar";
import { ConfirmDialog } from "./editor/ConfirmDialog";
import { DesignRunControls } from "./editor/DesignRunControls";
import { DockPanel } from "./layout/DockPanel";
import { LayoutMenu } from "./layout/LayoutMenu";
import { useWorkspaceLayout } from "./layout/useWorkspaceLayout";
import { useAccount, AccountControls, SubscriptionBanner } from "./accounts";
import { createComponentsExample } from "./circuit/components-example";
import { useIde } from "./ide/useIde";
import { IdePanels } from "./ide/IdePanels";

import type { ModelSnapshot } from "./models/contract";
import { GPIOStates } from "./simulation/GPIOStates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  BackgroundVariant,
  SelectionMode,
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

import { createComponent, catalog } from "./circuit/catalog";

import type { CircuitProject, ComponentKind } from "./circuit/types";

import {
  createBlankProject,
  parseProject,
  serializeProject,
} from "./circuit/project";

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
  components: {} as Record<string, ModelSnapshot>,
};

const kinds = Object.keys(catalog) as ComponentKind[];

/** @brief Persistent hardware/IDE composition; real MCU execution stays in target-specific Workers. */

export default function App() {
  const account = useAccount();
  const layout = useWorkspaceLayout(account.storageKey);
  const {
    project,
    commit: commitProject,
    undo: undoProject,
    redo: redoProject,
    past,
    future,
  } = useEditor();
  const commit = useCallback(
    (next: CircuitProject) => {
      if (account.canEdit) commitProject(next);
    },
    [account.canEdit, commitProject],
  );
  const undo = () => {
    if (account.canEdit) {
      undoProject();
      setSelection(emptySelection());
      setDraft({});
    }
  };
  const redo = () => {
    if (account.canEdit) {
      redoProject();
      setSelection(emptySelection());
      setDraft({});
    }
  };
  const flow = useReactFlow();
  const runtime = useSimulation(project);
  const simulation = {
    ...runtime,
    load: (...args: Parameters<typeof runtime.load>) => {
      if (account.canRun) return runtime.load(...args);
    },
    command: (type: Parameters<typeof runtime.command>[0]) => {
      if (account.canRun || type === "stop" || type === "pause")
        runtime.command(type);
    },
    sendUART: (text: string) => {
      if (account.canRun) runtime.sendUART(text);
    },
    input: (pin: string, value: boolean) => {
      if (account.canRun) runtime.input(pin, value);
    },
    setButton: (id: string, pressed: boolean) => {
      if (account.canRun) runtime.setButton(id, pressed);
    },
    step: () => {
      if (account.canRun) runtime.step();
    },
  };
  useEffect(() => {
    if (!account.canRun && runtime.status === "running")
      runtime.command("stop");
  }, [account.canRun, runtime.status]);
  const ide = useIde(project, commitProject, simulation, account);
  const projection = simulation.projection ?? EMPTY_PROJECTION;
  const showingSignals = ["running", "paused"].includes(simulation.status);
  const [selection, setSelection] = useState<CircuitSelection>(emptySelection);
  const selected =
    selection.nodes.length + selection.edges.length === 1
      ? (selection.nodes[0] ?? selection.edges[0])
      : undefined;
  const setSelected = (id?: string) =>
    setSelection(
      !id
        ? emptySelection()
        : project.wires.some((w) => w.id === id)
          ? { nodes: [], edges: [id] }
          : { nodes: [id], edges: [] },
    );
  const [clipboard, setClipboard] = useState<CircuitClipboard>();
  const pasteOffset = useRef(0);
  const [confirmation, setConfirmation] = useState<"new" | "deleteAll" | null>(
    null,
  );
  useEffect(() => {
    const nodes = new Set(project.components.map((c) => c.id)),
      edges = new Set(project.wires.map((w) => w.id));
    setSelection((s) => {
      const next = {
        nodes: s.nodes.filter((id) => nodes.has(id)),
        edges: s.edges.filter((id) => edges.has(id)),
      };
      return next.nodes.length === s.nodes.length &&
        next.edges.length === s.edges.length
        ? s
        : next;
    });
  }, [project]);
  const [notice, setNotice] = useState(
    "Ready. Drag empty canvas to select; Space + drag to pan. Click two pins to connect.",
  );
  const [tab, setTab] = useState("checks");
  const wasBusy = useRef(false);
  useEffect(() => {
    if (ide.busy && !wasBusy.current && ide.document.activeTab === "hardware") {
      setTab("build");
      if (!layout.layout.panels.bottom.visible) layout.toggle("bottom");
    }
    wasBusy.current = ide.busy;
  }, [ide.busy, ide.document.activeTab]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (tab === "serial") void flow.fitView({ padding: 0.22 });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab]);
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
          deviceState: projection.components?.[c.id],
          ledState: showingSignals ? projection.ledStates[c.id] : null,
          buttonPressed: simulation.buttons[c.id],
          onButtonChange: showingSignals
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
      projection.components,
    ],
  );
  const nodes = useMemo(
    () =>
      baseNodes.map((n) => ({
        ...n,
        selected: selection.nodes.includes(n.id),
      })),
    [baseNodes, selection.nodes],
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
        selected: selection.edges.includes(w.id),
        interactionWidth: 22,
      })),
    [project.wires, selection.edges],
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
    if (!account.canEdit) return;
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
      schemaVersion: "1.3.0",
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
    const selectedChanges = list.filter((c) => c.type === "select");
    if (selectedChanges.length)
      setSelection((s) => {
        const nodes = new Set(s.nodes);
        for (const c of selectedChanges) {
          if (c.type === "select") {
            if (c.selected) nodes.add(c.id);
            else nodes.delete(c.id);
          }
        }
        return { ...s, nodes: [...nodes] };
      });
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
    // XYFlow keyboard nudges have no pointer drag-stop callback. Commit the complete batch once.
    const settled = list.filter(
      (c) => c.type === "position" && c.position && c.dragging === false,
    );
    if (account.canEdit && settled.length) {
      try {
        const current = useEditor.getState().project;
        const positions = Object.fromEntries(
          settled.flatMap((c) =>
            c.type === "position" && c.position ? [[c.id, c.position]] : [],
          ),
        );
        const next = moveComponents(current, positions);
        if (next !== current) commit(next);
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Unable to move selection.",
        );
      } finally {
        setDraft({});
      }
    }
  };

  const deleteCurrentSelection = () => {
    if (!account.canEdit) return;
    const next = deleteSelection(project, selection);
    if (next !== project) commit(next);
    setSelection(emptySelection());
    setDraft({});
    setNotice(
      "Selection deleted. Undo restores the components and connections.",
    );
  };
  const remove = () => {
    if (!account.canEdit) return;
    if (
      project.components.length &&
      selection.nodes.length === project.components.length
    ) {
      setConfirmation("deleteAll");
      return;
    }
    deleteCurrentSelection();
  };
  const copy = () => {
    if (!account.canEdit) return;
    const clip = copySelection(project, selection);
    if (!clip.components.length) return;
    setClipboard(clip);
    pasteOffset.current = 0;
    setNotice(
      `Copied ${clip.components.length} components and ${clip.wires.length} internal connections.`,
    );
  };
  const paste = (clip = clipboard) => {
    if (!account.canEdit || !clip?.components.length) return;
    try {
      const offset = 40 * (pasteOffset.current + 1);
      const result = pasteSelection(project, clip, { x: offset, y: offset });
      commit(result.project);
      setSelection(result.selection);
      pasteOffset.current++;
      setNotice(
        "Pasted components with new identities and preserved internal connections.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to paste selection.",
      );
    }
  };
  const duplicate = () => {
    const clip = copySelection(project, selection);
    if (!account.canEdit || !clip.components.length) return;
    setClipboard(clip);
    pasteOffset.current = 0;
    paste(clip);
  };
  const finishMove = (moved: Node[]) => {
    if (!account.canEdit) return;
    try {
      const current = useEditor.getState().project;
      const next = moveComponents(
        current,
        Object.fromEntries(moved.map((n) => [n.id, n.position])),
      );
      if (next !== current) commit(next);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to move selection.",
      );
    } finally {
      setDraft({});
    }
  };
  const confirmAction = () => {
    if (!account.canEdit) {
      setConfirmation(null);
      return;
    }
    if (confirmation === "new") {
      const blank = createBlankProject();
      ide.newProject(blank);
      useEditor.getState().reset(blank);
      setSelection(emptySelection());
      setDraft({});
      setDimensions({});
      void flow.setViewport({ x: 0, y: 0, zoom: 1 });
      setNotice(
        "Blank project ready. Add a microcontroller and components, then write your code.",
      );
    } else if (confirmation === "deleteAll") {
      commit({ ...project, components: [], wires: [] });
      setSelection(emptySelection());
      setDraft({});
      setNotice(
        "All components and connections deleted. Undo restores the design; source code is retained.",
      );
    }
    setConfirmation(null);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        ide.document.activeTab !== "hardware" ||
        confirmation
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.(
          'input,textarea,select,[contenteditable="true"],.monaco-editor,dialog,[role="dialog"]',
        )
      )
        return;
      const command = event.ctrlKey || event.metaKey;
      const k = event.key.toLowerCase();
      if (command && k === "a") {
        event.preventDefault();
        setSelection(selectAll(project));
      } else if (command && k === "c" && selection.nodes.length) {
        event.preventDefault();
        copy();
      } else if (command && k === "v" && clipboard) {
        event.preventDefault();
        paste();
      } else if (command && k === "d" && selection.nodes.length) {
        event.preventDefault();
        duplicate();
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (selection.nodes.length || selection.edges.length)
      ) {
        event.preventDefault();
        remove();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    project,
    selection,
    clipboard,
    confirmation,
    account.canEdit,
    ide.document.activeTab,
  ]);
  const runDesign = () => {
    setTab("build");
    if (!layout.layout.panels.bottom.visible) layout.toggle("bottom");
    void ide.runDesign();
  };

  const exportProject = async () => {
    if (!account.canSave) {
      setNotice("Export requires an active paid plan and write permission.");
      return;
    }
    try {
      await account.saveProject(project.name, project);
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
      <LayoutMenu controller={layout} />
      <DockPanel {...layout.pane("top")}>
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
          <AccountControls />
          <div className="header-actions">
            {ide.toolbar}
            <button
              disabled={!account.canEdit}
              onClick={() => input.current?.click()}
            >
              <FolderOpen size={15} /> Open
            </button>
            <button
              className="primary"
              disabled={!account.canSave}
              onClick={() => void exportProject()}
            >
              <Download size={15} /> Export project
            </button>
          </div>
        </header>
        <SubscriptionBanner />
      </DockPanel>

      <nav
        className="main-tabs"
        role="tablist"
        aria-label="Workspace tabs"
        onKeyDown={(e) => {
          const tabs = ["hardware", "code", "debugger", "serial"] as const;
          const index = tabs.indexOf(ide.document.activeTab);
          const next =
            e.key === "ArrowRight"
              ? (index + 1) % 4
              : e.key === "ArrowLeft"
                ? (index + 3) % 4
                : e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 3
                    : -1;
          if (next >= 0) {
            e.preventDefault();
            ide.tab(tabs[next]);
            document.getElementById("tab-" + tabs[next])?.focus();
          }
        }}
      >
        {(
          [
            ["hardware", "Hardware"],
            ["code", "Code Editor"],
            ["debugger", "Debugger"],
            ["serial", "Serial Monitor"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            id={"tab-" + id}
            role="tab"
            aria-selected={ide.document.activeTab === id}
            aria-controls={"panel-" + id}
            tabIndex={ide.document.activeTab === id ? 0 : -1}
            onClick={() => ide.tab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="workspace workspace-shell">
        <DockPanel {...layout.pane("left")}>
          <fieldset disabled={!account.canEdit} style={{ display: "contents" }}>
            <ComponentPalette
              onAdd={add}
              onLoadComponentExample={() => {
                commit(createComponentsExample());
                setSelected(undefined);
                setDraft({});
                setTimeout(() => flow.fitView({ padding: 0.2 }), 100);
              }}
              onLoadYdExample={() => {
                commit(createYdExample());
                setSelected(undefined);
                setDraft({});
                setTimeout(() => flow.fitView({ padding: 0.15 }), 100);
              }}
            />
          </fieldset>
        </DockPanel>

        <div className="workspace-center">
          <main
            className="studio"
            role="tabpanel"
            id="panel-hardware"
            aria-labelledby="tab-hardware"
            hidden={ide.document.activeTab !== "hardware"}
          >
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
                <button
                  aria-label="Undo"
                  disabled={!account.canEdit || !past.length}
                  onClick={undo}
                >
                  <Undo2 size={17} />
                </button>
                <button
                  aria-label="Redo"
                  disabled={!account.canEdit || !future.length}
                  onClick={redo}
                >
                  <Redo2 size={17} />
                </button>
                <span className="divider" />
                <span
                  className={`demo-badge ${showingSignals ? "genuine" : ""}`}
                >
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

            <SelectionToolbar
              canEdit={account.canEdit}
              components={selection.nodes.length}
              wires={selection.edges.length}
              total={project.components.length + project.wires.length}
              canPaste={!!clipboard?.components.length}
              onNew={() => setConfirmation("new")}
              onSelectAll={() => setSelection(selectAll(project))}
              onCopy={copy}
              onPaste={() => paste()}
              onDuplicate={duplicate}
              onDelete={remove}
              onDeleteAll={() => setConfirmation("deleteAll")}
            />
            <DesignRunControls
              simulation={simulation}
              canRun={account.canRun}
              paired={ide.paired}
              busy={ide.busy}
              onRun={runDesign}
              onStop={ide.stopDesign}
              onPair={() => ide.tab("code")}
            />
            <SimulationControls
              simulation={simulation}
              enabled={account.canRun}
            />
            <div
              className="canvas"
              data-testid="circuit-canvas"
              tabIndex={0}
              aria-label="Circuit design canvas"
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
                nodesDraggable={account.canEdit}
                nodesConnectable={account.canEdit}
                panActivationKeyCode={
                  ide.document.activeTab === "hardware" ? "Space" : null
                }
                selectionKeyCode={null}
                selectionMode={SelectionMode.Partial}
                panOnDrag={[1, 2]}
                selectNodesOnDrag={false}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={changes}
                onEdgesChange={(list) => {
                  const selectedChanges = list.filter(
                    (c) => c.type === "select",
                  );
                  if (selectedChanges.length)
                    setSelection((s) => {
                      const edges = new Set(s.edges);
                      for (const c of selectedChanges) {
                        if (c.type === "select") {
                          if (c.selected) edges.add(c.id);
                          else edges.delete(c.id);
                        }
                      }
                      return { ...s, edges: [...edges] };
                    });
                }}
                onNodeDragStop={(_, node, nodes) =>
                  finishMove(nodes.length ? nodes : [node])
                }
                onSelectionDragStop={(_, nodes) => finishMove(nodes)}
                onConnect={onConnect}
                connectionMode={ConnectionMode.Loose}
                connectionRadius={18}
                connectOnClick
                snapToGrid
                snapGrid={[20, 20]}
                onNodeClick={() => {
                  cancelEdgeSelection();
                }}
                onEdgeClick={() => cancelEdgeSelection()}
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
                multiSelectionKeyCode="Shift"
                selectionOnDrag
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
                <span className="note-separator">/</span> Drag to select / Space
                + drag to pan
              </div>
              <div className="canvas-tip">
                <GitBranch size={14} /> Double-click a wire to add a junction
              </div>
            </div>

            <DockPanel {...layout.pane("bottom")}>
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
                  <button
                    className={tab === "build" ? "active" : ""}
                    onClick={() => setTab("build")}
                  >
                    Build output
                  </button>
                  <span className="panel-state">
                    <span /> Editor ready
                  </span>
                </div>
                <div className="panel-content">
                  {tab === "build" ? (
                    <pre
                      className="design-build-log"
                      data-testid="design-build-output"
                      aria-live="polite"
                    >
                      {ide.log}
                    </pre>
                  ) : tab === "checks" ? (
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
                            No structural connectivity issues. Meters use
                            bounded DC analysis during execution; full analog
                            SPICE is unavailable.
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
            </DockPanel>
          </main>
          <IdePanels ide={ide} simulation={simulation} layout={layout} />
        </div>
        <DockPanel {...layout.pane("right")}>
          <fieldset disabled={!account.canEdit} style={{ display: "contents" }}>
            {selection.nodes.length + selection.edges.length > 1 ? (
              <aside className="inspector selection-inspector">
                <h2>Group selection</h2>
                <p>
                  {selection.nodes.length} components and{" "}
                  {selection.edges.length} wires selected.
                </p>
                <p>
                  Drag any selected component to move the group. Copy/paste
                  preserves connections inside the group.
                </p>
                <button onClick={remove}>Delete selected group</button>
              </aside>
            ) : (
              <Inspector
                project={project}
                selected={selected}
                commit={commit}
                onDelete={remove}
                onNotice={setNotice}
                deviceStates={projection.components}
              />
            )}
          </fieldset>
        </DockPanel>
      </div>

      {confirmation && (
        <ConfirmDialog
          title={
            confirmation === "new"
              ? "Start a new project?"
              : "Delete all components?"
          }
          message={
            confirmation === "new"
              ? "This clears the current circuit and all editor source files, stops simulation, and starts a blank project. Save or export your current work first if you need it."
              : `Delete all ${project.components.length} components and ${project.wires.length} wires? Source code is kept, and you can Undo this deletion.`
          }
          confirmLabel={
            confirmation === "new"
              ? "Start new project"
              : "Delete all components"
          }
          onConfirm={confirmAction}
          onCancel={() => setConfirmation(null)}
        />
      )}
      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          {notice}
        </span>
        <div>
          <span>{project.components.length} components</span>
          <span>{project.wires.length} wires</span>
          <span>{nets.length} nets</span>
          <strong>SimuLab 0.5.0</strong>
        </div>
      </footer>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Import circuit JSON"
        hidden
        onChange={async (e) => {
          if (!account.canEdit) return;
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
