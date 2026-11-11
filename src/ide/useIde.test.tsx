import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useIde } from "./useIde";
import { createSampleProject } from "../circuit/project";
import type { SimulationController } from "../simulation/useSimulation";
it("discards a build when source changes while compilation is in flight", async () => {
  localStorage.clear();
  let resolveBuild!: (v: unknown) => void;
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url) =>
      String(url).endsWith("/status")
        ? new Response(JSON.stringify({ available: true }))
        : await new Promise<Response>((r) => {
            resolveBuild = (v) => r(new Response(JSON.stringify(v)));
          }),
    );
  const project = createSampleProject(),
    commit = () => {};
  function Harness() {
    const ide = useIde(
      project,
      commit,
      {
        target: "uno",
        status: "idle",
        command: vi.fn(),
      } as unknown as SimulationController,
      {
        canSave: true,
        canEdit: true,
        canRun: true,
        canUpload: true,
        storageKey: "test.ide",
        saveProject: async () => ({}),
      },
    );
    return (
      <>
        {ide.toolbar}
        {ide.pairing}
        <button
          onClick={() =>
            ide.editFiles([{ name: "sketch.ino", content: "changed" }])
          }
        >
          Change source
        </button>
        <output data-testid="result">{ide.result?.job ?? "none"}</output>
      </>
    );
  }
  try {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Companion token"), {
      target: { value: "test-token" },
    });
    fireEvent.click(screen.getByText("Connect companion"));
    await waitFor(() => expect(screen.getByText("Build")).not.toBeDisabled());
    fireEvent.click(screen.getByText("Build"));
    await waitFor(() => expect(resolveBuild).toBeDefined());
    fireEvent.click(screen.getByText("Change source"));
    await act(async () =>
      resolveBuild({
        job: "obsolete",
        success: true,
        log: "compiled old source",
        diagnostics: [],
        artifacts: [],
        board: "uno",
      }),
    );
    expect(screen.getByTestId("result")).toHaveTextContent("none");
  } finally {
    fetcher.mockRestore();
  }
});
