# Group editing, blank projects and design compile/run

## Proposed user behavior
- Drag a rectangle on empty canvas to select multiple components/wires. Shift adds to selection; Space+drag pans. Dragging a selected component moves the selected group in one undoable operation.
- Select all, Copy, Paste/Duplicate and Delete selection controls; standard Ctrl/Cmd+A/C/V and Delete shortcuts apply only to design editing, not text inputs/Monaco. Copies receive new IDs and preserve internal wires/pin identities. Removing components also removes incident wires; Undo restores the operation.
- New project asks before discarding current work, then starts with a blank circuit and fresh minimal Arduino sketch (pending user choice below). It stops execution and clears stale build/history state while retaining appearance and compiler pairing. Clipboard can be pasted into a new project.
- Select all highlights the design. Delete all opens a confirmation containing component/wire counts; cancellation changes nothing. Confirmed deletion is undoable and keeps source code.
- Visible Run, Pause and Stop on Hardware. Run compiles current editor files via the existing paired local Arduino CLI companion, checks the single circuit MCU and matching build profile, attaches target-compatible generated HEX/merged BIN, waits for genuine Worker-ready acknowledgement, then executes it. Errors appear in build output without running stale/reference firmware. Existing explicit reference/file firmware tools remain available separately.
- Pause/Stop control actual execution. Stop during compilation invalidates the requested automatic run so a late build cannot start. Source/target/circuit changes invalidate pending work; no firmware fallback. No physical flashing happens from Run.

## Implementation choices
Reuse XYFlow native rectangle/group selection and the existing history/store, with pure reusable selection/copy/move/delete helpers. Keep selection outside portable project schema; source and topology retain existing validation. A reusable guarded compile/run orchestration tracks operation revisions and Worker readiness; backend compiler/account boundaries stay intact. All edit/run buttons honor current RBAC/subscription capabilities. No new dependencies, commits or deployment.

## Approval
User approved option1: New project resets both circuit and source after confirmation. Approved2026-11-10; proceed with the behaviors above.
