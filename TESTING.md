# Testing

## Commands

From the frontend directory in PowerShell:

```powershell
npm.cmd ci
npm.cmd run test
npm.cmd run build
npx.cmd playwright install chromium
npx.cmd playwright test
```

Vitest tests circuit logic; React Testing Library is available for UI checks. TypeScript/Vite build checks compilation. Playwright checks actual browser interactions. Browser configuration determines whether Vite starts automatically. Read `package.json` for exact scripts. A successful build alone does not prove editor usability.

## Regression requirements

| Case | Expected result |
| --- | --- |
| Palette placement and movement | Grid placement changes without changing pin identity |
| Connect two named handles | Wire records exactly those endpoints |
| Snap near a pin | Visible target matches the connected terminal |
| Multiple wires on one pin | Shared endpoints form one net |
| Crossing paths | Separate nets without a common endpoint |
| Split wire and add branch | One explicit `J` joins all branches |
| Move connected component | Wires follow; topology stays unchanged |
| Export/import | IDs, properties and connectivity round-trip |
| Malformed JSON / invalid endpoint | Clear rejection; active project survives |
| Undo/redo | Previous connectivity returns exactly |
| Delete connected component | No dangling references |
| Narrow viewport | Essential controls remain reachable |

## Observed status - 2026-11-05

- `npm.cmd run build`: passed strict TypeScript compilation and Vite production bundling.
- `npm.cmd test`: 21 tests passed across circuit logic, history and React Testing Library inspector checks.
- `npm.cmd run test:e2e`: 5 Playwright Chromium tests passed, including immediate double-click junction insertion, shared pins, movement, undo/redo, exact JSON round-trip, drag/drop, invalid imports, mobile width 390, near-pin drag snapping and isolated crossing nets.
- `npm.cmd audit`: zero reported vulnerabilities after upgrading Vitest to 5.1.0.
- `npm.cmd run dev -- --port 5173 --strictPort`: started successfully; HTTP GET at http://127.0.0.1:5173/ returned 200.
- Desktop and mobile screenshots inspected. Chromium was tested on this Windows environment; Firefox/WebKit, real touch devices and hardware behavior were not tested.

Browser regression testing exposed a transient SVG hit-target loss when inspector selection rerendered between double-click events. Deferring single-click edge selection and cancelling it on a double-click retains the wire target; the zero-delay regression now passes. Pin dragging released 8 pixels horizontally and 3 pixels vertically from the target center connected to the intended pin.

The initial npm audit found three test-tool dependency issues; the subsequent upgrade and audit resolved all reported findings. No Phase 1 test demonstrates firmware execution, analog accuracy or hardware safety.

## Actual Phase 2 verification

- Engine: 15 tests passed. Compiled C/ELF/HEX fixtures verify Timer1 ISR250ms edges, UART startup/LED messages, independent D12 firmware, D2 input-register mirroring, pause/reset determinism, parser limits and explicit failures.
- Frontend: 43 unit/component tests passed, including18 digital net projection and4 Worker ownership/timeout/buffering tests.
- Browser: 8 Chromium tests passed after pre-bundling the engine and disambiguating file uploads. A subsequent visual inspection exposed hidden XYFlow nodes during signal updates; a visibility regression was made to fail, measured dimensions were retained, and the focused regression then passed. Final full-suite results are recorded in progress.md.
- Rebuilt all three genuine firmware binaries with the downloaded official AVR-GCC7.3.0 toolchain. Archive SHA256 matched; no system install. See engine firmware metadata.
- Engine timing evidence: D13 at4000163 and8000163 cycles; delta4000000 at16MHz =250ms. UART text originates from executed firmware instructions.
- npm audits for engine and frontend reported zero vulnerabilities at initial Phase2 verification.

No physical board, Firefox/WebKit, UART electrical waveforms or unverified peripherals were validated. This is not a claim that every AVR/Arduino binary works.

### Final Phase 2 verification after review

Frontend45/45, engine15/15, Chromium development8/8 and production-preview3/3 tests passed. Both builds and dependency audits passed (zero reported vulnerabilities). The Worker now owns CPU execution and digital net/LED evaluation; React displays snapshots. The visibility regression is fixed and asserts visible Uno/LED nodes while executing firmware.

Run production checks with `npm.cmd run build` then `npm.cmd run test:e2e:production` (preview port5175). Development tests use5174. Hardware comparison remains pending; see EMULATOR_COMPATIBILITY.md for tested and unsupported capabilities.
