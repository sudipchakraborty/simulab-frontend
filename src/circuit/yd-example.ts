import { createComponent } from "./catalog";
import { connect } from "./editing";
import type { CircuitProject } from "./types";
/** @brief Reusable single-board reference drawing. Firmware is separately loaded and never implied by this example. */
export function createYdExample(): CircuitProject {
  const board = {
      ...createComponent("yd-esp32-s3", { x: 200, y: 0 }),
      id: "yd-1",
      label: "YD1",
    },
    led = {
      ...createComponent("led", { x: -170, y: 150 }),
      id: "led-1",
      label: "LED1",
    },
    resistor = {
      ...createComponent("resistor", { x: -410, y: 150 }),
      id: "resistor-1",
      label: "R1",
    },
    button = {
      ...createComponent("switch", { x: -200, y: 420 }),
      id: "switch-1",
      label: "SW1",
    };
  let p: CircuitProject = {
    schemaVersion: "1.1.0",
    name: "YD ESP32-S3 GPIO4 lab",
    components: [board, led, resistor, button],
    wires: [],
  };
  for (const [a, ap, b, bp] of [
    ["yd-1", "P1.4", "resistor-1", "1"],
    ["resistor-1", "2", "led-1", "A"],
    ["led-1", "K", "yd-1", "P1.22"],
    ["yd-1", "P1.5", "switch-1", "1"],
    ["switch-1", "2", "yd-1", "P2.22"],
  ])
    p = connect(
      p,
      { componentId: a, pinId: ap },
      { componentId: b, pinId: bp },
    );
  return p;
}
