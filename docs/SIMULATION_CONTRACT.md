# Simulation integration contracts - 1.0.0

Engine package @simulab/engine 0.2.0 is independently built/distributed; no sibling source imports. See PHASE2_PLAN.md for exact runtime signatures. ATmega328P, 16MHz, Intel HEX only. AVR8js executes actual instructions; no source-code interpreter/fallback.

Frontend Worker commands {version:'1.0.0',id:number,type:'load',hex:string}, type start/pause/resume/stop/reset, or type input with pin:string,value:boolean. Replies {version:'1.0.0',id:number,type:'snapshot',snapshot:RuntimeSnapshot} or type error with message:string. Periodic snapshot replies id0. Commands with wrong versions/types are rejected. Lifecycle errors are explicit. Pin/time/serial state originates in engine. Engine UART TX, GPIO and core timers are tested before publishing capabilities; no I2C/SPI/ADC claims until independent tests.

Firmware files bounded to 128KiB ASCII HEX text, max32KiB flash. CPU slices bounded; serial/transition histories bounded. Firmware stays browser-local and is never evaluated as JavaScript or sent to a server. One supported Uno per running circuit. Stop simulation before topology/property edits; stale Worker messages must not affect a replacement session.

LED projection is a deterministic behavioral digital model through explicit wires and resistors, requires a supported HIGH-to-GND path and does not compute voltage/current. Crossings do not connect. No short-circuit safety/physical accuracy claim.

### Worker-owned component projection

Load commands also carry `project:CircuitProject` (schema1.0.0). The Worker revalidates it and runs digital net/LED projection alongside the CPU, off the React thread. Snapshot replies include `projection:{ledStates:Record<string,boolean|null>,issues:string[]}` in addition to the independent engine's RuntimeSnapshot. React displays these states and does not run component simulation. A document edit terminates the owning Worker rather than mutating a running netlist.

## ESP32-S3 extension (protocol1.1.0)
A separate ESP32 Worker uses the actual official Espressif0.51.0 JS/WASM assets through @simulab/engine0.3.0/esp32. AVR commands stay on the existing AVR Worker. load-esp carries a bounded ArrayBuffer merged flash image plus a validated circuit. UART input/button commands are new operations; the AVR adapter rejects unsupported UART RX explicitly. Exactly one MCU board is allowed per session; mixed-board circuits never fall back to AVR.
GPIO snapshot keys are MCU-native (D13 forUno, GPIO4 forS3), converted to physical YD header IDs only by board metadata. Electrical projection includes declared internal rails and ideal button contacts. Binary/HEX are different formats and targets; no implicit conversion. Output/time/serial/projection snapshots remain versioned. RGB/WS2812 and external I2C device hooks are unsupported despite upstream internal peripheral models. Snapshot diagnostics may include actual Xtensa hart/program-counter state.
