import { createComponent } from "./catalog";
import { connect } from "./editing";
import type { CircuitProject, ComponentKind } from "./types";
/** @brief Wired Uno example for all five functional devices and a powered ideal H-bridge. */
export function createComponentsExample(): CircuitProject {
  const parts: [string, ComponentKind, number, number][] = [
    ["uno", "uno", 40, 140],
    ["rtc", "ds3231", 440, 20],
    ["mux", "mux4067", 440, 320],
    ["relay", "relay", 760, 20],
    ["driver", "h-bridge", 760, 320],
    ["motor", "dc-motor", 1080, 320],
    ["rgb", "ws2812", 1080, 20],
  ];
  let p: CircuitProject = {
    schemaVersion: "1.2.0",
    name: "Uno component laboratory",
    components: parts.map(([id, kind, x, y]) => ({
      ...createComponent(kind, { x, y }),
      id,
    })),
    wires: [],
  };
  const wire = (a: string, ap: string, b: string, bp: string) => {
    p = connect(
      p,
      { componentId: a, pinId: ap },
      { componentId: b, pinId: bp },
    );
  };
  for (const id of ["rtc", "mux", "relay", "driver", "rgb"]) {
    wire("uno", "5V", id, id === "rgb" ? "VDD" : "VCC");
    wire("uno", "GND", id, "GND");
  }
  wire("uno", "A4", "rtc", "SDA");
  wire("uno", "A5", "rtc", "SCL");
  for (const [pin, target] of [
    ["D8", "S0"],
    ["D9", "S1"],
    ["D10", "S2"],
    ["D12", "S3"],
    ["GND", "EN"],
    ["A0", "COM"],
    ["3V3", "C0"],
    ["GND", "C1"],
  ])
    wire("uno", pin, "mux", target);
  for (const [pin, target] of [
    ["D4", "IN1"],
    ["D5", "IN2"],
    ["D6", "EN"],
    ["5V", "VM"],
  ])
    wire("uno", pin, "driver", target);
  wire("driver", "OUT1", "motor", "POS");
  wire("driver", "OUT2", "motor", "NEG");
  wire("uno", "D7", "relay", "IN");
  wire("uno", "GND", "relay", "COM");
  wire("relay", "NO", "uno", "D2");
  wire("uno", "D3", "rgb", "DIN");
  return p;
}
