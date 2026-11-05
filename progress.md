# SimuLab frontend progress

## 2026-11-05 — Phase 1 foundation

### Initial state and ownership

- Initially only README/Git metadata; no application dependencies or source.
- Adjacent backend/engine repositories remain outside this milestone.
- Windows host has Node.js 24 and npm available.
- Plan: `docs/PHASE1_PLAN.md`. Circuit specialist owns `src/circuit/**`; main implementer owns UI/configuration/browser integration; documentation specialist owns these documents.

### Design and documentation

- Schema `1.0.0` stores explicit pin endpoints; geometric crossings never connect nets.
- Created setup, architecture, roadmap, development/testing guidance, contributor rules and contract documentation.
- Emulator candidates remain unverified. Phase 1 is editor/demo only; no firmware or analog simulation is claimed.

### Verification

- Initial `npm.cmd run build`: passed TypeScript compilation and Vite production build.
- Initial `npm.cmd run test`: 18 tests passed.
- Dependency audit initially reported three problems. Upgraded Vitest to `5.1.0`; the subsequent npm audit reported zero vulnerabilities.
- Browser QA completed: 5/5 Chromium acceptance tests passed, including zero-delay double-click junction insertion and near-pin snapping. Initial overlapping-wire interaction failure was fixed and retained as a regression test.

### Files and module overview

- `package.json`, lockfile, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`: frontend dependencies, scripts and build/test configuration.
- `src/circuit/**`: reusable catalog, project schema/parser, explicit electrical endpoint model, netlist, connection/junction operations and critical logic tests.
- `src/editor/**`: reusable pin/node rendering, Zustand circuit edit history and history/inspector tests.
- `src/App.tsx`, `src/main.tsx`, `src/styles.css`: editor composition, XYFlow canvas, diagnostics and styling; palette and inspector are separate reusable modules.
- `tests/editor.spec.ts`: five verified browser acceptance checks.
- Root Markdown documents and `docs/**`: setup, architecture, contracts, plan, testing, roadmap, emulator evaluation gates and contributor guidance.

### Current limitations

- Firmware, analog solving, cloud services and mechanical simulation are not implemented.
- The project schema reserves `rotation`, but nonzero values currently are not visually applied; rotation interaction remains deferred.
- Manual wire-segment movement and comprehensive electrical-rule checking remain future work.

### Next work

Evaluate real AVR emulator licenses, toolchains, firmware formats, host/browser feasibility and GPIO/UART hooks. Run compiled ATmega328P firmware before integrating runtime device visualization.

### Final integration verification

- Phase 1 delivered in frontend only. Latest production build passed; 21 unit/component tests and 5 browser tests passed.
- Started Vite at http://127.0.0.1:5173/ and verified HTTP 200. Desktop and mobile screenshots visually inspected.
- Added `src/editor/ComponentPalette.tsx` and `Inspector.tsx` with host-supplied action callbacks, plus inspector validation tests.
- Stabilized node data, disabled selection elevation, and deferred edge inspector selection to retain SVG hit targets during rapid double-click junction insertion. Regression now passes without artificial delay.
- Added `docs/DEPENDENCIES.md` for installed direct-dependency versions/licenses. Latest npm audit: zero findings.
- Backend/engine Git status checked clean. No commits, pushes, repository creation, deployment or purchases performed.
- Known editor limits: single selection; automatic orthogonal routing without obstacle avoidance/manual segment editing; reserved rotation metadata with explicit inspector disclosure; Chromium-only automated browser coverage. Mobile inspector is hidden to preserve canvas space.

## 2026-11-05 - Phase 2 AVR integration

### Implemented files and architecture
- Added `src/simulation/{protocol,avr.worker,useSimulation,SimulationControls,projection}` and tests. The independently packaged engine executes compiled AVR instructions; digital net/LED evaluation also runs in the Worker. React only renders snapshots.
- Updated App, ComponentNode and inspector for firmware upload/sample, real execution badges, start/pause/resume/stop/reset, cycle-derived time, LED state and UART monitor.
- Added versioned `vendor/simulab-engine-0.2.0.tgz`, pinned transitive AVR8js0.21.1, checked-in public HEX fixtures and provenance metadata. Verified tarball SHA512 against lockfile integrity and all public firmware SHA256 against compiler metadata.
- Created Phase2 plan/transport contract before integration. Updated README, architecture, development/testing/roadmap, compatibility and dependency license docs.

### Review and fixes
- New Worker dependency initially caused a Vite first-use full reload. Server logs confirmed it; explicit dependency pre-bundling fixes it. Browser tests use isolated port5174.
- Tests now select circuit JSON and firmware file inputs independently.
- Visual inspection found XYFlow nodes became hidden under changing GPIO data. Added an assertion that failed, retained dimension measurements in editor-only state, and verified the corrected visibility and pin/wire geometry.
- Worker sessions terminate on circuit edits/unmount/errors, discard stale messages, validate protocol version and time out if unresponsive. Delayed firmware loads validate the current circuit, not stale closures.
- Firmware/session/serial/event limits are explicit; paused sessions automatically stop progressing at60 simulated seconds and ask for reset. No silent demo fallback.
- Digital projection follows connected pin identity; D12 binary does not light a D13-connected LED, and rewiring to D12 does. Floating/conflicting signals remain unknown with diagnostics.

### Actual final results
- Engine build passed; engine test suite15/15 passed.
- Frontend strict TypeScript/Vite production build passed, emitting a separate Worker asset.
- Frontend45/45 unit/component tests passed; Chromium8/8 development acceptance tests passed.
- `npm.cmd run test:e2e:production`:3/3 firmware/lifecycle/error tests passed against production preview on5175.
- Engine and frontend npm audits: zero reported vulnerabilities.
- Recompiled all3 fixtures via official local AVR-GCC7.3.0; compiler archive hash verified, no system install. D13 edges at4000163 and8000163 cycles, exact250ms simulated interval; actual UART bytes captured.
- Running production screenshot visually inspected: circuits remain visible during execution. Original editor/shared-pin/junction/crossing/import regressions remain green.

### Remaining gates
- Physical Uno/hardware comparison was not performed. Phase2 software integration is delivered, but hardware parity remains unverified.
- Timer0/2, PWM, advanced peripherals, UART RX and live circuit-button inputs need independent tests/integration. No Mega/ESP32, analog solver, in-app compilation or cloud service.
- Single selection, deferred visual rotation/manual wire routing and Chromium-only automated coverage remain.
- Firmware/runtime sessions are not serialized into circuit JSON. Stop/edit/reload workflow is intentional and documented.
- Backend untouched; no commits, pushes, deployments or purchases. Next: hardware comparison and dedicated peripheral compatibility fixtures before broader MCU integration.

## 2026-11-05 - Commit and push preparation
- User explicitly authorized committing and pushing all three SimuLab repositories to their existing origin/main branches.
- Fresh verification: strict production build passed;45 frontend tests passed. Existing firmware/editor browser acceptance evidence remains documented above.
- Added .gitattributes so firmware HEX and engine tarball bytes remain unchanged across checkout platforms; text source defaults to LF.
- Reviewed outgoing tracked/untracked paths; node_modules, dist, browser reports and local compiler downloads are excluded.
- This release includes Phase1 editor and Phase2 real AVR Worker integration with documented hardware/peripheral limitations. Remote synchronization is verified separately after push.
