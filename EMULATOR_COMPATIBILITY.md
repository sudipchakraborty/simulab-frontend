# Emulator compatibility - Phase 2

## Selected browser adapter

**AVR8js 0.21.1**, pinned MIT dependency of `@simulab/engine`0.2.0. Upstream: https://github.com/wokwi/avr8js . Executes compiled AVR machine instructions; it does not interpret Arduino functions. It is JavaScript running in a module Web Worker, not a WebAssembly build. Engine code has no React or Node host dependency. The frontend consumes a versioned npm tarball, not sibling sources.

simavr remains a native candidate: https://github.com/buserror/simavr . Upstream identifies GPL-3.0 and Linux/macOS native usage. Its browser/WASM feasibility and redistribution implications were not assumed or solved here. Renode and the Espressif emulator remain unevaluated future candidates; no Mega or ESP32 support is claimed.

## Verified scope

| Capability | Result |
| --- | --- |
| ATmega328P, 16MHz,32KiB flash/2KiB SRAM | AVR-GCC compiled fixtures executed |
| GPIO mapping | D13/PB5 and D12/PB4 independent binaries tested |
| Digital input | D2 read through PIN register and mirrored to D11 by compiled firmware, engine API test |
| Timer1 CTC interrupt | Observed GPIO edges at cycles4,000,163 and8,000,163; exact4,000,000-cycle interval |
| UART0 TX | Actual firmware produced startup/LED messages through emulator UART callbacks |
| Lifecycle | Pause/resume/stop/reset/restart and deterministic reset tested |
| Browser execution | Worker build and Chromium firmware/LED/UART interaction tests passed |
| LED integration | Explicit wires, resistor paths and GPIO drive a simplified digital display model |

Reference timing: prescaler256 * (OCR1A15624+1) /16MHz =250ms. See [Microchip datasheet](https://ww1.microchip.com/downloads/en/devicedoc/atmel-7810-automotive-microcontrollers-atmega328p_datasheet.pdf), engine `docs/AVR_VERIFICATION.json` and `firmware/metadata.json` for measured emulator output, source/compiler/ELF/HEX hashes and commands. Official Arduino AVR-GCC7.3.0 archive SHA256 was verified before local extraction. Toolchain was not installed system-wide or bundled into the application.

## Explicit limitations

- **No physical Uno comparison was performed.** Register-derived timing expectations are a reference, not hardware measurements. Hardware parity remains an open Phase2 gate.
- Only the supplied fixtures and covered behaviors are verified. This is not universal Arduino sketch compatibility.
- HEX only; ELF/raw flash/source uploads and in-app compilation are absent. HEX has no reliable chip identity, so users must compile for ATmega328P at16MHz.
- Timer0/2 configured but unverified. PWM, I2C, SPI, ADC, UART RX, EEPROM, watchdog, sleep, bootloader/fuses and clock scaling are unsupported or unverified. Do not infer support from AVR8js upstream modules alone.
- UART output is logical transmitted bytes, not a D1 electrical waveform. Digital inputs are engine API only; the editor button's properties are not yet a live MCU input control.
- No analog voltage/current calculation, LED current limiting validation or industrial safety claim. Host execution is paced; cycle time is deterministic but wall-clock speed is not guaranteed real time.
- Browser session automatically pauses at60 simulated seconds; reset before another run. Worker cycle slices, firmware text, event/serial buffers and UI histories are bounded; unresponsive workers terminate explicitly.
- Circuit edits unload the Worker session; project JSON preserves circuits, not firmware/runtime state. No server receives firmware.

## Attribution and future adoption gates

AVR8js's MIT notice is included in the engine package THIRD_PARTY_NOTICES.md. Direct dependency licenses are tracked in docs/DEPENDENCIES.md; project distribution license has not been selected. Before exposing more capabilities, add compiled firmware and independent tests for each target/peripheral. Never substitute Uno execution for Mega or ESP32-S3.
