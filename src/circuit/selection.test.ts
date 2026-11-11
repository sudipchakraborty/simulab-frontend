import { it, expect } from "vitest";
import {
  createSampleProject,
  parseProject,
  createBlankProject,
} from "./project";
import {
  copySelection,
  pasteSelection,
  deleteSelection,
  moveComponents,
  selectAll,
} from "./selection";
it("copies only the selected subgraph with new identities and exact internal pin connections", () => {
  const p = createSampleProject();
  const clip = copySelection(p, { nodes: ["resistor-1", "led-1"], edges: [] });
  expect(clip.components).toHaveLength(2);
  expect(clip.wires).toHaveLength(1);
  let n = 0;
  const pasted = pasteSelection(p, clip, { x: 40, y: 60 }, () => `copy-${++n}`);
  expect(pasted.project.components).toHaveLength(6);
  expect(pasted.project.wires).toHaveLength(6);
  const [r, l] = pasted.project.components.slice(-2);
  expect(r.position).toEqual({ x: 560, y: 140 });
  expect(pasted.project.wires.at(-1)?.from).toEqual({
    componentId: r.id,
    pinId: "2",
  });
  expect(pasted.project.wires.at(-1)?.to).toEqual({
    componentId: l.id,
    pinId: "A",
  });
  expect(parseProject(JSON.stringify(pasted.project))).toEqual(pasted.project);
  expect(p.components).toHaveLength(4);
});
it("group deletion removes every incident wire, supports wire-only selection and select-all", () => {
  const p = createSampleProject();
  const reduced = deleteSelection(p, {
    nodes: ["uno-1", "resistor-1"],
    edges: [],
  });
  expect(reduced.components.map((c) => c.id)).toEqual(["led-1", "switch-1"]);
  expect(reduced.wires).toEqual([]);
  expect(
    deleteSelection(p, { nodes: [], edges: [p.wires[0].id] }).wires,
  ).toHaveLength(4);
  expect(deleteSelection(p, selectAll(p))).toEqual({
    ...p,
    components: [],
    wires: [],
  });
});
it("moves a group atomically without mutating wire topology and rejects out-of-bounds translations", () => {
  const p = createSampleProject();
  const moved = moveComponents(p, {
    "resistor-1": { x: 540, y: 100 },
    "led-1": { x: 800, y: 100 },
  });
  expect(moved.wires).toBe(p.wires);
  expect(moved.components[0]).toBe(p.components[0]);
  expect(moved.components[1].position).toEqual({ x: 540, y: 100 });
  expect(() => moveComponents(p, { "led-1": { x: Infinity, y: 0 } })).toThrow();
  const clip = copySelection(p, selectAll(p));
  expect(() => pasteSelection(p, clip, { x: 100001, y: 0 })).toThrow();
  expect(moveComponents(p, {})).toBe(p);
});
it("creates a validated truly blank circuit", () => {
  expect(createBlankProject()).toEqual({
    schemaVersion: "1.3.0",
    name: "Untitled circuit",
    components: [],
    wires: [],
  });
});
