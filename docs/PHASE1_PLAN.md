# Phase 1 implementation plan

Date: 2026-11-05. Scope: the independent `simulab-frontend` repository only.

## Existing state

The repository initially contained only a README and Git metadata. There were no application dependencies, build configuration, tests, or existing circuit data to migrate. The adjacent backend and engine repositories are independent and are outside this implementation.

## Design decisions

Use React, strict TypeScript, Vite, XYFlow, and Zustand. XYFlow owns view interaction; framework-independent circuit modules own electrical identity, input validation, serialization, and connectivity. SVG pin handles connect by stable component and pin identifiers. Coordinates position a drawing and never determine electrical connectivity.

The editor approach is preferable to a custom canvas implementation for Phase 1 because it provides established drag, zoom, selection, and handle interaction while preserving a separate domain model. It does not provide SPICE analysis or firmware execution. A generic graph without explicit pin identities would not meet the circuit requirements.

## File ownership

| Owner | Files | Responsibility |
| --- | --- | --- |
| Main implementer | Project configuration, `src/editor`, application entry, styles, browser tests | Editor interaction, history, presentation, integration, verification |
| Circuit specialist | `src/circuit/**` | Component definitions, project model, serialization, explicit netlist, connectivity checks, unit tests |
| Documentation specialist | Root Markdown documents and `docs/**` in this repository | Setup, architecture, contracts, limitations, plan, progress |

All shared interface changes must be communicated before integration. No backend or engine runtime dependency is introduced.

## Models and interfaces

- `CircuitProject`: schema version `1.0.0`, project name, components, and wires.
- `CircuitComponent`: stable ID, kind, label, position, rotation, and configurable property values.
- `Endpoint`: `{ componentId, pinId }`, referencing a real catalog pin.
- `Wire`: stable ID, `from` and `to` endpoints, color, and label.
- Component kinds: Uno, LED, resistor, switch, and explicit junction.
- Netlist: connected sets of endpoints calculated from wires; coordinate intersections are ignored.
- Junction insertion splits a chosen wire into two wires referencing one newly created junction.

See [CONTRACTS.md](CONTRACTS.md) for version and future integration boundaries.

## Implementation sequence

1. Establish package scripts, strict TypeScript, Vite, Vitest, React Testing Library, and Playwright configuration.
2. Write domain tests for shared endpoints, independent crossings, invalid imports, split-wire junctions, and round-trip persistence; implement domain modules.
3. Build the editor shell, palette, sample circuit, board/pin rendering, and grid placement.
4. Connect handles to domain endpoints; implement explicit junctions, removal, undo/redo, and property inspection.
5. Add JSON export/import and visible connectivity diagnostics. Reject invalid input without replacing the current project.
6. Run unit tests, production build, and browser acceptance checks; fix reproducible failures and review integration.
7. Update documentation and progress with observed results, retaining any failed or unverified checks as limitations.

## Acceptance criteria

- Production TypeScript/Vite build succeeds and the development server responds.
- Palette placement and component movement work and respect the placement grid.
- Connections terminate at individually identified pins, with clear interactive targets.
- Multiple wires can use a common pin or junction.
- Crossing wires remain separate unless explicit electrical endpoints connect them.
- Splitting a wire produces one connected net through an explicit junction.
- Export/import preserves identifiers and connectivity and rejects malformed/dangling references.
- Undo/redo restores meaningful circuit edits.
- Basic connectivity findings are visible without suggesting full electrical analysis.
- Tests exercise the domain invariants and actual browser wire/junction interactions.
- Firmware controls cannot pretend to execute code. Phase 1 is clearly identified as editor/demo functionality.

## Deferred work

MCU emulation, compilation, runtime device behavior, analog solving, mechanical models, authentication, cloud storage, subscriptions, Monaco code editing, and 3D visualization are deferred. Phase 2 begins with emulator/license/peripheral validation and compiled AVR firmware execution through a real emulator.
