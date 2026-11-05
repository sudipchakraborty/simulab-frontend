import { catalog } from "./catalog";
import type { CircuitProject, Endpoint } from "./types";
/** @brief Unambiguous endpoint key; component and pin identity define connectivity. */
export const endpointKey = (e: Endpoint): string =>
  JSON.stringify([e.componentId, e.pinId]);
export function hasEndpoint(project: CircuitProject, e: Endpoint): boolean {
  const c = project.components.find((c) => c.id === e.componentId);
  return !!c && catalog[c.kind].pins.some((p) => p.id === e.pinId);
}
/** @brief Connected components of the explicit electrical graph, including isolated pins. */
export function buildNets(
  project: CircuitProject,
): { id: string; endpoints: Endpoint[] }[] {
  const endpoints = new Map<string, Endpoint>();
  const adjacency = new Map<string, Set<string>>();
  for (const c of project.components)
    for (const p of catalog[c.kind].pins) {
      const endpoint = { componentId: c.id, pinId: p.id };
      const k = endpointKey(endpoint);
      endpoints.set(k, endpoint);
      adjacency.set(k, new Set());
    }
  for (const w of project.wires) {
    const a = endpointKey(w.from),
      b = endpointKey(w.to);
    if (adjacency.has(a) && adjacency.has(b)) {
      adjacency.get(a)!.add(b);
      adjacency.get(b)!.add(a);
    }
  }
  const seen = new Set<string>();
  const nets: { id: string; endpoints: Endpoint[] }[] = [];
  for (const start of [...endpoints.keys()].sort()) {
    if (seen.has(start)) continue;
    const stack = [start];
    const members: Endpoint[] = [];
    seen.add(start);
    while (stack.length) {
      const k = stack.pop()!;
      members.push(endpoints.get(k)!);
      for (const next of adjacency.get(k)!)
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
    }
    members.sort((a, b) => endpointKey(a).localeCompare(endpointKey(b)));
    nets.push({ id: `net-${nets.length + 1}`, endpoints: members });
  }
  return nets;
}
/** @brief Structural ERC only; does not calculate current, voltage, or physical safety. */
export function validateCircuit(
  project: CircuitProject,
): { severity: "error" | "warning"; message: string }[] {
  const issues: { severity: "error" | "warning"; message: string }[] = [];
  for (const w of project.wires)
    if (!hasEndpoint(project, w.from) || !hasEndpoint(project, w.to))
      issues.push({
        severity: "error",
        message: `Wire ${w.id} has an unknown pin.`,
      });
  for (const net of buildNets(project)) {
    if (net.endpoints.length === 1) {
      const e = net.endpoints[0];
      const c = project.components.find((c) => c.id === e.componentId)!;
      if (c.kind !== "uno")
        issues.push({
          severity: "warning",
          message: `${c.label}.${e.pinId} is unconnected.`,
        });
    }
    const types = net.endpoints.map((e) => {
      const c = project.components.find((c) => c.id === e.componentId)!;
      return catalog[c.kind].pins.find((p) => p.id === e.pinId)!.electricalType;
    });
    if (types.includes("power") && types.includes("ground"))
      issues.push({
        severity: "error",
        message: `${net.id}: direct power-to-ground short.`,
      });
    const rails = net.endpoints.filter((e) => ["5V", "3V3"].includes(e.pinId));
    if (new Set(rails.map((e) => e.pinId)).size > 1)
      issues.push({
        severity: "error",
        message: `${net.id}: incompatible power rails connected.`,
      });
  }
  return issues;
}
