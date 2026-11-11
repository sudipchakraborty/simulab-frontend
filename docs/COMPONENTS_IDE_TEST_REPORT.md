# Components and integrated IDE verification

Date: 2026-11-06. Work is local on `feature/components-ide` in all three repositories. No commit, push, deployment or physical upload was performed.

## Software results

| Check | Observed result |
| --- | --- |
| Frontend `npm.cmd test` | 99/99 tests passed |
| Frontend `npm.cmd run build` | Passed; local AVR/S3/editor Workers emitted |
| `npm.cmd run verify:assets` | Passed official emulator/reference firmware, original AVR fixtures, added test-fixture hashes and engine tarball/lockfile integrity |
| Frontend dependency audit | Zero reported vulnerabilities after DOMPurify3.4.17 override |
| Engine unit suite/build | 19/19 passed; strict TypeScript build passed |
| ESP adapter/binding tests | 5/5 passed |
| Real S3 boot/GPIO scripts | Passed actual MicroPython ROM boot, GPIO input/output, UART and timer evidence |
| Backend HTTP/security suite | 2/2 passed; fixed-runner test double explicitly identified in the tests |
| Backend dependency audit | Zero reported vulnerabilities; no npm runtime dependencies |
| Development Chromium | Full15-case suite passed, plus the additional Arduino-compiled S3 browser case |
| Production Chromium | Final10/10 passed on isolated preview port5176, including actual Arduino S3 firmware, Monaco/Worker assets and real compilation |
| Final visual check | Running seven-part laboratory inspected: motor movement/RPM/current, RTC properties, relay contacts, RGB color and highlighted mux channel |

Monaco remains a relatively large lazy-loaded chunk (~2.8MB uncompressed); Vite reports a size warning. The editor and its Worker load locally on first code-tab visit. Build status is actual process completion with retained logs, not a fabricated percentage.

## Device evidence

- DS3231: BCD addressed transactions, deterministic leap-day/calendar progression, 12-hour encoding, OSF/status clear and alarm interrupt tests. Real AVR-GCC firmware reads the wired model's BCD seconds through AVR TWI; no host Arduino-function interpreter.
- Multiplexer: all16 channels, active-low enable, HC/B voltage profiles, nominal propagation delay, voltage-range rejection and bidirectional rail routing. Compiled firmware switches from C0=GND to C1=5V, waits5µs and successfully reads the MCU input. This regression failed before input-read clock synchronization was implemented.
- Motor: acceleration, PWM duty response, reversal, stopping and stall-current/torque tests. Direct D3 and A0 GPIO power are both rejected; a powered H-bridge is required. The actual compiled laboratory sketch produces motor motion/RPM.
- WS2812B: timed GRB, two-pixel consumption, downstream chain offsets, reset/latch, brightness, malformed pulses and monotonic-time tests. Unpowered upstream strips and conflicting signal drivers block downstream data. Actual Adafruit NeoPixel1.15.5 firmware drives the rendered laboratory pixel red/blue through cycle-timed AVR edges.
- Relay: active-high/low, profile-specific3.3V compatibility, delay, power loss, energized/NC/NO contact continuity and current-estimate tests. Laboratory firmware toggles the real model through a wired control pin.

The pure modules are behavioral approximations, not an analog/thermal/current safety solver. RTC SQW/32K are sampled levels; pulse-accurate autonomous RTC interrupt scheduling is not verified. S3 contact/input propagation is sampled and cannot establish pulse-sensitive or floating-node electrical parity. No motor encoder variant is implemented.

## IDE/toolchain evidence

Tests preserve circuit, zoom, simulation session, UART history and fast-typed multifile code across main tabs. Portable saves round-trip source/circuit/cursors/requested breakpoints. Source changes during an asynchronous compile invalidate the obsolete result. Authorization checks cover origin/host/token, source traversal/reserved names/size, board allowlists, detected-board mismatch, library allowlists, upload consent and replay.

Actual Arduino CLI1.5.1 was downloaded from the official release and SHA256-verified. AVR core1.8.6 and ESP32 core3.3.8 are locally installed. Uno sample compilation, real AVR execution of its artifact, intentional compiler failure with mapped diagnostics, library installation and serial-port discovery passed. All four compile profiles passed: Uno, original ESP32 DevKit, ESP32-S3 DevKit and the generic-compatible YD N16R8 profile (16MB flash/OPI PSRAM). Both S3 Arduino-built images actually booted the S3 ROM, printed their UART marker and drove GPIO4 HIGH/LOW in the emulator; reports include firmware SHA256. The generic S3 image also passed an additional browser UART/LED check without an AVR Worker. These are example-specific results, not arbitrary firmware or full-capacity memory certification. Evidence is in backend `docs/TOOLCHAIN_REPORT.json` and engine `esp32/arduino-report.json` / `arduino-n16r8-report.json`.

Cold ESP32 compilation exposed a180second CLI timeout and Node fetch's300second header timeout. The companion now bounds jobs at600seconds, terminates the Windows process tree, uses8 parallel compiler jobs and keeps per-board build caches. A trusted host may set SIMULAB_TOOLCHAIN_TIMEOUT_MS up to1800000 for slow cold builds; the client permits that bound. One interrupted S3 core archive omitted its valid main object; reconstructing the cache archive resolved the linker error without modifying firmware. Timed-out jobs now invalidate that archive and preserve their error log. The real verification client uses Node HTTP with a matching timeout. These are local trusted-code builds; this service is not a cloud multiuser compilation sandbox.

## Unverified / unsupported gates

- COM3/COM4 were discovered, without an identified/verified compatible MCU board. No port was flashed. Physical upload verification, USB serial read/write, hardware parity and exact YD revision/module remain untested.
- YD N16R8 uses an explicitly labeled generic S3 compatible compile profile; full emulator16MB flash/OPI PSRAM capacity remains unverified.
- Original ESP32 firmware execution is not installed. Its IDE profile supports toolchain operations only.
- S3 external I2C/DS3231 and WS2812 waveform decoding remain unavailable in the exported emulator binding. Models and rendering do not establish those firmware capabilities.
- Source/DWARF stepping, bound source breakpoints, variable watch, call stack and source execution-line highlighting are unavailable. The IDE disables source controls; Uno instruction stepping/registers are real. OpenOCD/GDB is not connected.
- Full analog solving, mains simulation, relay load-current safety, motor thermal/inductance modeling, arbitrary library/firmware compatibility and live-session serialization are not claimed.

See [component guide](COMPONENT_DEVELOPMENT.md), [IDE guide](INTEGRATED_IDE.md) and backend `README.md` for reproducible commands and configuration.
