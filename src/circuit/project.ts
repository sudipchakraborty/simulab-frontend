import { catalog, createComponent } from "./catalog";
import { connect } from "./editing";
import { endpointKey, hasEndpoint } from "./netlist";
import type {
  CircuitComponent,
  CircuitProject,
  ComponentKind,
  Endpoint,
  Wire,
} from "./types";

const fail = (message: string): never => {
  throw new Error(`Invalid circuit: ${message}`);
};
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : fail("expected an object.");
const text = (v: unknown, max = 200): string =>
  typeof v === "string" && v.length <= max ? v : fail("invalid text field.");
const id = (v: unknown): string => {
  const s = text(v, 100);
  return s.length && /^[\w.-]+$/.test(s) ? s : fail("invalid identifier.");
};
const coordinate = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 100000
    ? v
    : fail("coordinate out of range.");
const endpoint = (v: unknown): Endpoint => {
  const e = object(v);
  return { componentId: id(e.componentId), pinId: id(e.pinId) };
};

/** @brief Parse untrusted project JSON with bounded size and referential integrity checks.
 * @throws Error for unsupported schema, malformed data, or unknown endpoints.
 */
export function parseProject(json: string): CircuitProject {
  if (json.length > 2_000_000) fail("file exceeds 2 MB character limit.");
  const root = object(JSON.parse(json));
  if (root.schemaVersion !== "1.0.0" && root.schemaVersion !== "1.1.0")
    fail("unsupported schema version; expected 1.0.0 or 1.1.0.");
  if (
    !Array.isArray(root.components) ||
    root.components.length > 1000 ||
    !Array.isArray(root.wires) ||
    root.wires.length > 5000
  )
    fail("component/wire limits exceeded or invalid arrays.");
  const ids = new Set<string>();
  const components: CircuitComponent[] = (root.components as unknown[]).map(
    (raw) => {
      const c = object(raw);
      const componentId = id(c.id);
      if (ids.has(componentId)) fail("duplicate component ID.");
      ids.add(componentId);
      const kind = text(c.kind) as ComponentKind;
      if (!Object.hasOwn(catalog, kind)) fail("unknown component type.");
      if (kind === "yd-esp32-s3" && root.schemaVersion !== "1.1.0")
        fail("YD board requires circuit schema 1.1.0.");
      const position = object(c.position);
      const props = object(c.properties);
      if (Object.keys(props).length > 50) fail("too many properties.");
      const properties: CircuitComponent["properties"] = {};
      for (const [key, value] of Object.entries(props)) {
        if (
          key.length > 100 ||
          ["__proto__", "prototype", "constructor"].includes(key)
        )
          fail("invalid property name.");
        if (typeof value === "string") properties[key] = text(value, 1000);
        else if (typeof value === "boolean") properties[key] = value;
        else if (
          typeof value === "number" &&
          Number.isFinite(value) &&
          Math.abs(value) <= 1e12
        )
          properties[key] = value;
        else fail("invalid property value.");
      }
      if (
        typeof c.rotation !== "number" ||
        ![0, 90, 180, 270].includes(c.rotation)
      )
        fail("rotation must be 0, 90, 180, or 270.");
      return {
        id: componentId,
        kind,
        label: text(c.label),
        position: { x: coordinate(position.x), y: coordinate(position.y) },
        rotation: c.rotation as number,
        properties,
      };
    },
  );
  const project: CircuitProject = {
    schemaVersion: root.schemaVersion as CircuitProject["schemaVersion"],
    name: text(root.name),
    components,
    wires: [],
  };
  const wireIds = new Set<string>();
  const pairs = new Set<string>();
  project.wires = (root.wires as unknown[]).map((raw) => {
    const w = object(raw);
    const wireId = id(w.id);
    if (wireIds.has(wireId)) fail("duplicate wire ID.");
    wireIds.add(wireId);
    const from = endpoint(w.from),
      to = endpoint(w.to);
    if (!hasEndpoint(project, from) || !hasEndpoint(project, to))
      fail("wire references an unknown pin.");
    const a = endpointKey(from),
      b = endpointKey(to);
    const pair = JSON.stringify([a, b].sort());
    if (a === b || pairs.has(pair)) fail("self wire or duplicate connection.");
    pairs.add(pair);
    const color = text(w.color, 9);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) fail("wire color must use #RRGGBB.");
    return { id: wireId, from, to, color, label: text(w.label) } satisfies Wire;
  });
  return project;
}
/** @brief Serialize only projects that satisfy the public versioned contract. */
export function serializeProject(project: CircuitProject): string {
  return JSON.stringify(parseProject(JSON.stringify(project)), null, 2);
}
/** @brief Starter drawing; connectivity is illustrative and no firmware executes. */
export function createSampleProject(): CircuitProject {
  const uno = {
    ...createComponent("uno", { x: 80, y: 100 }),
    id: "uno-1",
    label: "Arduino Uno",
  };
  const resistor = {
    ...createComponent("resistor", { x: 520, y: 80 }),
    id: "resistor-1",
    label: "R1",
  };
  const led = {
    ...createComponent("led", { x: 780, y: 80 }),
    id: "led-1",
    label: "LED1",
  };
  const button = {
    ...createComponent("switch", { x: 520, y: 320 }),
    id: "switch-1",
    label: "SW1",
  };
  let p: CircuitProject = {
    schemaVersion: "1.0.0",
    name: "Untitled circuit",
    components: [uno, resistor, led, button],
    wires: [],
  };
  for (const [a, ap, b, bp] of [
    ["uno-1", "D13", "resistor-1", "1"],
    ["resistor-1", "2", "led-1", "A"],
    ["led-1", "K", "uno-1", "GND"],
    ["switch-1", "1", "uno-1", "D2"],
    ["switch-1", "2", "uno-1", "GND"],
  ])
    p = connect(
      p,
      { componentId: a, pinId: ap },
      { componentId: b, pinId: bp },
    );
  return p;
}
