import { createComponent } from "./catalog";
import { endpointKey, hasEndpoint } from "./netlist";
import type { CircuitProject, Endpoint, Point, Wire } from "./types";
/** @brief Add a wire atomically without modifying the caller's project. */
export function connect(
  project: CircuitProject,
  from: Endpoint,
  to: Endpoint,
): CircuitProject {
  if (!hasEndpoint(project, from) || !hasEndpoint(project, to))
    throw new Error("Connect to a defined component pin.");
  const a = endpointKey(from),
    b = endpointKey(to);
  if (a === b) throw new Error("A wire needs two distinct endpoints.");
  if (
    project.wires.some(
      (w) =>
        (endpointKey(w.from) === a && endpointKey(w.to) === b) ||
        (endpointKey(w.from) === b && endpointKey(w.to) === a),
    )
  )
    throw new Error("These pins are already connected by a wire.");
  const wire: Wire = {
    id: crypto.randomUUID(),
    from: { ...from },
    to: { ...to },
    color: "#5bbfa8",
    label: "",
  };
  return { ...project, wires: [...project.wires, wire] };
}
/** @brief Insert an explicit junction into one selected wire; other crossings remain untouched. */
export function splitWire(
  project: CircuitProject,
  wireId: string,
  position: Point,
): CircuitProject {
  const wire = project.wires.find((w) => w.id === wireId);
  if (!wire) throw new Error("The selected wire no longer exists.");
  if (
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    Math.abs(position.x) > 100000 ||
    Math.abs(position.y) > 100000
  )
    throw new Error("Invalid junction position.");
  const junction = createComponent("junction", position);
  const endpoint = { componentId: junction.id, pinId: "J" };
  return {
    ...project,
    components: [...project.components, junction],
    wires: [
      ...project.wires.filter((w) => w.id !== wireId),
      { ...wire, to: endpoint },
      { ...wire, id: crypto.randomUUID(), from: endpoint },
    ],
  };
}
