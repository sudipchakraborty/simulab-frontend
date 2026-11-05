import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Inspector } from "./Inspector";
import { createSampleProject, serializeProject } from "../circuit/project";
afterEach(cleanup);
describe("Inspector contract validation", () => {
  it("rejects out-of-range numbers and keeps the document exportable", () => {
    const project = createSampleProject();
    const commit = vi.fn();
    const onNotice = vi.fn();
    render(
      <Inspector
        project={project}
        selected="resistor-1"
        commit={commit}
        onNotice={onNotice}
        onDelete={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Property resistanceOhms"), {
      target: { value: "1e20" },
    });
    expect(commit).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      expect.stringContaining("finite number"),
    );
    expect(() => serializeProject(project)).not.toThrow();
  });
  it("updates a valid property through the host callback", () => {
    const project = createSampleProject();
    const commit = vi.fn();
    render(
      <Inspector
        project={project}
        selected="resistor-1"
        commit={commit}
        onNotice={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Property resistanceOhms"), {
      target: { value: "330" },
    });
    const updated = commit.mock.calls[0][0];
    expect(
      updated.components.find((c: any) => c.id === "resistor-1").properties
        .resistanceOhms,
    ).toBe(330);
    expect(() => serializeProject(updated)).not.toThrow();
  });
  it("discloses nonzero rotation and bounds reference fields", () => {
    const project = createSampleProject();
    project.components[0].rotation = 90;
    render(
      <Inspector
        project={project}
        selected="uno-1"
        commit={() => {}}
        onNotice={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText(/visual rotation unavailable/)).toBeTruthy();
    expect(
      screen.getByLabelText("Component reference").getAttribute("maxlength"),
    ).toBe("200");
  });
});
