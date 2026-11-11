import type { CircuitComponent, CircuitProject, Point, Wire } from "./types";
import { parseProject } from "./project";
export interface CircuitSelection {
  nodes: string[];
  edges: string[];
}
export interface CircuitClipboard {
  components: CircuitComponent[];
  wires: Wire[];
}
export const emptySelection = (): CircuitSelection => ({
  nodes: [],
  edges: [],
});
/** @brief Select document identities without changing portable circuit data. */
export const selectAll = (project: CircuitProject): CircuitSelection => ({
  nodes: project.components.map((c) => c.id),
  edges: project.wires.map((w) => w.id),
});
/** @brief Remove selected items and every incident wire atomically; no orphan endpoints survive. */
export function deleteSelection(
  project: CircuitProject,
  selection: CircuitSelection,
): CircuitProject {
  const nodes = new Set(selection.nodes),
    edges = new Set(selection.edges);
  const components = project.components.filter((c) => !nodes.has(c.id));
  const wires = project.wires.filter(
    (w) =>
      !edges.has(w.id) &&
      !nodes.has(w.from.componentId) &&
      !nodes.has(w.to.componentId),
  );
  return components.length === project.components.length &&
    wires.length === project.wires.length
    ? project
    : { ...project, components, wires };
}
/** @brief Copy selected components plus all internal connections; external attachments never cross the clipboard boundary. */
export function copySelection(
  project: CircuitProject,
  selection: CircuitSelection,
): CircuitClipboard {
  const ids = new Set(selection.nodes);
  const copied = parseProject(
    JSON.stringify({
      ...project,
      schemaVersion: "1.3.0",
      components: project.components.filter((c) => ids.has(c.id)),
      wires: project.wires.filter(
        (w) => ids.has(w.from.componentId) && ids.has(w.to.componentId),
      ),
    }),
  );
  return { components: copied.components, wires: copied.wires };
}
const validPoint = (p: Point) =>
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  Math.abs(p.x) <= 100000 &&
  Math.abs(p.y) <= 100000;
/** @brief Paste a bounded subgraph with fresh identities, retaining exact native pin IDs.
 * @param createId Optional host ID factory; every returned identity must be unique and schema-valid.
 */
export function pasteSelection(
  project: CircuitProject,
  clipboard: CircuitClipboard,
  offset: Point = { x: 40, y: 40 },
  createId: () => string = () => crypto.randomUUID(),
): { project: CircuitProject; selection: CircuitSelection } {
  if (!validPoint(offset))
    throw new Error("Paste offset is outside the design limits.");
  if (!clipboard.components.length)
    return { project, selection: emptySelection() };
  const used = new Set([
    ...project.components.map((c) => c.id),
    ...project.wires.map((w) => w.id),
  ]);
  const fresh = () => {
    for (let n = 0; n < 20; n++) {
      const id = createId();
      if (!used.has(id)) {
        used.add(id);
        return id;
      }
    }
    throw new Error("Unable to allocate unique component identities.");
  };
  const ids = new Map(clipboard.components.map((c) => [c.id, fresh()]));
  const components = clipboard.components.map((c) => ({
    ...c,
    id: ids.get(c.id)!,
    label: (c.label.slice(0, 195) + " copy").slice(0, 200),
    properties: { ...c.properties },
    position: { x: c.position.x + offset.x, y: c.position.y + offset.y },
  }));
  const wires = clipboard.wires.map((w) => {
    if (!ids.has(w.from.componentId) || !ids.has(w.to.componentId))
      throw new Error("Clipboard contains an external connection.");
    return {
      ...w,
      id: fresh(),
      from: { ...w.from, componentId: ids.get(w.from.componentId)! },
      to: { ...w.to, componentId: ids.get(w.to.componentId)! },
    };
  });
  const next = parseProject(
    JSON.stringify({
      ...project,
      schemaVersion: "1.3.0",
      components: [...project.components, ...components],
      wires: [...project.wires, ...wires],
    }),
  );
  return {
    project: next,
    selection: {
      nodes: components.map((c) => c.id),
      edges: wires.map((w) => w.id),
    },
  };
}
/** @brief Commit all moved components in one history step; invalid positions reject the entire gesture. */
export function moveComponents(
  project: CircuitProject,
  positions: Record<string, Point>,
): CircuitProject {
  let changed = false;
  const components = project.components.map((c) => {
    const p = positions[c.id];
    if (!p) return c;
    if (!validPoint(p))
      throw new Error("Component position is outside the design limits.");
    if (p.x === c.position.x && p.y === c.position.y) return c;
    changed = true;
    return { ...c, position: { ...p } };
  });
  return changed ? { ...project, components } : project;
}
