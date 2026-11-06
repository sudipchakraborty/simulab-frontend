# Development

## Windows 11 / VS Code

Use Node.js 24 LTS. Select the frontend as the terminal working directory:

```powershell
cd D:\PROJECTS\Simulab\simulab-frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1
```

`npm.cmd` avoids PowerShell execution-policy issues with the `.ps1` shim. Use the actual URL Vite prints if its default port is occupied. Stop with Ctrl+C.

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

Build generates `dist`; preview serves production assets locally and is not a SaaS deployment.

## Ubuntu / WSL

WSL is optional in Phase 1. Use Linux Node.js and a Linux checkout; do not share `node_modules` between Windows and Linux.

```bash
npm ci
npm run dev -- --host 127.0.0.1
npm run test
npm run build
```

Native emulator toolchains may require WSL/containers later. Phase 1 does not establish that any native emulator compiles to WebAssembly.

## Workflow

Read `AGENTS.md`, `progress.md` and contracts. Add regression tests before changing connectivity/import behavior. Keep circuit modules independent of frontend frameworks. Run unit tests/build and relevant browser checks, then record actual outcomes and limitations in `progress.md`.

No sibling repository edits, remotes, commits/pushes, purchases or deployments without explicit authorization.

## Phase 2 setup and artifacts

`npm.cmd ci` installs the checked-in versioned engine tarball and its pinned AVR8js dependency. Running the app does not require the engine checkout. To change engine code, work and test in simulab-engine, build, pack a new versioned artifact, copy/pack it into frontend vendor/, install that artifact and commit the corresponding lockfile only when authorized. Contracts must be documented before interface changes.

Compiled sample assets are under public/firmware/. They originate from engine/firmware C+ELF+HEX with compiler/archive hashes in metadata.json. Rebuild with the engine's scripts/setup-avr-toolchain.ps1 and scripts/build-firmware.mjs if needed; the compiler stays local/ignored. WSL is optional for an existing compatible avr-gcc toolchain; it is not required for this browser adapter.

The dev server pre-bundles the engine and avr8js to prevent first-use Worker imports from triggering a full-page dependency reload. Browser acceptance uses port5174, separate from normal interactive port5173. A production build emits a separate Worker asset.

## Current ESP32-S3 setup

The current engine artifact is vendor/simulab-engine-0.3.0.tgz. Earlier artifacts remain for history. Official0.51.0 JS/WASM/license and the MicroPython reference image are included locally, so running the app needs no ESP-IDF install or backend.

For engine tests, run node esp32/setup-assets.mjs in that repository; it validates pinned hashes and downloads only to ignored local cache. Then run build/test/test:esp32/test:esp32:firmware. No system installs are performed. Standard MCU lifecycle methods coexist with the old UnoRuntime API.

Custom ESP-IDF packaging steps, standard-offset constraints, N16R8 limits and unverified Arduino/PlatformIO compatibility are in ESP32-S3-FIRMWARE.md. Project snapshots do not preserve firmware/runtime/flash modifications.
