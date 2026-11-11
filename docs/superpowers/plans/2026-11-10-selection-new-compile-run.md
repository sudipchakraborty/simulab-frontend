# Group editing and design compile/run implementation plan

**Goal:** Implement approved drag group edits, confirmed blank project/delete-all, and real editor compile/load/run from Hardware.
**Spec:** 2026-11-10-selection-new-compile-run-design.md (option1 approved).
**Architecture:** Pure topology-safe selection clipboard/move/delete helpers plus host-supplied React actions/confirmation; existing XYFlow group selection/history. Independent guarded IDE compile/run and target Worker auto-start-on-ready; no simulated compiler output.
**Constraints:** Existing RBAC/trial policies, target validation, undo/redo, reusable modules/Doxygen, no dependencies/commits/deploy; progress root/frontend. Typing/Monaco shortcuts remain untouched.

- [x] RED/GREEN pure selection helpers: subgraph remap, no dangling wires, bounded group movement, undoable deletion; add blank project/store reset.
- [x] Selection UI: native drag rectangle, Shift add, Space pan, group drag commit, toolbar and scoped shortcuts; confirmation dialog with Cancel/confirm; New project clears code and circuit but keeps appearance/compiler pairing.
- [x] IDE domain (separate ownership): useIde.runDesign/stopDesign/newProject; compile latest source against actual circuit target, discard stale jobs on changes/Stop; useSimulation.load optional autoStart only after genuine ready acknowledgement. Existing manual firmware flows retained.
- [x] Parent integrates Run/Pause/Stop plus pairing/error notice on Hardware; pending Stop prevents late start; new project calls store.reset and ide.newProject(blank).
- [x] Focused regressions and browser group rectangle/move/copy/paste/delete/undo/cancel/new workflows; test actual CLI source-to-Worker execution (not only mocks).
- [x] Fresh review, final unit/build/browser checks, progress/README and completion beep.

## Ownership and interfaces
Parent: src/circuit/selection*, project blank factory, editor/store, App, editor selection controls/dialog, SimulationControls presentation, browser selection tests.
Compile agent: src/ide/useIde.tsx and focused tests/new modules, src/ide/workspace.ts blankSketch, src/simulation/useSimulation.ts/tests. No App/SimulationControls/store edits.
Compile API: runDesign():Promise<void>; stopDesign():void; newProject(circuit:CircuitProject):void (updates IDE only, parent resets store); paired/busy/log/result retained. load(firmware,name,options?:{autoStart?:boolean}) retains manual compatibility. New source uses blankSketch setup/loop. Compiler pairing persists, pending jobs and consent do not.

Final gate:168 frontend tests, strict TS/Vite build and32/32 production browser scenarios passed (no skips), including genuine CLI compilation and existing AVR/S3 flows. Review fixes and exact evidence are in progress.md.
