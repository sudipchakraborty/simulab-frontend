# ESP32-S3 emulator integration

## Distribution and real execution

Official project: [Espressif ESP Emulator](https://github.com/espressif/esp-emulator), release0.51.0, commit `61d71cef2b1f13a936173c6d282a52c093137d6a`, Apache-2.0. The release WASM archive SHA256 matched the official release digest `b411ddf0faa7f213a991344ec0536801d8ea24f1d3dd6aa04be5b64a986e8d2a`.

Pinned JS/WASM and its license are served locally from `public/emulators/esp-emu-0.51.0/`. The engine0.3.0 ESM adapter receives initialized bindings through parameters. It creates `WasmEmulator('esp32s3')`, loads the embedded S3 mask ROM, enables boot-from-ROM and loads a genuine merged flash image. No AVR engine is selected on this path. The browser emulator guide is [upstream BROWSER.md](https://github.com/espressif/esp-emulator/blob/main/docs/guides/BROWSER.md).

The standard engine facade provides loadFirmware, lifecycle, snapshots, GPIO read/input, subscriptions, time and capabilities. Existing UnoRuntime remains exported and unchanged. Budget units differ: AVR cycles versus S3 instructions. S3 time comes from emulator cycles()/cycles_per_us(), not UI timers. Browser processing, GPIO/net/button evaluation and firmware all run in a dedicated module Worker.

## Validated APIs

WasmEmulator, load_default_rom, load_firmware, run_batch, cycles, cycles_per_us, gpio_state, gpio_set_input, uart_input, num_harts and hart_pc were inspected and exercised. Two harts are reported after actual firmware boot. GPIO output words are decoded separately from output-enable words; null means input/Hi-Z, not a guessed input value. Input correctness is checked by guest firmware UART.

GPIO events are sampled at instruction-batch boundaries. They are not instruction-edge traces and cannot establish WS2812 waveform decoding. Browser API presence is distinct from independently tested capability. See engine `esp32/boot-report.json`, `gpio-report.json` and asset-manifest.json.

## Boundaries and unsupported behavior

- One MCU per running circuit; mixed Uno/S3 circuits are rejected. Target-specific Worker/files cannot silently fall back.
- Standard merged image profile only: S3 chipID9, bootloader0, partition table0x8000, app0x10000. Input resource limit16MiB is not a claim of16MiB emulated flash.
- **Reference firmware reports4MiB flash. Full N16R8 sizing is not supported by an exported browser setter.** Physical memory profile metadata is separate from this emulator limitation.
- No external I2C/SPI/RMT/device callback is exposed. DS1307 and WS2812 RGB are not implemented; built-in internal models do not establish an external circuit device connection.
- Reset/restart reloads the original image and discards emulated filesystem/flash changes. EN/BOOT download-mode hardware parity is unverified.
- Sessions pause at60 simulated seconds. Firmware, batches, serial history, event buffers and watchdog timeouts are bounded. A Worker trap/timeout is surfaced as an error.
- No network bridge, WiFi/BLE host connectivity, USB traffic, analog voltage/current or physical hardware validation is claimed. No cloud/backend execution is used.

A native fallback was not required for genuine boot/GPIO/UART because browser integration succeeded. A future native path may expose explicit memory-size flags, but no native16MB test was performed here.
