# YD-ESP32-S3 implementation plan - 2026-11-05

## Existing architecture
Uno uses a catalog, explicit endpoint circuit schema1.0.0, isolated AVR Worker and versioned @simulab/engine0.2.0. GPIO net/LED projection runs in the Worker. Board rendering and engine capabilities must remain separate. Reuse editor, wires, history, validation, controls and serial monitor; do not map S3 GPIO to AVR registers.

## Ownership
- Metadata specialist: src/boards/** only, manufacturer-sourced44-pin JSON, validation and tests.
- Renderer specialist: src/editor/YdBoardNode.tsx, boardGeometry.ts and its tests only, SVG artwork and rotation-aware handles.
- Emulator specialist: independent engine/esp32/** only, official emulator research/assets/injected adapter and boot evidence; no boot execution until PhaseA acceptance passes.
- Root: existing frontend integration, circuit contract, editor controls, Worker routing, tests/docs/progress and package artifact integration. Backend untouched.

## Phase A - board model first
- Manufacturer family pinout: P1/P2,22 per side, unique physical IDs P1.1..P2.22; GPIO numeric identity is separate.
- Manufacturer confirms GPIO48 WS2812, GPIO0 BOOT, EN reset, nativeUSB19/20, CH343P UART43/44. Available schematicV1.4 does not independently verify every V1.3 detail; flag exact-revision and module-memory uncertainty.
- Machine-readable memory profile defaults unconfirmed; offer N16R8 only as explicit selection requiring module-label confirmation. Reserved35/36/37 reflect octalPSRAM restrictions. Hardware capability metadata is not emulator support.
- Circuit schema1.1.0 addsYD kind; retain1.0.0 import/export for existingUno projects. Old readers reject1.1 explicitly. Physical pin IDs are stable across movement/rotation; declared internal rail aliases connect repeated power/GND pins.
- Acceptance:44 labeled handles, two22-pin rows, exactGPIO map, metadata/parser tests, rotated handle positions, drag/snap/shared pin/junction/crossing/import regression, existingUno tests and build.

## Phase B - genuine boot after A
Verify pinned official Espressif ESP Emulator distribution/API/license. Prefer module Worker/WASM; no AVR fallback. Load a provenance-recorded real ESP32-S3 merged image (bootloader/partitions/application), assert CPU progress and guest UART output. Record firmware version and limits. Native prototype only if browser blocked.

## Later capabilities, independently gated
After real boot, test firmware-origin GPIO/output net propagation and UART/GPIO input where exported APIs permit. Official MicroPython ESP-IDF firmware may be a first boot/reference; any REPL script runs inside actual guest firmware/CPU, never a host Arduino/Python recognizer. RGB/RMT and DS1307/I2C require real exported device hooks and communication tests; mark blocked if absent. Do not invent peripheral success.

## Runtime boundary
Engine adapter initialized by injected WASM binding and target-specific binary. Exposes lifecycle, capabilities, timestamped GPIO/UART batches and digital input; unsupported calls throw explicit errors. Browser ownership/limits/stale-message rules remain. Exactly one supported MCU per running circuit; mixed circuits cannot silently select AVR forS3. Firmware target/format/capabilities are visible in UI.

## Verification and documentation
Run unit/build/browser regressions, then genuine boot, production Worker test and review. Create ESP32-S3-BOARD.md, ESP32-S3-EMULATOR.md, ESP32-S3-FIRMWARE.md, ESP32-S3-TEST-REPORT.md, MCU-COMPATIBILITY.md. Report board/boot/GPIO/input/UART/peripheral gates separately. Update every changed repository progress; no commits/pushes/deployment requested for this task.
