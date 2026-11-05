# Versioned contracts

## Circuit project 1.0.0

This frontend-owned, framework-independent JSON format has no cross-repository runtime dependency.

```typescript
type ComponentKind = 'uno' | 'led' | 'resistor' | 'switch' | 'junction';
interface Endpoint { componentId: string; pinId: string }
interface CircuitComponent {
  id: string;
  kind: ComponentKind;
  label: string;
  position: { x: number; y: number };
  rotation: number;
  properties: Record<string, string | number | boolean>;
}
interface Wire {
  id: string;
  from: Endpoint;
  to: Endpoint;
  color: string;
  label: string;
}
interface CircuitProject {
  schemaVersion: '1.0.0';
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
}
```

Implementation types and the runtime parser are authoritative. IDs and pin references are case-sensitive. Unknown versions must be rejected. Catalog pin identities are stable contract values. Coordinates do not define topology.

Imports validate shape, bounded finite numbers, component kinds, unique IDs, valid endpoints and resource limits. TypeScript casts are not input validation. Required-field, pin-identity or topology changes require a documented migration/version update.

## Domain surface

- `createComponent(kind, position)` — catalog-backed component.
- `createSampleProject()` — editor example, not firmware.
- `parseProject(json)` / `serializeProject(project)` — validated import and JSON output.
- `buildNets(project)` / `validateCircuit(project)` — endpoint groups and basic findings.
- `connect(project, from, to)` — explicit connection.
- `splitWire(project, wireId, position)` — junction insertion preserving connectivity.

## Future boundaries — not implemented

Before integrating repositories, agree on separate protocol versions and producer/consumer compatibility tests. Never directly import sibling source files.

Engine contracts must cover registry/capability discovery, boards, firmware formats, lifecycle (`start`, `pause`, `resume`, `stop`, `reset`), simulation clock/events, GPIO, UART, I2C, SPI, PWM, ADC, external devices, mechanical models and structured errors. Unsupported operations must fail explicitly. Different MCUs need independently verified capabilities.

Prefer a typed Worker message boundary with bounded state updates. Mechanical models consume engine timestamps/signals rather than independent animation timers.

Backend contracts must establish versioned REST routes, authorization/ownership, validation, compilation jobs/artifacts, limits, audit events and error envelopes. No backend route, WebSocket or cloud persistence is implemented here.

Circuit JSON is not firmware. Future firmware acceptance requires binary validation, sandboxing, timeouts and CPU/memory limits before user execution.

## Implemented engine boundary

Phase2 now implements a subset of the future engine interfaces through independent `@simulab/engine`0.2.0 and Worker protocol1.0.0. See SIMULATION_CONTRACT.md, PHASE2_PLAN.md and EMULATOR_COMPATIBILITY.md. Future registry/bus/mechanical interfaces remain design requirements rather than current capability claims.
