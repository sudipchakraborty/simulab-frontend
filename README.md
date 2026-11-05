# SimuLab frontend

Modular React circuit studio with real AVR firmware execution in an isolated browser Worker. Phase1 circuit editing remains available without firmware. Phase2 integrates ATmega328P instruction execution using pinned AVR8js0.21.1 through independently packaged `@simulab/engine`0.2.0.

## Run on Windows11

Install Node.js24 LTS and open this repository in VS Code:

```powershell
cd D:\PROJECTS\Simulab\simulab-frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173/ . No backend, WSL, Docker or compiler installation is needed to run checked-in firmware samples. The versioned engine tarball under vendor/ and compiled HEX under public/firmware/ are included; there are no sibling source imports. Custom firmware must be compiled externally for ATmega328P/16MHz and uploaded as Intel HEX. Compiler setup/rebuild instructions are in the independent engine repository.

## Circuit and firmware workflow

1. Drag components onto the grid. Click two pins or drag between them to connect; common pins accept multiple wires.
2. Double-click a wire for an explicit junction. Geometric crossings never connect electrically.
3. Use Open/Export for circuit JSON and inspector/undo/redo for edits.
4. Click **Load AVR sample**, then **Start simulation**. The sample executes actual Timer1 interrupt firmware and toggles D13 every250ms of simulation time.
5. Open **Serial monitor** for firmware-generated UART output. Pause/resume/stop/reset controls operate the CPU session. Reset clears CPU time/output; start reruns the loaded firmware.
6. Upload another compatible HEX with **Upload HEX**. Editing circuit topology/properties unloads execution; reload firmware for the changed circuit.

DEMO MODE means no firmware execution. AVR EXECUTION appears only while a genuine engine session is running or paused. LED rendering follows actual GPIO through explicit wires/resistors, with a simplified digital model rather than analog accuracy. Sample binaries and their provenance are under public/firmware/.

## Verify

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd audit
```

Browser tests use isolated port5174. See TESTING.md for actual results and limits, DEVELOPMENT.md for setup, ARCHITECTURE.md for boundaries and progress.md for handoff. All required project docs remain present.

## Limits and next gate

Physical hardware comparison remains pending. No Mega/ESP32, in-app compilation, cloud persistence, accounts, payments, analog solver or mechanical simulation. Rotation rendering/manual wire segment editing remain deferred. Browser input to MCU through interactive buttons and advanced peripherals need dedicated integration tests. See EMULATOR_COMPATIBILITY.md before loading arbitrary sketches.

Final Phase2 checks: frontend45 unit/component tests, engine15 tests, Chromium8 development and3 production firmware checks passed. Both builds passed and audits reported zero vulnerabilities. Physical hardware comparison remains pending.
