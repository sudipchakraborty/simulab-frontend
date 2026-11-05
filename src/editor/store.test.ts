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
