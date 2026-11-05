import { catalog } from "../circuit/catalog";
import { endpointKey } from "../circuit/netlist";
import type { CircuitProject, Endpoint } from "../circuit/types";

/** @brief A behavioral digital display result, never a voltage/current solution. */
export interface SignalProjection {
  ledStates: Record<string, boolean | null>;
  issues: string[];
}

/** @brief Project actual MCU output levels onto a circuit's explicit endpoints.
 * @param project Validated circuit document. Exactly one Uno is supported.
 * @param gpio Output-only digital snapshot, where null is undriven/high impedance.
 * @returns Per-LED states (true lit, false valid but unlit, null unknown) and model issues.
 * @details Wires, positive resistors and pressed switches propagate ideal digital
 * states; intersections and LED terminals never introduce implicit connections.
 * Resistance controls validity only: this model does not calculate electrical current.
 */
export function projectSignals(
  project: CircuitProject,
  gpio: Record<string, 0 | 1 | null>,
): SignalProjection {
  const result: SignalProjection = {
    ledStates: Object.fromEntries(
      project.components
        .filter((c) => c.kind === "led")
        .map((c) => [c.id, null]),
    ),
    issues: [],
  };
  const boards = project.components.filter((c) => c.kind === "uno");
  if (boards.length !== 1) {
    if (project.components.length)
      result.issues.push(
        "Exactly one Arduino Uno is supported for digital signal projection.",
      );
    return result;
  }
  const parent = new Map<string, string>();
  for (const component of project.components)
    for (const pin of catalog[component.kind].pins) {
      const key = endpointKey({ componentId: component.id, pinId: pin.id });
      parent.set(key, key);
    }
  const root = (key: string): string => {
    let current = key;
    while (parent.get(current) !== current) {
      current = parent.get(current)!;
    }
    let node = key;
    while (parent.get(node) !== current) {
      const next = parent.get(node)!;
      parent.set(node, current);
      node = next;
    }
    return current;
  };
  const union = (from: Endpoint, to: Endpoint) => {
    const a = endpointKey(from),
      b = endpointKey(to);
    if (!parent.has(a) || !parent.has(b)) {
      result.issues.push("A wire references an unknown endpoint.");
      return;
    }
    const ra = root(a),
      rb = root(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const wire of project.wires) union(wire.from, wire.to);
  for (const component of project.components) {
    if (component.kind === "resistor") {
      const resistance =
        component.properties.resistanceOhms ??
        catalog.resistor.defaultProperties.resistanceOhms;
      if (
        typeof resistance === "number" &&
        Number.isFinite(resistance) &&
        resistance > 0
      )
        union(
          { componentId: component.id, pinId: "1" },
          { componentId: component.id, pinId: "2" },
        );
      else
        result.issues.push(
          `Resistor ${component.label} needs a positive finite resistance; its digital path is open.`,
        );
    }
    if (component.kind === "switch" && component.properties.pressed === true)
      union(
        { componentId: component.id, pinId: "1" },
        { componentId: component.id, pinId: "2" },
      );
  }
  const drivers = new Map<string, Set<0 | 1>>();
  const board = boards[0];
  const drive = (pinId: string, value: 0 | 1) => {
    const key = endpointKey({ componentId: board.id, pinId });
    if (!parent.has(key)) return;
    const net = root(key);
    if (!drivers.has(net)) drivers.set(net, new Set());
    drivers.get(net)!.add(value);
  };
  drive("5V", 1);
  drive("GND", 0);
  for (const pin of catalog.uno.pins) {
    if (!/^(D(?:[0-9]|1[0-3])|A[0-5])$/.test(pin.id)) continue;
    const level = gpio[pin.id];
    if (level === 0 || level === 1) drive(pin.id, level);
  }
  const conflict = new Set<string>();
  for (const [net, levels] of drivers)
    if (levels.size > 1) {
      conflict.add(net);
      result.issues.push(
        "Digital driver conflict: HIGH and LOW sources share a conductive path. No analog/current solution is available.",
      );
    }
  const level = (componentId: string, pinId: string): 0 | 1 | null => {
    const net = root(endpointKey({ componentId, pinId }));
    if (conflict.has(net)) return null;
    const levels = drivers.get(net);
    return levels?.size === 1 ? [...levels][0] : null;
  };
  for (const component of project.components)
    if (component.kind === "led") {
      const anode = level(component.id, "A"),
        cathode = level(component.id, "K");
      result.ledStates[component.id] =
        anode === null || cathode === null
          ? null
          : anode === 1 && cathode === 0;
    }
  return result;
}
