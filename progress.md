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

## 2026-11-05 - YD board Phase A validation
- Added manufacturer-sourced44-terminal YD metadata, stable P1/P2 physical IDs, GPIO metadata and module restrictions; exactV1.3 revision/memory/dimensions remain clearly marked for confirmation.
- Added separate SVG board renderer and rotation-aware handle geometry; integrated palette, inspector, explicit shared-rail netlist aliases and schema1.1 (old1.0 Uno import/export preserved).
- Build passed and9 Chromium tests passed, including44 pins, tooltipGPIOidentity, shared pin connections, rotation and JSON roundtrip plus all8 existing editor/Uno browser regressions.
- PhaseA acceptance gate passed for implemented graphics/pinout behaviors; unknown hardware details are not claimed verified. Genuine ESP32-S3 boot validation may now begin.

## 2026-11-05 - ESP32-S3 real execution evidence
- PhaseA build/frontend62 tests/9 Chromium tests passed before any firmware instruction execution.
- Pinned Espressif ESP Emulator0.51.0 (Apache-2.0) archive SHA256 matched official release digest; JS/WASM assets and notices are mirrored locally for reproducibility.
- Official MicroPython1.29.0 Octal-SPIRAM merged image genuinely booted through ESP32-S3 ROM and reached UART REPL; boot-report.json records actual15219369 cycles and guest output. Two Xtensa harts are reported after boot.
- Genuine guest Pin/Timer execution produced GPIO4 HIGH/LOW, GPIO5 input0/1 and sampled timer transitions approximately248810us apart (requested250ms). gpio-report.json records UART and cycle evidence.
- Browser tests verified real boot, firmware-origin LED through resistor/net, UART RX/TX, actual wired momentary button input, pause/reset, visible board and explicit rejection of AVR HEX; no AVR Worker requests.
- Engine0.3.0 adds a shared injectable MCU facade and a separateS3 adapter while keeping UnoRuntime unchanged. Budget units are explicit (AVR cycles vsS3 instructions).
- External I2C/RMT/WS2812 device callbacks are not exported by this browser binding. RGB/DS1307 remain blocked; no fabricated peripheral output.
- ExactV1.3 schematic, physical module marking/N16R8 capacity and PCB dimensions require confirmation. Browser flash/PSRAM size overrides are not available. No hardware parity claim.

## Final verification - 2026-11-06
- Frontend build passed;71/71 frontend tests passed.
- Engine build passed;17/17 engine tests and5/5 ESP adapter/binding checks passed, with real boot/GPIO firmware scripts also passing (not contract doubles).
- Chromium development suite11/11 passed, including existingUno, wire snapping/shared nodes/junctions/crossings/JSON and newS3 boot/LED/UART/SW1/BOOT/RST. Production preview suite5/5 passed against the built Worker assets.
- Both dependency audits report zero vulnerabilities. verify:assets validates pinned officialJS/WASM, MicroPython image, all AVR fixtures and engine tarball SHA512 against lockfile.
- Final browser test inspected genuine firmware output and explicitly observed no AVR Worker on theS3 path. Screenshot of the running metric-based board and GPIO monitor visually reviewed.
- Manufacturer metric PDF was rendered/read:27.94mm width,63.39mm overall height,57.15mm PCB height,2.54mm header pitch,53.34mm row span,25.40mm column spacing. Updated metadata and shared SVG/handle geometry at10units/mm. ExactV1.3 still unconfirmed.
- Fixed metadata-based power rail checking, retained legacyUno error semantics, and disambiguated UART test selectors. Source code review completed; tests prove no pin/architecture substitution.
- Required ESP32 board/emulator/firmware/test-report/MCU-compatibility documents created. Current acceptance: graphics/pinout, firmware boot, GPIO output/input and UART validated; RGB/DS1307 hooks unavailable; fullN16R8 sizing unverified (reference reports4MiB flash/~8.3MB free guest heap).
- Interactive frontend returnedHTTP200 on127.0.0.1:5173. Backend unchanged. No commits/pushes/deployments performed for this task.

## Commit and push preparation - 2026-11-06
- User explicitly authorized commit/push of pending simulator changes. Target is existing origin/main.
- Fresh frontend build,71 tests and verify:assets passed. Engine build,17 tests,5 adapter checks and genuineS3 boot/GPIO scripts passed separately.
- Release includes metric44-pin YD board, strict physical/native pin metadata, rotation and wiring, real ESP32-S3 WASM firmware execution, GPIO/UART/input controls, shared MCU facade and documented acceptance gates.
- RGB/DS1307 interfaces, fullN16R8 sizing and exact board-revision confirmation remain explicitly open. Backend has no changes.
- Compiler/download/PDF-analysis caches, node_modules, dist and browser reports remain excluded. Firmware and emulator byte integrity is protected in Git attributes and checked from staged blobs before commit.
- Remote synchronization will be verified separately after pushing frontend and engine.
