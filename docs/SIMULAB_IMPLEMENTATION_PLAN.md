# SimuLab Components and IDE Implementation Plan

**Goal:** Extend the existing studio with five functional models, a persistent tabbed IDE and an authenticated local Arduino toolchain.
**Architecture:** Preserve React/XYFlow/Zustand and target-specific Workers. Add pure parameter-initialized component models with explicit simulation time, a circuit bridge, a persistent IDE document and a loopback-only companion in the existing backend repository. No source interpretation or synthetic firmware output.
**Stack:** TypeScript, React, Vitest, Playwright, Node HTTP, Arduino CLI, Monaco.
**Spec:** [User request](SIMULAB_REQUEST.md). Execution is explicitly authorized in sequence, without a plan approval pause. No commits/push/deployment requested.

## Constraints and review focus
- Existing 1.0/1.1 circuit imports must continue working; new devices use schema 1.2.
- Domain models never depend on React/Node. Public APIs use Doxygen-compatible comments.
- Simulation time must be monotonic and deterministic; reset reconstructs model state.
- Floating/conflicting/unpowered pins must not produce fabricated valid results.
- S3 external I2C/edge waveform hooks and original ESP32 execution are unavailable: capability gates remain explicit.
- Local companion accepts fixed board profiles and bounded source files, never arbitrary shell commands. Loopback binding, origin/host checks, bearer authentication, serialized jobs and one-use upload consent.
- Physical uploads/debugging require connected hardware; no hardware pass claim without it.

## Phase checklist
- [x] 1. Inspect current repositories, contracts, models, Workers, tests and toolchain availability.
- [x] 2a. DS3231 register/I2C/calendar/alarm model and tests.
- [x] 2b. Profile-specific bidirectional 4067 model and tests.
- [x] 2c. DC motor + safe H-bridge model and tests.
- [x] 2d. WS2812 timed edge/chain/latch model and tests.
- [x] 2e. Powered relay/contact model and tests.
- [x] 2f. Catalog, schema, circuit bridge, live rendering/properties, MCU wiring and regression tests.
- [x] 3. Hardware/Code/Debugger/Serial tabs; Monaco multifile editing; project save/load and state preservation tests.
- [x] 4. Restricted Arduino CLI backend, board/port/library discovery, build diagnostics/artifacts and explicit upload consent tests. Compile actual sample sketches when toolchains are obtainable.
- [x] 5. Honest debugger capabilities, GPIO/event inspectors and simulated/physical serial workflow.
- [x] 6. Unit/build/browser checks, sample projects, architecture/component/security/test documentation, progress handoff and completion beep.

## Implementation tasks and acceptance
Each task writes a failing behavior test, runs it, implements the smallest reusable module, and reruns its suite before continuing.
1. `src/models/ds3231.ts`: byte register transaction API; deterministic `advance(timeUs)`. Test BCD read/write, rollover, address/NACK, alarm and lost-power flags.
2. `src/models/mux4067.ts`: `update(timeUs,pins)` with explicit HC/B profiles, break-before-make delay and bidirectional contact output. Test all channels, inhibit, voltage validation and timing.
3. `src/models/motor.ts`: parameterized winding/back-EMF/inertia integration, explicit terminal voltage and driver input. Test acceleration, PWM, reversal and stall.
4. `src/models/ws2812.ts`: timestamped logic edges, bounded GRB shift register and reset latch. Test two-pixel frame, invalid pulses, brightness and reset timing.
5. `src/models/relay.ts`: supply/logic validation, delayed contacts and current estimation. Test active polarity, delay, loss of power and contact continuity.
6. `src/models/circuitRuntime.ts`: injected pin voltages and MCU edges -> bounded component snapshots/contacts/I2C devices; workers advance on actual CPU time. Test wired propagation, unpowered/floating behavior and schema roundtrip. Engine injects I2C bus callbacks and UART RX without UI dependency.
7. `src/ide/*`: workspace persistence, board profiles, toolchain client, editor/debug/serial panels. Keep hardware mounted across tab switches. Test multifile/project validation, capability disabling, tab preservation and serial controls.
8. Backend `src/*`: fixed command runner and authenticated HTTP service. Test path traversal, origin/auth, upload authorization/replay, build failure and port validation using explicitly marked runner test doubles. Real compilation is separately exercised.
9. Run frontend/engine/backend suites, asset verification, builds and Playwright. Review final changes against this checklist; document unsupported requirements precisely.

## Execution ledger
- Five pure models implemented/tested sequentially, then added to catalog/schema1.2, pin handles, rendering, inspector and actual-clock Worker host. Generic ComponentModel factories are injected into CircuitRuntime for reuse.
- Native/in-session execution on feature/components-ide in each repo; user explicitly requested implementation without stopping at a plan. No commits/pushes/deployment.
- Engine0.4 supports injected TWI, real UART RX, actual instruction/register debugging and synchronous GPIO/PIN/TWI hooks. New compiled fixtures cover timer0/2, PWM, UART and RTC/mux input propagation; original fixtures untouched.
- Reviewed fixes: discard obsolete asynchronous builds; propagate external device levels before real MCU reads; require all WS2812 chain stages powered and reject conflicting data voltages. Watched regressions fail then pass.
- UI tests found and fixed hidden XYFlow space interception, delayed controlled-text overwrite during fast Monaco typing, resize-related hardware button obstruction and duplicate hidden GPIO test identifiers.
- Frontend97 tests and build pass. Development15 browser tests pass, including actual CLI compilation and compiled component-laboratory motor/RGB/RTC behavior; production gate is in progress.
- Official CLI1.5.1 SHA256 verified, AVR1.8.6 and ESP32 core3.3.8 installed locally. Uno and original ESP32 samples have compiled successfully. First cold ESP32 build exposed CLI and Node HTTP timeouts; runner now has a bounded600second timeout, tree termination,8 jobs and reusable per-board caches, and verification uses Node HTTP with a matching timeout. S3/N16R8 compile gates are running.
- Physical gates remain open: identified board, upload/parity, USB serial and OpenOCD/GDB. COM3/COM4 were discovered without board identification; none was flashed. S3 external I2C/waveform hooks, original ESP32 execution, source/DWARF debugging, full analog solving and optional encoders remain unsupported.

## Final handoff
- Frontend/engine version0.4.0; all five device models, powered H-bridge, reusable factory interface, all-device laboratory, persistent four-tab Monaco IDE, compile/library/upload-consent companion, capability-gated debugging and simulated/Web Serial interfaces delivered.
- All4 board compile profiles passed, including the correctly configured compatible N16R8 profile. Generic S3 and N16R8-built Arduino binaries actually booted and drove UART/GPIO4; firmware hashes and UART evidence recorded. Generic S3 browser test passed. Full capacity/physical hardware remain explicitly unverified.
- Software tests: frontend99, engine19, ESP adapter5 and backend2 pass. Development15 full-suite cases plus an additional actual Arduino S3 browser case passed. Final production10/10 passed, including the Arduino S3 image. Builds, asset/fixture/tarball hashes and npm audits passed.
- Physical gates are excluded from software completion: COM3/COM4 not identified as verified MCU boards; no upload or physical serial/debug test. Original ESP32 execution, S3 external I2C/waveform hooks, source debugging, optional encoder and full analog/safety modeling remain unsupported and documented.
- No commit/push/deployment performed. Each repository progress.md updated.

Final gate: production10/10 passed after the final0.4 build and artifact install. All4 compile profiles passed. Both generic/N16R8-compatible S3 Arduino images booted with actual GPIO4/UART evidence. Physical/unsupported gates remain as listed above.
