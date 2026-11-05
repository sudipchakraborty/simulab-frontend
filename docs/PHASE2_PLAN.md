# Phase 2 implementation plan - 2026-11-05

## Scope and decision
Implement real ATmega328P firmware execution in a Worker, compiled Intel HEX upload, digital GPIO to explicit circuit nets, behavioral LED and UART TX monitor. Use AVR8js as an existing instruction emulator adapter; it is JavaScript rather than WebAssembly. No CPU implementation in React and no simulated Arduino-function recognition. simavr native integration, Mega/ESP32, analog solving, compilation service and hardware certification remain outside this increment.

## Repository contract before integration
Engine package @simulab/engine version 0.2.0 exports UnoRuntime and public types. The independently built package is distributed as a versioned npm tarball, never sibling source imports. The frontend consumes the artifact and runs it only inside a Worker. Contract version 1.0.0 and exact capabilities are documented in engine/docs/CONTRACTS.md and mirrored in frontend docs.

UnoRuntime public contract:
- constructor(hex:string)
- start(), pause(), resume(), stop(), reset(): void
- runCycles(budget:number): RuntimeSnapshot
- setPin(pin:string,value:boolean):void (digital input only)
- snapshot():RuntimeSnapshot
RuntimeSnapshot: {cycles:number,timeMicros:number,state:'ready'|'running'|'paused'|'stopped',gpio:Record<string,0|1|null>,serial:string,transitions:{pin:string,level:0|1|null,cycle:number}[]}. serial/transitions are drained by snapshot/runCycles; time derives only from CPU cycles at16MHz. Uno pin map D0-D13/A0-A5. UART TX only. Unsupported peripherals/capabilities explicit.

## Ownership
- Engine specialist: simulab-engine/** except firmware/** and scripts/**, framework-independent runtime, bounded HEX parser and tests, package setup/contracts.
- Firmware specialist: simulab-engine/firmware/**, simulab-engine/scripts/** only; local compiler acquisition and actual C compilation, reproducibility/checksums and expected timings. No other paths.
- Root: frontend/**, root progress, integration Worker/projection/UI, package artifacts, regression and browser tests, final review/docs.

## Acceptance and sequence
1. Record upstream version/license and validate compiled fixture provenance.
2. Test-first HEX validation, instruction execution, GPIO/timers/UART and reset/budget/input limits in engine; execute actual compiled fixture.
3. Build engine and distribute a versioned npm tarball. Frontend documents protocol before consuming package.
4. Worker controls load/start/pause/resume/stop/reset; bounded cycle slices and output buffers, timestamped snapshots; terminate on project edits/errors/unmount.
5. Resolve GPIO through explicit endpoint nets and passive resistor paths for simplified LED states; switches feed supported digital inputs; no coordinate-based connectivity or analog accuracy claim.
6. Firmware panel upload/sample, lifecycle controls, simulated-time display and genuine UART output. Editor-only state stays clearly labeled. No silent fallback.
7. Verify engine/frontend unit suites, builds, dependency audit, and browser firmware load, LED toggles, UART, pause/reset/error paths alongside Phase1 regression.
8. Independent code review, documentation/progress updates and completion beep. Physical hardware comparison requires external hardware; do not claim it ran.
