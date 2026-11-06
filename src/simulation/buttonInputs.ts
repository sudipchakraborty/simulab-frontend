import { ydBoard } from "../boards/yd-esp32-s3";
import { buildNets } from "../circuit/netlist";
import type { CircuitProject } from "../circuit/types";
/** @brief Ideal pull-up button inputs; only nets explicitly wired to switch contacts are driven. */
export function buttonInputs(project: CircuitProject): Record<string, boolean> {
  const board = project.components.find((c) => c.kind === "yd-esp32-s3");
  if (!board) return {};
  const switches = project.components.filter((c) => c.kind === "switch");
  const open = buildNets(project);
  const closed = buildNets({
    ...project,
    wires: [
      ...project.wires,
      ...switches
        .filter((c) => c.properties.pressed === true)
        .map((c) => ({
          id: `contact-${c.id}`,
          from: { componentId: c.id, pinId: "1" },
          to: { componentId: c.id, pinId: "2" },
          color: "#000000",
          label: "",
        })),
    ],
  });
  const result: Record<string, boolean> = {};
  for (const pin of ydBoard.pins) {
    if (pin.gpio === null || [35, 36, 37].includes(pin.gpio)) continue;
    const wired = open.find((n) =>
      n.endpoints.some((e) => e.componentId === board.id && e.pinId === pin.id),
    );
    if (
      !wired?.endpoints.some((e) =>
        switches.some((c) => c.id === e.componentId),
      )
    )
      continue;
    const net = closed.find((n) =>
      n.endpoints.some((e) => e.componentId === board.id && e.pinId === pin.id),
    );
    const low = net?.endpoints.some(
      (e) =>
        e.componentId === board.id &&
        ydBoard.pins.find((p) => p.id === e.pinId)?.electricalType === "ground",
    );
    result[`GPIO${pin.gpio}`] = !low;
  }
  return result;
}
