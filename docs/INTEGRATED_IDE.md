# Integrated IDE architecture and use

The main workspace has Hardware, Code Editor, Debugger and Serial Monitor tabs. Hardware stays mounted while hidden; the simulation hook stays at App level. Main tab changes do not modify the circuit or restart a Worker. XYFlow keyboard pan/selection bindings are disabled while code is active, so they cannot consume editor input.

Monaco loads on first code-tab visit. Independent models retain source and per-file view states. Monaco owns in-flight text; React stores portable file content/cursors without overwriting pending keystrokes. Replacing/importing a project increments a source revision and reconstructs models deliberately. The editor supports C/C++ tokens, brackets, indentation, find/replace, multiple .ino/.h/.hpp/.cpp/.c files and compiler markers. Conservative indentation formatting preserves raw literals and multiline macros unchanged; it is not a full clang-format implementation.

Save Project / Ctrl+S downloads a validated IDE document containing circuit, board profile, files, active file/tab, cursor positions and requested breakpoints. Open Project restores it. Existing Export/Open circuit actions retain the plain circuit format. Local autosave uses `simulab.ide.v1`; tokens/build artifacts are excluded. Browser storage failure is reported and downloadable save remains available. Circuit schemas1.0/1.1 still load; new components require1.2.

## Build and physical operations

1. In `simulab-backend`, run `npm.cmd run setup:toolchain` (Windows x64), adding `-- --esp32` for all ESP32 tools. Downloads stay in `.local`. Official Arduino CLI checksum is verified; Arduino CLI validates package hashes.
2. Run `npm.cmd start` there. Copy the terminal's fresh pairing token into Code Editor and Connect companion.
3. Choose the fixed board profile; Build compiles the editor files with Arduino CLI. Detailed logs and diagnostics appear in a resizable bottom panel. Requests are bounded and jobs serialized. The CLI's own core/build caches provide available reuse; a percentage is not fabricated while compilation runs.
4. Load build selects a valid HEX or S3 merged image matching the circuit. Run starts actual firmware. ESP32 DevKit is build/upload-only: no original ESP32 execution backend is installed. YD N16R8 selects a generic S3 compatible compile profile with16MB flash/OPI PSRAM; this does not verify the physical module or simulator memory sizing.
5. Refresh ports uses actual Arduino CLI discovery. Select a detected port and check authorization for this exact build before Upload. Service-issued consent expires after60seconds and is single-use. Upload invokes the board core toolchain with verification; success/failure is surfaced from the real process. Source/board changes invalidate build results, including responses still in flight.

Installed libraries can be inspected; the component-library menu installs only server-allowlisted RTClib, Adafruit NeoPixel or FastLED via Arduino Library Manager. Other libraries can be managed locally by the owner using CLI. No shell command field exists.

## Debug/serial boundaries

Uno provides real single-instruction stepping, PC/SP/SREG/R0–R31, GPIO states, logical I2C transaction inspection and cycle-timestamped GPIO/PWM events. Source breakpoints can be stored but are explicitly unbound. Source Step Into/Over/Out, variables, stack and current-line highlighting remain disabled because ELF/DWARF mappings are not integrated. S3 instruction/register/source debugging is disabled. OpenOCD/GDB is not integrated or presented as connected.

Serial Monitor supports simulated UART input/output, display-only pause, clear, auto-scroll, snapshot timestamp labels and text export. Firmware sets simulation baud; the selector configures physical USB baud only. Physical serial uses Web Serial's explicit browser port permission on localhost/HTTPS and supported browsers. It preserves connection/history when switching main tabs. Snapshot timestamps are not per-byte arrival timestamps. Firmware UART history is bounded16KiB; physical display64KiB. Disconnect USB serial before uploading through CLI so the uploader can open the port.

Physical upload/debug/serial read/write require actual connected hardware; a tested authorization protocol is not a physical upload result. Browser tests cover actual Uno source→CLI→artifact→AVR→UART execution. Exact S3 Arduino firmware compatibility must be tested independently of MicroPython boot support; arbitrary ESP32 binaries are not promised.

## Verified Arduino S3 example

Actual Arduino CLI compiled generic S3 and compatible N16R8 examples booted and drove UART/GPIO4 in the real emulator. The generic image also passed a browser LED/UART test. Use `SIMULAB_S3_IMAGE` with tests/arduino-s3.spec.ts to reproduce the image-specific browser case. Full flash/PSRAM address capacity and physical parity are still separate gates. On a slow first ESP32 build, set the trusted companion host environment SIMULAB_TOOLCHAIN_TIMEOUT_MS=1800000 (maximum30minutes); default is10minutes.
