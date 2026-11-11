import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIde } from "./useIde";
import { ToolchainClient } from "./ToolchainClient";
import { createSampleProject } from "../circuit/project";
import type { SimulationController } from "../simulation/useSimulation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
it.each(["stop", "manual"])(
  "mock companion pending compile cancellation: %s",
  async (cancel) => {
    vi.spyOn(ToolchainClient.prototype, "request").mockResolvedValue({
      available: true,
    });
    let finish!: (value: any) => void;
    const compile = vi
      .spyOn(ToolchainClient.prototype, "compile")
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    const artifact = vi
      .spyOn(ToolchainClient.prototype, "artifact")
      .mockResolvedValue(new ArrayBuffer(1));
    const simulation = {
      target: "uno",
      status: "idle",
      command: vi.fn(),
      load: vi.fn(),
    } as unknown as SimulationController;
    const project = createSampleProject();
    const access = {
      canSave: false,
      canEdit: true,
      canRun: true,
      canUpload: true,
      storageKey: "run.test",
      saveProject: async () => ({}),
    };
    const { result, rerender } = renderHook(() =>
      useIde(project, vi.fn(), simulation, access),
    );
    const view = render(result.current.pairing);
    fireEvent.change(screen.getByLabelText("Companion token"), {
      target: { value: "mock-token" },
    });
    view.rerender(result.current.pairing);
    fireEvent.click(screen.getByText("Connect companion"));
    await waitFor(() => expect(result.current.paired).toBe(true));
    act(() =>
      result.current.editFiles([
        { name: "sketch.ino", content: "latest source" },
      ]),
    );
    act(() => result.current.setDocument((w) => ({ ...w, board: "nano" })));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.runDesign();
    });
    expect(compile).toHaveBeenCalledWith("uno", [
      { name: "sketch.ino", content: "latest source" },
    ]);
    const stopsBefore = vi.mocked(simulation.command).mock.calls.length;
    if (cancel === "stop") act(() => result.current.stopDesign());
    else {
      simulation.status = "loading";
      simulation.firmwareName = "sketch.hex";
      simulation.loadSession = 2;
      rerender();
      expect(simulation.command).toHaveBeenCalledTimes(stopsBefore);
    }
    await act(async () => {
      finish({
        job: "old",
        board: "uno",
        success: true,
        log: "ok",
        artifacts: ["sketch.hex"],
        diagnostics: [],
      });
      await pending;
    });
    expect(artifact).not.toHaveBeenCalled();
    expect(simulation.load).not.toHaveBeenCalled();
    act(() =>
      result.current.newProject({ ...project, components: [], wires: [] }),
    );
    expect(result.current.document.files[0].content).toBe(
      "void setup() {\n}\n\nvoid loop() {\n}\n",
    );
    expect(result.current.document.activeTab).toBe("hardware");
    expect(result.current.paired).toBe(true);
  },
);

it.each([
  "entitlement",
  "source",
  "board",
  "circuit",
  "stop",
  "new",
  "unmount",
  "success",
  "same-name-manual",
  "simultaneous-manual-source",
])("mock companion artifact race: %s", async (change) => {
  vi.spyOn(ToolchainClient.prototype, "request").mockResolvedValue({
    available: true,
  });
  vi.spyOn(ToolchainClient.prototype, "compile").mockResolvedValue({
    job: "current",
    board: "uno",
    success: true,
    log: "compiled",
    artifacts: ["sketch.hex"],
    diagnostics: [],
  });
  let deliver!: (value: ArrayBuffer) => void;
  const artifact = vi
    .spyOn(ToolchainClient.prototype, "artifact")
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        }),
    );
  const simulation = {
    target: "uno",
    status: "idle",
    command: vi.fn(),
    load: vi.fn(),
  } as unknown as SimulationController;
  const project = createSampleProject();
  const access = {
    canSave: false,
    canEdit: true,
    canRun: true,
    canUpload: false,
    storageKey: "artifact.test",
    saveProject: async () => ({}),
  };
  const { result, rerender, unmount } = renderHook(
    ({ access, project }) => useIde(project, vi.fn(), simulation, access),
    { initialProps: { access, project } },
  );
  const view = render(result.current.pairing);
  fireEvent.change(screen.getByLabelText("Companion token"), {
    target: { value: "mock-token" },
  });
  view.rerender(result.current.pairing);
  fireEvent.click(screen.getByText("Connect companion"));
  await waitFor(() => expect(result.current.paired).toBe(true));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.runDesign();
  });
  await waitFor(() => expect(artifact).toHaveBeenCalled());
  expect(simulation.load).not.toHaveBeenCalled();
  if (change === "entitlement")
    rerender({ access: { ...access, canRun: false }, project });
  if (change === "circuit")
    rerender({ access, project: { ...project, name: "changed circuit" } });
  if (change === "source")
    act(() =>
      result.current.editFiles([{ name: "sketch.ino", content: "changed" }]),
    );
  if (change === "board")
    act(() => result.current.setDocument((w) => ({ ...w, board: "nano" })));
  if (change === "stop") act(() => result.current.stopDesign());
  if (change === "new")
    act(() =>
      result.current.newProject({ ...project, components: [], wires: [] }),
    );
  if (change === "unmount") unmount();
  if (
    change === "same-name-manual" ||
    change === "simultaneous-manual-source"
  ) {
    simulation.status = "loading";
    simulation.firmwareName = "sketch.hex";
    simulation.loadSession = 2;
    const stopCount = vi.mocked(simulation.command).mock.calls.length;
    if (change === "simultaneous-manual-source")
      act(() =>
        result.current.setDocument((w) => ({
          ...w,
          files: [{ name: "sketch.ino", content: "changed together" }],
        })),
      );
    else rerender({ access, project });
    expect(simulation.command).toHaveBeenCalledTimes(stopCount);
  }
  await act(async () => {
    deliver(new TextEncoder().encode(":00000001FF").buffer);
    await pending;
  });
  if (change === "success")
    expect(simulation.load).toHaveBeenCalledWith(":00000001FF", "sketch.hex", {
      autoStart: true,
    });
  else expect(simulation.load).not.toHaveBeenCalled();
  if (change === "success") {
    simulation.status = "loading";
    simulation.firmwareName = "sketch.hex";
    simulation.loadSession = 2;
    rerender({ access, project });
    const stopsBeforeEdit = vi.mocked(simulation.command).mock.calls.length;
    act(() =>
      result.current.editFiles([
        { name: "sketch.ino", content: "edited after same-name manual load" },
      ]),
    );
    expect(simulation.command).toHaveBeenCalledTimes(stopsBeforeEdit);
  }
});

it("mock manually loaded reference keeps running during source and board edits", () => {
  const project = createSampleProject();
  const simulation = {
    target: "uno",
    status: "running",
    firmwareName: "reference.hex",
    command: vi.fn(),
  } as unknown as SimulationController;
  const access = {
    canSave: false,
    canEdit: true,
    canRun: true,
    canUpload: false,
    storageKey: "manual-reference.test",
    saveProject: async () => ({}),
  };
  const { result } = renderHook(() =>
    useIde(project, vi.fn(), simulation, access),
  );
  act(() =>
    result.current.editFiles([
      { name: "sketch.ino", content: "edited source" },
    ]),
  );
  expect(simulation.command).not.toHaveBeenCalled();
  const view = render(result.current.toolbar);
  fireEvent.change(screen.getByLabelText("Build board"), {
    target: { value: "nano" },
  });
  expect(simulation.command).not.toHaveBeenCalled();
  view.unmount();
});
