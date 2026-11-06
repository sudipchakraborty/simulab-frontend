# Architecture

## Repository and modules

This independent React application communicates with no backend or engine in Phase 1. Adjacent directories must not become implicit source dependencies.

| Location | Responsibility |
| --- | --- |
| `src/circuit/types.ts` | Versioned project, component, endpoint and wire data |
| `src/circuit/catalog.ts` | Reusable component definitions and stable pin identities |
| `src/circuit/project.ts` | Sample project, validated JSON import and serialization |
| `src/circuit/netlist.ts` | Electrical endpoint connectivity and basic checks |
| `src/circuit/editing.ts` | Pure connection and junction insertion operations |
| `src/editor` | XYFlow adapter, presentation, editor interaction and history |
| Application entry/styles | Composition and responsive presentation |
| `tests` | Browser acceptance checks |

Circuit modules stay independent of React, XYFlow, Zustand and networking. Initialize reusable modules with explicit parameters. Document public functions with Doxygen-compatible comments.

## Electrical model

Every wire references two `{ componentId, pinId }` endpoints. Net construction unions endpoints joined by wires. Shared endpoints connect; drawing intersections do not. Orthogonal drawing routes derive separately from endpoint positions and may change without changing the netlist.

A junction is a component with pin `J`. Splitting a wire replaces it with two wires through this pin. Branches explicitly reference the same pin. Catalog terminals do not short components internally and do not establish analog behavior.

The schema reserves a `rotation` field. The current visual adapter does not apply nonzero rotation values; a future rotation feature must update both component art and pin locations while preserving pin IDs.

## State and persistence

The project is canonical electrical state; selection and drawing geometry do not define topology. Editor history records circuit mutations. Versioned JSON stores stable identifiers, component properties and placement. Imports validate shapes, versions, bounds, IDs, kinds and pin references before replacing the current project. Failed imports must preserve the active project.

## Future execution and security

Actual simulation belongs behind a versioned engine adapter outside the React rendering thread, preferably in a Worker. Timestamped events carry device state. No adapter may fabricate firmware execution on failure. See [docs/CONTRACTS.md](docs/CONTRACTS.md).

Phase 1 accepts circuit data rather than executable firmware. Input validation and size limits protect imports; labels must never execute as HTML/code. Future compilation and cloud emulation require isolated workers, authorization, CPU/memory limits, timeouts, artifact validation, audit logs, dependency scanning and license review. Those controls are future requirements, not services delivered by this editor.

## Phase 2 implementation - AVR Worker boundary

The frontend now consumes independently built `@simulab/engine`0.2.0 from `vendor/simulab-engine-0.2.0.tgz`. Engine contract1.0.0 and circuit schema1.0.0 are independent. See docs/SIMULATION_CONTRACT.md and docs/PHASE2_PLAN.md; no runtime sibling source import exists.

- `src/simulation/protocol.ts`: versioned bounded command/reply types.
- `avr.worker.ts`: scheduling/lifecycle of the actual AVR runtime, bounded160000-cycle slices, auto-pause at60 simulated seconds. CPU time comes from cycles rather than animation timers.
- `useSimulation.ts`: Worker ownership, stale-session protection, heartbeat timeout and bounded serial history. Any circuit document edit terminates and unloads the session.
- `projection.ts`: framework-independent digital net traversal through explicit wires, positive resistors and closed switches; MCU outputs/rails produce behavioral LED states. Floating/conflicting sources yield unknown and visible diagnostics.
- `SimulationControls.tsx`: parameter-driven firmware upload/sample and lifecycle controls; React never executes MCU instructions.
- `ComponentNode.tsx`: renders LED state supplied by projection. Measured XYFlow dimensions are retained in editor-only state across signal updates; they are not electrical topology or saved circuit data.

Compiled firmware and integrity/provenance metadata are browser-local assets. Compiler, backend and Node process execution are absent from browser runtime. No synthetic fallback is used on load/execution errors. Serial UART is logical TX bytes. Input adapter tests exist in the engine but editor button-to-MCU input integration remains future work.

AVR8js is an existing JavaScript emulator, so this adapter is TypeScript rather than Rust/WASM. Future shared Rust components can implement the same published protocol without introducing React/Node dependencies into the engine.

Component net/LED evaluation is executed inside the Worker together with MCU snapshots. React receives already-projected LED states and diagnostics. This keeps both MCU and component simulation off the rendering thread.

## YD/S3 architecture extension

Circuit schema1.1.0 introduces stable physical YD header IDs and board-declared internal rails while retaining1.0.0 Uno documents. src/boards validates manufacturer-family metadata separately from engine capabilities; src/editor/YdBoardNode renders SVG and rotation-aware attachment geometry. Exact hardware details left unverified remain explicit fields, not invented constants.

Engine0.3.0 exports its source-compatible UnoRuntime plus a generic facade and dedicated ./esp32 adapter. The frontend chooses a target-specific Worker through simulation/targets. The AVR Worker retains its instruction execution path; the S3 Worker injects pinned officialJS/WASM bindings and loads real merged flash. Both return common timestamped snapshots and run net/component projection off the rendering thread. UART/contact events use protocol1.1.0. User code is never parsed to fabricate CPU signals.

The S3 reference is genuine MicroPython/ESP-IDF firmware. Sample UART programs execute inside its guest VM on the Xtensa emulator. buttonInputs derives ideal contact levels from explicit nets and runtime-only contact state. GPIO4 LED state follows actual output-enable/level snapshots. RGB and externalI2C are separate missing interfaces, not implied by GPIO success. Reset reloads originalflash, and circuit edits terminate execution.
