import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIde } from "./useIde";
import { createSampleProject } from "../circuit/project";
import type { SimulationController } from "../simulation/useSimulation";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("denies trial autosave shortcut and export", async () => {
  const store = vi.spyOn(Storage.prototype, "setItem");
  const remote = vi.fn();
  const project = createSampleProject();
  function H() {
    const ide = useIde(
      project,
      () => {},
      { target: "uno", status: "idle" } as SimulationController,
      {
        canSave: false,
        canEdit: true,
        canRun: true,
        canUpload: true,
        storageKey: "user.trial",
        saveProject: remote,
      },
    );
    return (
      <>
        {ide.toolbar}
        <p>{ide.log}</p>
      </>
    );
  }
  render(<H />);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500));
  });
  expect(store).not.toHaveBeenCalled();
  expect(
    screen.getByText("Save Project").getAttribute("disabled"),
  ).not.toBeNull();
  fireEvent.keyDown(window, { key: "s", ctrlKey: true });
  expect(remote).not.toHaveBeenCalled();
});
it("does not download when authoritative remote save fails", async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
  const project = createSampleProject();
  function H() {
    const ide = useIde(
      project,
      () => {},
      { target: "uno", status: "idle" } as SimulationController,
      {
        canSave: true,
        canEdit: true,
        canRun: true,
        canUpload: true,
        storageKey: "user.paid",
        saveProject: async () => {
          throw new Error("Server rejected save");
        },
      },
    );
    return (
      <>
        {ide.toolbar}
        <p>{ide.log}</p>
      </>
    );
  }
  render(<H />);
  fireEvent.click(screen.getByText("Save Project"));
  await screen.findByText("Error: Server rejected save");
  expect(click).not.toHaveBeenCalled();
});
it("downloads only after server acceptance and caches only under injected user key", async () => {
  const project = createSampleProject();
  let finish!: () => void;
  const remote = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:account-test"),
      revokeObjectURL: vi.fn(),
    }),
  );
  function H() {
    const ide = useIde(
      project,
      () => {},
      { target: "uno", status: "idle" } as SimulationController,
      {
        canSave: true,
        canEdit: true,
        canRun: true,
        canUpload: true,
        storageKey: "user.private",
        saveProject: remote,
      },
    );
    return (
      <>
        {ide.toolbar}
        <p>{ide.log}</p>
      </>
    );
  }
  render(<H />);
  fireEvent.click(screen.getByText("Save Project"));
  expect(click).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(click).toHaveBeenCalledTimes(1);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500));
  });
  expect(localStorage.getItem("user.private")).not.toBeNull();
  expect(localStorage.getItem("simulab.ide.v1")).toBeNull();
  vi.unstubAllGlobals();
});
