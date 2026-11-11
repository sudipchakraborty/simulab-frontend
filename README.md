# SimuLab circuit studio

React/TypeScript circuit editor with real ArduinoUno and ESP32-S3 firmware execution in separate browser Workers. Current frontend/engine version0.5.0. Board graphics, CPU execution and peripheral support are reported separately.

## Run on Windows11

Install Node.js24 and open this repository in VSCode:

```powershell
npm.cmd ci
npm.cmd run dev
```

Start the independent Node account API in `../simulab-backend` first (see [account setup](../simulab-backend/README.account.md)), then open http://127.0.0.1:5173/ . Accounts are required; configure SMTP or explicitly select the private local development outbox. Supplied reference firmware runs entirely in the browser after login. Versioned engine tarballs, pinnedWASM/license and referenceHEX/BIN assets are included. Custom firmware is compiled externally.

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

Development browser tests use5184 and production preview tests5185 with isolated real account APIs on4321/4322, separate from interactive app/account4320. Build before production tests. Test mail/outbox and signed payment events are explicit fixtures. See TESTING.md for actual results. Live email/payment providers and deployment require configuration.

## Hardware components and integrated IDE

Hardware, Code Editor, Debugger and Serial Monitor share one persistent workspace. The library includes DS3231, CD74HC4067/CD4067B, a brushed DC motor with powered H-bridge, WS2812B strips/chains and powered5V relay modules. Use Open component laboratory for a wired Uno example and Load component sketch in Code Editor (install Adafruit NeoPixel from its library menu first).

Run the local companion in ../simulab-backend to compile editor sources and explicitly authorize physical uploads. See [IDE guide](docs/INTEGRATED_IDE.md), [component guide](docs/COMPONENT_DEVELOPMENT.md) and [test report](docs/COMPONENTS_IDE_TEST_REPORT.md). Physical operations and unsupported MCU/debug features are clearly gated; rendering a board does not establish firmware compatibility.

## Accounts, subscriptions, corporate themes and robotics (0.5)
Self-managed signup requires a single-use verification link. Remembered HttpOnly sessions restore login; passwords are never saved in browser storage. Roles are administrator, editor and viewer. Trial starts at verification (30 days configurable); saving, export and autosave require a paid editor/admin entitlement. Server ownership and entitlements enforce project persistence. Choose six light/dark corporate profiles at the top right; authenticated preference is persisted in the backend SYSTEM.json config.

The categorized library adds Nano/Mega2560, voltage/current meters, HX711 load-cell amplifier, DHT22 humidity/temperature sensor, stepper+driver, servo, tactile/electromagnetic switches, six-axis and Universal arms, Dobot Magician, uArm Metal, conveyor, four-wheel car and IR emitter/detector. Models are reusable parameterized educational approximations; see [models and limitations](src/models/README.md). Mega executes its native AVR profile; Nano shares the actual ATmega328P core. ADC and vendor-specific robot protocols remain unsupported.

Billing opens configured QR checkout, keeps submitted references pending, and activates only after validated provider callback or audited administrator approval. Configure price/currency/QR and SMTP before using live delivery or billing. No payment completion is simulated in the product. For current startup, security and verification details see [milestone report](docs/ACCOUNTS_COMPONENTS_REPORT.md).

## Temporary login switch
Edit `public/system-config.json` and refresh the app:

```json
{"loginEnabled": false}
```

`false` opens a separate local workspace directly, with local autosave/export/simulation and paired hardware tools enabled. No account or payment APIs are called; private backend accounts/projects remain protected. Local themes and workspace are stored in the browser separately from authenticated users. Set `loginEnabled` to `true` to restore signup/login and normal subscriptions. Missing/invalid config defaults to enabled login. The file is fetched without caching on each app opening. For a built deployment, edit the served `dist/system-config.json` (or edit public then rebuild). Current temporary setting is false.

## Show, hide and resize workspace panels
Use **Layout** in the small permanent bar at the top right. Toggle **Top toolbar**, **Components**, **Inspector** or **Output**; **Show all panels** restores everything and **Reset layout** restores viewport defaults. Each panel also has an X hide button. The Layout bar stays available even if all panels are hidden.

Drag the grip on the border facing the center to resize. A focused border also supports arrow keys (16px), Shift+arrows (48px), Home (minimum) and End (maximum). Sizes are bounded to keep the workspace usable and saved per local/signed-in workspace in this browser. Hiding a panel preserves circuit/source/simulation state; layout preferences are separate from exported projects. Components and Inspector remain available beside all workspace tabs. Output shows connectivity/netlist/UART under Hardware and build console beside the other tabs. On narrow screens the side panels initially stay hidden and open as overlays when requested.

## Group editing and starting fresh
Drag a rectangle on empty design space to select a group. Shift+click adds/removes members; Space+drag pans instead. Drag a selected group to move it together. Use Select all, Copy/Paste, Duplicate and Delete selected, or Ctrl/Cmd+A/C/V/D and Delete/Backspace while editing Hardware. Text fields and Monaco retain their normal shortcuts. Copied components get fresh identities; connections inside the copied group are retained and external attachments are omitted. Group movement/deletion supports Undo/Redo.

**Delete all** asks for confirmation with item counts, retains editor source, and can be undone. Selecting all components then Delete selected uses the same confirmation. **New project** asks before clearing both circuit and all source files; it starts with no components/wires and one minimal setup/loop sketch, clears old history/builds, and keeps theme/layout and compiler pairing. Save/export first when the current work is needed. Cancel preserves everything.

## Run current code from Hardware
Use **Pair local compiler** once to open the Code Editor pairing controls; start the existing backend companion and enter its private terminal token. Then **Run code** on Hardware compiles current editor files for the circuit's single MCU, fetches its generated target-compatible firmware, attaches it to the circuit Worker and starts after the real ready acknowledgement. Pause becomes Resume while paused; Stop halts execution and invalidates pending automatic starts. Compiler errors appear in Hardware's Build output tab. No source is sent to physical hardware by Run code.

Changing source, board, circuit, account permission, starting New, or Stop invalidates pending run work. A compiler request already running in the local companion may finish before another job can begin, but its discarded response cannot start the design. Existing reference/file firmware controls explicitly operate on separately loaded firmware. Missing/multiple MCUs and unsupported/mismatched artifacts fail visibly; no fake output or alternate CPU is substituted.

Manual/reference firmware sessions remain independent of editor-source changes. Explicitly loading a firmware file takes over from pending code-run work, including when the uploaded filename matches a compiler artifact. Worker load-session identity, not filenames, determines ownership. Both toolbar Run and Hardware Run code compile the current editor source.
