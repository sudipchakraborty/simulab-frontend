# ESP32-S3 acceptance report - 2026-11-05

| Gate | Actual result | Evidence / limitation |
| --- | --- | --- |
| Board graphics/pinout | Implemented and tested |44 physical handles,2x22 rows, manufacturer-family mapping, stable IDs, tooltips, movement, rotation, rail aliases and JSON1.1 |
| Exact2022-V1.3 hardware | Requires confirmation | Available manufacturer schematic isV1.4; actual module marking unconfirmed; manufacturer-family dimensions verified |
| TestA real firmware boot | PASS | Official ESP-EMU0.51WASM booted MicroPython1.29 S3 Octal-SPIRAM from S3 mask ROM;15219369 cycles recorded, actual UART prompt, two reported harts |
| TestB GPIO LED | PASS | Guest Pin/Timer drives GPIO4; external LED follows explicit resistor/net. Sampled interval about248.8ms versus250ms requested |
| TestC onboard RGB | BLOCKED / not implemented | GPIO48 mapping verified at family level, but no exported RMT/WS2812 waveform/device hook. Neutral RGB artwork only |
| TestD GPIO input/UART | PASS | Actual GPIO5 low/high reads and guest UART; browser wired SW1 press/release drives these inputs |
| TestE DS1307 | BLOCKED / not implemented | No external I2C slave callback; no real firmware transaction with a0x68 RTC, therefore no pass claim |
| N16R8 memory capacity | NOT VALIDATED | Physical profile describes16MB/8MB; reference guest reports4MiB flash and8311216 bytes free heap. Browser memory-size override absent |
| Physical hardware parity | NOT PERFORMED | No physical board measurements, analog accuracy or industrial safety claim |

## Executed checks and evidence

PhaseA was validated first: build,62 frontend tests and9 Chromium tests including all existingUno/editor flows passed before genuine S3 instruction execution. Engine `esp32/boot-report.json`, `gpio-report.json` retain actual UART/cycle/diagnostic/memory evidence. Engine setup validates pinned asset hashes. Contract-only test doubles are explicitly labeled and do not establish firmware success.

The browser firmware test subsequently passed genuine S3 ROM/REPL boot, GPIO4 LED through resistor/net, GPIO5 wired-button input and UART, pause/reset, visible board and rejection of AVR HEX. It also verifies that no AVR Worker was requested. Final full unit/build/development and production test counts are recorded in progress.md after verification.

Test commands: frontend `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:e2e:production`; engine `npm.cmd run build`, `npm.cmd test`, `npm.cmd run test:esp32`, `npm.cmd run test:esp32:firmware`. Chromium is the automated browser target; other browsers/touch hardware are unverified.

Reset restores the original flash image; runtime filesystem changes are discarded. GPIO subscriptions are batch samples. BOOT normal GPIO input, ROM download-mode strapping and externally wired EN must not be conflated. Advanced IDF/Arduino peripherals and arbitrary images require separate fixtures.

## Final validation 2026-11-06

Frontend71/71, engine17/17, ESP adapter/binding5/5, development browser11/11 and production browser5/5 passed. Both builds and dependency audits passed; zero reported vulnerabilities. Required source and binary provenance is checked by verify:assets. ExactV1.3 revision/fullN16R8 capacity, RGB and DS1307 remain explicitly open rather than passed.
