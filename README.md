# SimuLab circuit studio

React/TypeScript circuit editor with real ArduinoUno and ESP32-S3 firmware execution in separate browser Workers. Current frontend/engine version0.3.0. Board graphics, CPU execution and peripheral support are reported separately.

## Run on Windows11

Install Node.js24 and open this repository in VSCode:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173/ . No backend, WSL, native compiler or cloud service is required for the supplied reference firmware. Versioned engine tarballs, pinnedWASM/license and referenceHEX/BIN assets are included. Custom firmware is compiled externally.

## Use

- Uno: load AVR sample, Start simulation, then Serial monitor. Existing pin/wire/junction/history/export/import behavior remains available.
- YD: **Open YD GPIO4 example**, **Load ESP32-S3 reference**, **Start simulation**, then **Serial monitor**. Wait for MicroPython REPL; use **Send GPIO4 blink program** and **Send GPIO5 button monitor**. These programs execute inside real guest firmware on the emulated Xtensa cores. Hold SW1 to drive the wired input; inspect GPIO states for observed outputs.
- Drag components, connect named pins, rotate the YD board from Inspector, and export/import circuitJSON. Crossed wires do not connect without explicit endpoints/junctions. Circuit edits unload the owning firmware session.
- Exactly one MCU may run per circuit. Wrong binary target/format and unavailable operations produce errors; no alternate MCU or synthetic output is substituted.

## Verified and limited

The YD model exposes44 headers with manufacturer-family metadata. ExactV1.3 revision and installed module marking require confirmation; manufacturer-family dimensions are verified. RGB usesGPIO48 in manufacturer documentation; its waveform simulation and DS1307/I2C device attachment remain unsupported. Reference firmware reports4MiB flash; fullN16R8 memory sizing is not supported by an exported browser control. No physical hardware/analog accuracy claim.

See [MCU compatibility](MCU-COMPATIBILITY.md), [board](ESP32-S3-BOARD.md), [emulator](ESP32-S3-EMULATOR.md), [firmware](ESP32-S3-FIRMWARE.md), [test report](ESP32-S3-TEST-REPORT.md) and [progress](progress.md). Engine0.3 preserves the original UnoRuntime and adds an explicit common facade/S3 adapter.

## Verify

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run test:e2e:production
npm.cmd audit
```

Development browser tests use5174 and production preview tests5175, separate from interactive5173. Build before production tests. See TESTING.md for actual results. No accounts, payments, compilation service, mechanical simulation or deployment is included.
