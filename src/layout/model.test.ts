import { describe, it, expect } from "vitest";
import { defaultLayout, parseLayout, resizePanel } from "./model";
describe("workspace layout preferences", () => {
  it("recovers malformed preferences and clamps persisted sizes without trusting arbitrary fields", () => {
    expect(parseLayout("broken", 1440, 1000)).toEqual(
      defaultLayout(1440, 1000),
    );
    const value = parseLayout(
      JSON.stringify({
        version: 1,
        panels: {
          left: { visible: false, size: 999999 },
          right: { visible: "no", size: -1 },
          top: { visible: true, size: null },
        },
      }),
      1440,
      1000,
    );
    expect(value.panels.left.visible).toBe(false);
    expect(value.panels.left.size).toBeLessThanOrEqual(520);
    expect(value.panels.right.visible).toBe(true);
    expect(value.panels.right.size).toBeGreaterThan(100);
    expect(value.panels.top.size).toBe(
      defaultLayout(1440, 1000).panels.top.size,
    );
  });
  it("resizes all edges in the correct direction and preserves a minimum central workspace", () => {
    const state = defaultLayout(1000, 1000);
    expect(resizePanel(state, "left", 80, 1000, 1000).panels.left.size).toBe(
      state.panels.left.size + 80,
    );
    expect(resizePanel(state, "right", -80, 1000, 1000).panels.right.size).toBe(
      state.panels.right.size + 80,
    );
    expect(
      resizePanel(state, "bottom", -80, 1000, 1000).panels.bottom.size,
    ).toBe(state.panels.bottom.size + 80);
    expect(resizePanel(state, "top", 40, 1000, 1000).panels.top.size).toBe(
      state.panels.top.size + 40,
    );
    const next = resizePanel(state, "left", 100000, 1000, 1000);
    expect(next.panels.left.size + next.panels.right.size).toBeLessThanOrEqual(
      1000 - 320,
    );
  });
  it("starts narrow screens with recoverable side panels hidden", () => {
    const s = defaultLayout(390, 844);
    expect(s.panels.left.visible).toBe(false);
    expect(s.panels.right.visible).toBe(false);
    expect(s.panels.top.visible).toBe(true);
  });
});

it("resizes from the displayed width after the viewport shrinks", () => {
  let state = defaultLayout(1440, 1000);
  state = resizePanel(state, "left", 268, 1440, 1000);
  expect(state.panels.left.size).toBe(520);
  const next = resizePanel(state, "left", 180 - 435, 1000, 1000);
  expect(next.panels.left.size).toBe(180);
});
