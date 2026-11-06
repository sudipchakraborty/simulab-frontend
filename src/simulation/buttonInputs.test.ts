import { describe, it, expect } from "vitest";
import { buttonInputs } from "./buttonInputs";
import { createComponent } from "../circuit/catalog";
import type { CircuitProject } from "../circuit/types";
it("a wired contact supplies actual GPIO5 input while leaving unrelated GPIOs untouched", () => {
  const board = { ...createComponent("yd-esp32-s3", { x: 0, y: 0 }), id: "yd" },
    button = { ...createComponent("switch", { x: 0, y: 0 }), id: "button" };
  const p: CircuitProject = {
    schemaVersion: "1.1.0",
    name: "input",
    components: [board, button],
    wires: [
      {
        id: "a",
        from: { componentId: "yd", pinId: "P1.5" },
        to: { componentId: "button", pinId: "1" },
        color: "#000000",
        label: "",
      },
      {
        id: "b",
        from: { componentId: "button", pinId: "2" },
        to: { componentId: "yd", pinId: "P1.22" },
        color: "#000000",
        label: "",
      },
    ],
  };
  expect(buttonInputs(p)).toEqual({ GPIO5: true });
  button.properties.pressed = true;
  expect(buttonInputs(p)).toEqual({ GPIO5: false });
  button.properties.pressed = false;
  expect(buttonInputs(p)).toEqual({ GPIO5: true });
});
