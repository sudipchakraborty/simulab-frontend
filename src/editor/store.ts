import { create } from "zustand";
import type { CircuitProject } from "../circuit/types";
import { createSampleProject } from "../circuit/project";
interface EditorStore {
  project: CircuitProject;
  past: CircuitProject[];
  future: CircuitProject[];
  commit: (p: CircuitProject) => void;
  reset: (project: CircuitProject) => void;
  undo: () => void;
  redo: () => void;
}
/** @brief Parameter-free editor store. Only serializable circuit documents enter history. */
export const useEditor = create<EditorStore>((set) => ({
  project: createSampleProject(),
  past: [],
  future: [],
  commit: (project) =>
    set((s) => ({
      project,
      past: [...s.past.slice(-99), s.project],
      future: [],
    })),
  /** @brief Replace the document and clear history only after host confirmation. */
  reset: (project) => set({ project, past: [], future: [] }),
  undo: () =>
    set((s) =>
      s.past.length
        ? {
            project: s.past.at(-1)!,
            past: s.past.slice(0, -1),
            future: [s.project, ...s.future],
          }
        : s,
    ),
  redo: () =>
    set((s) =>
      s.future.length
        ? {
            project: s.future[0],
            past: [...s.past, s.project],
            future: s.future.slice(1),
          }
        : s,
    ),
}));
