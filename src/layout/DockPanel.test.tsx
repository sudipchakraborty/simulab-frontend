import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DockPanel } from "./DockPanel";
import { useState } from "react";
afterEach(cleanup);
it("keyboard resize is directional and hide/show retains child state", () => {
  const resize = vi.fn(),
    hide = vi.fn();
  function Child() {
    const [value, set] = useState("draft");
    return (
      <input
        aria-label="Retained source"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    );
  }
  const props = {
    id: "right" as const,
    title: "Inspector",
    size: 245,
    onResize: resize,
    onHide: hide,
    viewportWidth: 1440,
    viewportHeight: 1000,
    minSize: 180,
    maxSize: 520,
  };
  const view = render(
    <DockPanel {...props} visible>
      <Child />
    </DockPanel>,
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "unsaved source" },
  });
  fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
  expect(resize).toHaveBeenCalledWith(-16);
  fireEvent.keyDown(screen.getByRole("separator"), {
    key: "ArrowRight",
    shiftKey: true,
  });
  expect(resize).toHaveBeenCalledWith(48);
  fireEvent.click(screen.getByRole("button", { name: "Hide Inspector" }));
  expect(hide).toHaveBeenCalled();
  view.rerender(
    <DockPanel {...props} visible={false}>
      <Child />
    </DockPanel>,
  );
  expect(screen.queryByRole("textbox")).toBeNull();
  view.rerender(
    <DockPanel {...props} visible>
      <Child />
    </DockPanel>,
  );
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
    "unsaved source",
  );
});
