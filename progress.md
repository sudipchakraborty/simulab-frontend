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

## 2026-11-06 - Components and integrated IDE in progress
- User master request retained at workspace docs/SIMULAB_REQUEST.md; checklist: docs/SIMULAB_IMPLEMENTATION_PLAN.md. Work is on feature/components-ide in all three repositories; no commits/pushes.
- Added pure DS3231, HC/B 4067, motor, WS2812 and powered relay models, H-bridge, schema1.2, library/rendering/inspector and Worker bridge. Standalone model tests passed; full frontend85 tests passed before latest chain/IDE changes. Monaco multifile tabs, portable IDE document, local autosave, restricted companion client, debug capability/register controls and serial controls implemented; browser/build verification underway.

### Software verification checkpoint - 2026-11-06
- Frontend99 tests/build/asset verification/audit passed; development15 and production9 Chromium tests passed. Actual compiled Adafruit NeoPixel1.15.5 laboratory drives motor/RGB/RTC; standalone component, schema, clock, IDE and security regressions are included. Added docs/COMPONENT_DEVELOPMENT.md, INTEGRATED_IDE.md, COMPONENTS_IDE_TEST_REPORT.md and an all-device wired/sample-code laboratory. Final visual screenshot reviewed.

## Final implementation handoff - 2026-11-06
- Frontend0.4.0 delivers DS3231, HC/B4067, motor/H-bridge, WS2812B and powered relay, schema1.2, injected ComponentModel factories, realistic live SVG/property adapters and a wired all-device Uno laboratory/sample sketch. Hardware/Code/Debugger/Serial tabs share one persistent workspace. Monaco source/cursors/files/requested breakpoints and circuit/viewport/UART sessions survive tab changes; portable save/load and browser autosave are implemented.
- Restricted local Arduino CLI client builds, maps diagnostics, installs allowlisted libraries and requires single-use authorization for physical uploads. Source/board edits invalidate asynchronous build results. Debugging exposes real Uno instructions/registers/GPIO/I2C; unsupported source/physical controls are disabled, with no fabricated source-line tracking. Web Serial workflow is present but physical I/O untested.
- Final frontend99 tests, production build, asset/added fixture/tarball hash verification and audit passed (zero findings). Development15-case suite plus an additional real Arduino S3 browser case passed. Production9 passed; final expanded10-case run is being closed out. Genuine compiled Uno laboratory motor/RGB/RTC and S3 Arduino UART/GPIO4 were inspected.
- Remaining boundaries: no identified physical target was flashed or used for USB serial/debug/parity. COM3/COM4 were discovered only. Exact YD module/revision and full flash/PSRAM address capacity are unverified. Original ESP32 execution, S3 external I2C/WS waveforms, source/DWARF/GDB debug, encoder variant and full analog/mains/current-safety solving remain unsupported. No commits, pushes or deployment; changes remain on feature/components-ide.

### Final gate closed - 2026-11-06
- Final production Chromium10/10 passed, including actual compiled Arduino S3 browser UART/GPIO4. Frontend99, engine19, ESP adapter5 and backend2 tests passed; builds, asset hashes and audits passed. All4 board compile profiles passed. Both generic and compatible N16R8 S3 Arduino binaries booted with firmware-hash/UART/GPIO evidence. Software implementation complete; physical and explicitly unsupported gates remain documented.
- Final handoff: frontend docs/COMPONENTS_IDE_TEST_REPORT.md and docs/INTEGRATED_IDE.md; backend README.md and docs/TOOLCHAIN_REPORT.json; workspace docs/SIMULAB_IMPLEMENTATION_PLAN.md. Changes remain local/uncommitted on feature/components-ide. Temporary verification companion is stopped after testing; start npm.cmd start in simulab-backend for a new private pairing token.

## App started - 2026-11-06
- Reused running frontend at http://127.0.0.1:5174/ and verified HTTP200.
- Started local companion at127.0.0.1:4317 with a fresh in-memory pairing token; authenticated status confirms Arduino CLI available. Trusted cold-build timeout1800000ms. Token is not stored in project documentation.


## Account and IDE integration checkpoint - 2026-11-06
- Added reusable account transport/context and authentication landing, email verification/reset, remembered cookie session restore, per-identity workspace isolation, theme preferences, configured checkout/payment tracking and privileged account/payment controls. Browser stores appearance only; account credentials and proof tokens are never cached.
- App now injects authoritative edit/run/upload/save capabilities into IDE. Trial/expired/offline accounts cannot save/export/autosave or bypass saving through Ctrl+S. Paid downloads follow successful server saves; local workspace keys are scoped by account ID. Viewer circuit/source mutation paths are guarded, Monaco respects read-only state and follows theme changes.
- Component drag validation derives from the shared catalog; adding components upgrades documents to schema 1.3.0. Studio version label is 0.5.0.
- Verification: account unit/UI seven tests passed; IDE regression and access tests passed, including trial autosave/shortcut denial, remote rejection preventing download, and server acceptance preceding download/per-user cache. TypeScript check passed before the final small catalog/fieldset changes; final full browser/build checks belong to the integration owner. SMTP/payment activation remains server-configured; no live email, charge or payment approval was performed.

## Accounts/themes/robotics model-domain handoff - 2026-11-06
- Added schema1.3 with all19 requested kinds: Nano/Mega, DC meters, HX711/DHT22, full-step stepper/driver, PWM servo, tactile and electromagnetic switches, generic6DOF/Universal-style and approximate Dobot/uArm arm profiles, conveyor, four-wheel car and paired IR modules. Old schema1.0/1.1/1.2 remains readable. Parameter validation is shared by import and Inspector; reusable models use explicit configuration and simulation microseconds.
- Added native AVR board registry and category exports. Nano A6/A7 explicitly ADC-only/unsupported. Mega uses D0..53/A0..15 and D20/D21 I2C; CPU implementation belongs to parent engine task. New board types participate in runtime/projection without masquerading as Uno.
- DC solver now preserves real resistor/shunt/coil branches, signed branch current, KCL/Ohm-law invariants, floating/conflicting states and a256-unknown-node per-island bound. Ideal high-impedance voltage probes never fabricate branch current. Nonlinear/transient analog and realistic actuator supply current remain outside scope.
- Shared model factory supplies powered driver/PWM/step/optical devices with live SVG state and Inspector output. Robot profiles are explicitly approximate educational models, not vendor serial/USB/CAD-certified behavior. Model README documents timing, electrical and mechanical boundaries.
- Test-first model/protocol/invariant work passed. Genuine avr-gcc ATmega328P fixture verified actual GPIO reads of HX711 signed -2 and DHT22 -12.3C/60% with valid checksum, using CPU input-read/GPIO callbacks and an external pull-up. Source/HEX/compiler hashes retained; no physical hardware parity claimed.
- Verification at handoff: npm.cmd test passed30 files/136 tests; npx.cmd tsc -b passed. Final full-browser account/theme/robotics integration is parent-owned. No commit/push/deployment performed.

### Account review fixes - 2026-11-06
- Closed serial-log export bypass for trial accounts and guarded physical USB serial selection/transmission by hardware permission; revoking permission disconnects an open port. Confirmed account-specific IDE caches do not restore legacy shared workspace data.
- Invalidated stale session refreshes after explicit authentication and successful appearance changes. Added exact-subscription-expiry refresh/render so local autosave cannot remain enabled until the next minute tick. Added pending-verification resend recovery using server CSRF preflight.
- Independent backend review identified failed-mail signup recovery and SMTP STARTTLS downgrade handling; findings were sent to the backend owner for fixes. Focused frontend checks: 14 tests passed together, then the new delayed-theme regression passed in its six-case account suite. TypeScript check passed after these changes. Full browser/layout verification remains with integration owner.

## 2026-11-06 - Real account browser harness and API routing
- Added `scripts/account-test-server.mjs`: isolated SQLite/SYSTEM files and explicit development outbox; trusted in-process seeds for paid/trial/admin/viewer accounts. Browser login uses the normal production HTTP routes, cookies, origin and CSRF checks; no HTTP test bypass exists.
- Added reusable `tests/fixtures.ts` to authenticate existing studio scenarios as a real paid editor. Existing Playwright specs use this fixture; updated the exported schema assertion to 1.3. New anonymous `tests/accounts.spec.ts` exercises real signup, pending local-email notice, single-use auto-login verification, trial save/export/Ctrl+S denial, direct API trial denial, remember-session reload, per-account themes, paid private cloud export, ownership and admin denial, and password recovery via actual local outbox links.
- Vite dev and production preview proxy `/api` to port 4320 by default, overridable via `SIMULAB_ACCOUNT_API`. Browser configs launch isolated account servers on 4321/4322 and dev/preview on 5184/5185 (test/preview ports remain configurable), leaving existing user servers untouched.
- Production build passed. Full production Playwright: 16 passed, 3 explicitly skipped because real companion token/toolchain were not supplied to this run. New screenshot artifacts cover pending signup, trial light, paid dark and paid light. A later account-only screenshot rerun revealed test navigation racing async sign-out; added an explicit logged-out-heading wait before the next navigation. Parent records final rerun result.

### Browser fixture rate-limit correction
- Replaced per-test account logins with a worker-scoped real HTTP login in `tests/fixtures.ts`. Each test still gets a fresh browser context initialized from that worker's cookie storage state. Production authentication and the 20-login/minute limiter remain unchanged; anonymous account-flow tests continue using ordinary Playwright fixtures.
- Standalone strict TypeScript check of `tests/fixtures.ts` completed successfully. No broad browser suite was started during the parent's Mega/debugger investigation.
## Final gate closed - 2026-11-06, milestone0.5
- Frontend140/140 unit/component tests, engine21/21, ESP adapter5/5 and backend10/10 passed. Latest strict TS/Vite build and vendored executable/firmware/engine hashes passed; all3 production dependency audits reported0vulnerabilities.
- Final production Chromium21/21 passed with real account API/outbox (no auth bypass), actual CLI Uno compile/run, genuine S3 compiled image and native Nano/Mega Workers/instruction debugger. No optional tests skipped. Compiler tests serialize single-job companion use; test login is worker-scoped to respect production rate limiting.
- Dark/light account/studio screenshots reviewed; header layout corrected. Signup/verification, trial denial across Save/export/CtrlS/autosave/serial export, identity isolation, theme reload and reset verified. Backend tests cover HMAC authenticity/amount/replay, ownership/RBAC, SMTP encryption, session-stream revocation and trial start.
- App running http://127.0.0.1:5174 (HTTP200), API4320 via /api proxy (HTTP200), compiler companion4317. Private local development outbox: backend .local/mail-outbox; messages are NOT delivered email. Live SMTP/provider/price/currency/QR remain unconfigured. No real charge, hardware upload/comparison, commit/push or deployment.
- Handoff: frontend docs/ACCOUNTS_COMPONENTS_REPORT.md, src/models/README.md, backend README.account.md/.env.accounts.example and engine firmware/mega2560-metadata.json. Full analog/SPICE, ADC/SPI/EEPROM/MegaUSART1-3, vendor robot protocols and source/GDB debugging remain explicit limits.

## 2026-11-06 - Temporary configurable login bypass
- User authorized temporarily disabling login. Added runtime frontend public/system-config.json with loginEnabled:false; setting true and refreshing restores existing auth/subscriptions. Missing/invalid/unavailable configuration defaults to true.
- Reusable config loader plus isolated local account provider opens workspace directly and enables local saving/export/simulation/paired tools without weakening backend authentication or calling private account APIs. Local storage identity is separate; themes persist in browser for this mode. Account/billing/signout controls are hidden locally.
- Added configuration/local-provider regressions and browser toggle/save/reload test; existing auth browser scenarios explicitly select enabled configuration. README documents public versus deployed dist config location. Verification results follow.

- Login toggle verification:12 focused account/config tests passed; strict TypeScript/Vite production build passed;4 production browser scenarios passed (disabled local open/save/theme reload and switch-to-login, plus existing verification/subscription/theme/reset flows). Live5174/system-config.json returns HTTP200 with loginEnabled:false. Both public and built dist JSON currently disable login. Completion beep issued. No backend auth changes, commits or deployment.

## 2026-11-10 - Fixed resizable workspace panels (in progress)
- User selected fixed-edge panels. Approved design and inline plan: frontend docs/superpowers/plans/2026-11-10-workspace-panels*.md.
- Added reusable src/layout modules: validated appearance-only preferences, per-workspace storage hook, accessible pointer/keyboard DockPanel and always-visible Layout menu with show-all/reset. No new dependencies. Top toolbar, left Components, right Inspector and bottom hardware output/code build console now use fixed containers; hidden children stay mounted so work/runtime state survives.
- Bounds protect central workspace; narrow initial layout hides side panels and permits explicitly reopened overlays. Local and authenticated workspaces keep separate layout keys. Login setting, backend accounts, project schema and exported project content are unchanged.
- Initial focused layout tests4/4 and strict TypeScript passed; browser drag/show/hide/persistence/state checks underway. Earlier RED test confirmed missing implementation; boundary expectation corrected to allow requested growth only on a viewport with sufficient height.

### Panel review fixes and regression checkpoint
- Side panels moved outside the active tab panel, so Layout can restore Components/Inspector beside Code/Debugger/Serial too. Bottom Output means hardware checks/netlist/UART or build console on the other tabs. No content is unmounted for toggles.
- Fresh review found a stored-vs-displayed-size bug after viewport shrink and insufficient vertical bounds. Reproduced RED tests (Home265vs180, output bottom1087vs980), then normalized dimensions before gesture deltas and budgeted toolbar/canvas/output minimum heights. Central canvas may shrink to120px; unusually short viewports retain a scroll fallback. Browser layout keeps visible border grips.
- Latest focused layout tests5/5 and strict TS passed; final6-scenario browser checks include viewport-shrink/Home/arrow and maximum vertical sizes. No backend or engine changes.

### Fixed panels - final verification, 2026-11-10
- Final frontend unit gate:147/147 across34 files. Strict TypeScript/Vite production build passed; existing large-bundle warning remains. Development panel scenarios6/6 and editor/IDE integration checkpoint11/11 passed. Final production Chromium17/17 passed (layout6, editor5, IDE2, real accounts3, login-config1), no skips in this targeted suite.
- Fresh independent review findings were corrected and regression-tested RED/GREEN: displayed-vs-stored resize after viewport shrink, and clipped bottom output at maximum top/bottom sizes. Follow-up review found no further substantive issues. Desktop/mobile/maximized screenshots inspected.
- Usage: permanent top-right Layout menu toggles Top toolbar/Components/Inspector/Output; each pane X hides it. Drag the center-facing grip, or focus it and use arrows/Shift+arrows/Home/End. Show all panels and Reset layout remain available when every pane is hidden. Per-workspace browser appearance preferences remember dimensions and visibility.
- Hidden content stays mounted, genuine AVR execution survives hiding, unsaved source is retained, and side panes restore beside every workspace tab. On small screens sides start hidden and can open as overlays. Existing loginEnabled:false is preserved; live5174 HTTP200 verified.
- README and approved design/plan updated; all root/frontend progress recorded. No backend/engine changes, commits, pushes or deployment. Completion beep issued after successful final checks.

## 2026-11-10 - Group editing and design compile/run proposal
- User requested drag group selection/move/delete/copy, New project, Select all/Delete all confirmation, and compile-current-editor-code Run/Pause/Stop on Hardware.
- Inspected existing single-selection App/store/editing helpers and separated IDE build/load/Worker lifecycle. Proposed reusable topology-safe edits and guarded actual compile/load/ready/run flow; design at frontend docs/superpowers/plans/2026-11-10-selection-new-compile-run-design.md.
- Product implementation not started; awaiting New project circuit+code reset choice/design confirmation. Existing running app and project data untouched.

## 2026-11-10 - Group editing, blank projects and Hardware compile/run implementation
- User approved option1: New project confirms resetting both circuit and source. Approved design/plan: docs/superpowers/plans/2026-11-10-selection-new-compile-run*.md.
- Added reusable pure selection/clipboard/move/delete helpers; native XYFlow rectangle selection, Shift additive selection, Space pan, multi-component drag committed once, toolbar/keyboard copy-paste/duplicate/delete/select-all. Pasted groups get new IDs and preserve only internal wires; component deletion removes all incident wires. Group Inspector summary added.
- Added reusable native confirmation dialog for New/Delete all. New resets circuit/history/source via injected IDE reset; pairing/theme/layout survive. Delete all retains code and supports Undo; Cancel does not change project data.
- Added visible Hardware Run code/Pause/Resume/Stop and a Hardware Build output tab. Existing reference/HEX/BIN controls remain explicit separate tools. Compile domain uses real companion, actual circuit target, revision guards, entitlement checks and Worker-ready automatic start. Stop/source/board/circuit/New invalidate pending jobs; network compiler jobs may finish but stale replies cannot start execution.
- Initial checks:6 core selection/history tests passed,24 focused compiler/Worker tests passed,2 browser editing/New scenarios passed. Real source-to-CLI-to-Worker and regression gates underway; independent review requested. No dependencies/backend/engine schema changes, commits or deployment.

### Group editing and compile/run verification checkpoint
- Core6 selection/history tests and24 focused compile/Worker tests passed. Real browser source-to-CLI-to-AVR gate passed: unique DESIGN_RUN_CURRENT_SOURCE serial text, generated GPIO13 LED activity, Pause/Resume/Stop, actual circuit profile auto-match and syntax-error rejection without running stale firmware. No mocked compiler output in this gate.
- Review found keyboard nudges were only draft positions. Reproduced browser RED (exportedx520 unchanged after ArrowRight), then committed complete non-dragging XYFlow position batches atomically. Pointer-stop uses currentstore and skips unchanged commits, so group Undo remains one step. Saved keyboard group movement + Undo regression passed. Fresh rereview found no further substantive issues.
- Development editing/legacy topology gate8/8 passed, including rectangle move/copy/paste/subgraph preservation, selected/all deletion/Undo, modal Cancel, blank source+design reset and saved keyboard movement. Full unit/build/production gates underway. Documentation added in README.

### Run ownership compatibility review
- Full production checkpoint initially31passed/1failed: the pre-existing IDE reference-firmware session test caught unconditional source-edit Stop. Preserved independent manual reference sessions while still invalidating code-owned compile/run jobs; focused4-case real companion/IDE gate then passed.
- Further review identified same-filename manual upload vs compiler artifact ambiguity. Replacing filename ownership with actual load-session identity, including an explicit same-name real firmware handoff browser regression. No tests were weakened to hide the original behavior.
- Top toolbar Run now shares compile-current-source semantics with Hardware Run code; manual file/reference starts remain the separate firmware controls. Hardware build output automatically opens for compile operations started on the design page.

### Firmware load identity fix
- Replaced filename ownership with monotonic UI loadSession identity returned by useSimulation.load; every attempted load (same filename/status or rejected) gets a new identity. Code jobs snapshot/own the matching load ID; a foreign manual session invalidates late code jobs without stopping that manual Worker. App forwards the load result through permission gating.
- Simultaneous source/manual-session changes are also guarded. Focused32 compiler/Worker tests and strict TS passed; fresh readonly review confirmed same-name ownership finding resolved. Added genuine same-filename HEX upload/edit-source browser regression to the real CLI gate.
- No protocol/MCU engine changes or new dependencies. Final browser/unit/build reruns follow this fix.

### Group editing/New/compile-run - final gate closed, 2026-11-10
- Final frontend168/168 tests across36 files passed. Strict TypeScript/Vite production build passed; existing chunk-size warning remains. Vendored executable/firmware/engine integrity check passed and git diff whitespace check passed.
- Full final production Chromium32/32 passed with no skips (real paired companion token + actual compiled S3 image supplied). Includes genuine current-source CLI compile/auto-load/ready/run, LED+serial behavior, Pause/Resume/Stop, syntax-error failure without stale execution, and same-filename manual firmware upload followed by independent source editing. Existing Uno/Nano/Mega/S3, IDE persistence, accounts, themes, trial restrictions, layout and topology flows remain green.
- Group browser evidence: rectangle selection, atomic pointer and keyboard group movement, exact saved positions, internal-wire clipboard remapping, selected/all deletion with confirmation/Cancel/Undo, and New confirmed blank circuit+source with cleared history. Source typing shortcuts retain normal behavior.
- Independent review defects fixed with RED/GREEN regressions: keyboard draft-only nudges, unconditional source-edit Stop of reference firmware, and same-filename ownership ambiguity. Follow-up reviews confirmed the identified findings resolved. Desktop group/run screenshots inspected.
- Usage: drag empty canvas to select; Shift adds; Space+drag pans. Toolbar/keyboard supports Select all, Copy/Paste/Duplicate/Delete. Delete all asks before clearing design and retains code/Undo. New asks before clearing both design and code. Pair local compiler once in Code Editor, then Hardware Run code (or toolbar Run) compiles latest sources for the actual single MCU and executes; Stop invalidates late runs. Already-started server compiler requests may finish before another job is accepted, but their canceled results cannot start execution.
- README, test record, approved design/plan and root/frontend progress updated. Live app5174 HTTP200; loginEnabled:false preserved. No dependencies, backend source/MCU engine, physical uploads, account provider configuration, commits, pushes or deployment changed. Completion beep issued after successful final verification.

## 2026-11-11 - Release verification and publication audit
- User requested check/commit/push for all3 existing repositories; publish current feature/components-ide branches, preserving main. Engine e764d73 and backend f63e123 already passed fresh checks and remote-hash/clean-tree/0-0 synchronization verification.
- Fresh frontend unit gate168/168 passed across36 files with `npm.cmd test -- --maxWorkers=1`. Initial jsdom runs hit the sensor-firmware test20-second wall guard; its pure CPU/protocol test now explicitly uses Node (no DOM dependency), with original timeout and exact sensor-frame assertions unchanged. Isolated Node test and full serial suite passed.
- Strict TS/Vite build, all executable/firmware/vendored-engine hashes and production dependency audit passed (0vulnerabilities). Current vendored engine dist matches newly built/published engine source output. Known production bundle-size warning remains.
- Release audit fixed outdated Node-only dependency wording (account service uses Nodemailer), removed one trailing blank line, and marked C source fixtures -text so Git does not invalidate recorded source SHA256 by newline conversion. Staged sensor C bytes match provenance.
- Staged source/docs/tests/config examples/intentionally versioned firmware and engine artifacts audited: no private keys, GitHub token, live companion token, credential-bearing URLs or runtime/database/cache paths included. .local/node_modules/dist/test-results remain ignored. Explicit user loginEnabled:false retained. Full real-compiler production browser gate follows before commit/push.

- Release browser diagnostics reproduced Mega Pause taking over2 seconds while a large native-pin CPU batch held the Worker. Mega batches now yield after16000 cycles with1ms scheduling (other targets unchanged); emulated time remains cycle-derived. Tightened native-board Pause assertion to2 seconds and added control-state diagnostics. Repeated Mega browser checks3/3 and simulation unit tests37/37 passed; rebuilt production successfully. Final full browser rerun follows.

- Final production Chromium gate32/32 passed, no skips (3.0min), using real paired Arduino CLI and real compiled S3 firmware. Mega native Worker check passed1.6s including tightened2-second Pause assertion. Source compile/run, account/trial/theme/config, layout/group/New and all board compatibility regressions passed. Release ready for commit/push; production deployment and physical-board testing were not requested.
