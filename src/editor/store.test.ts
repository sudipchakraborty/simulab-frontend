import { describe, it, expect } from "vitest";
import { useEditor } from "./store";
describe("document history", () => {
  it("restores exact circuit connectivity through undo and redo", () => {
    const initial = useEditor.getState().project;
    const next = { ...initial, name: "Changed" };
    useEditor.getState().commit(next);
    expect(useEditor.getState().project.name).toBe("Changed");
    useEditor.getState().undo();
    expect(useEditor.getState().project).toEqual(initial);
    useEditor.getState().redo();
    expect(useEditor.getState().project).toEqual(next);
  });
});

it("starts a blank document with no previous undo/redo history", () => {
  const before = useEditor.getState().project;
  useEditor.getState().commit({ ...before, name: "old draft" });
  const blank = { ...before, components: [], wires: [] };
  useEditor.getState().reset(blank);
  expect(useEditor.getState().past).toEqual([]);
  expect(useEditor.getState().future).toEqual([]);
  useEditor.getState().undo();
  expect(useEditor.getState().project).toBe(blank);
});
