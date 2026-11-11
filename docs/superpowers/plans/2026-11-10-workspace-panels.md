# Workspace Panels Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. No commits or pushes authorized.

**Goal:** Show/hide/resize all four fixed edge panels with restoration and persistence.
**Architecture:** Parameterized DockPanel and accessible ResizeHandle, pure validated layout preferences and an injected-storage React hook; integrate without unmounting editor content.
**Tech Stack:** Existing React/TypeScript/CSS/Vitest/Playwright; no new packages.
**Spec:** 2026-11-10-workspace-panels-design.md (user approved option1).

## Constraints and review focus
- Preserve account gates, trial restrictions, runtime state and circuit schema.
- Always-visible Layout menu remains reachable when every pane is hidden; show-all/reset escape route.
- Invalid/blocked storage falls back; account-specific keys; bounds keep canvas accessible.
- Drag sign differs for right/bottom; pointer cancel/unmount clears resize; keyboard and narrow viewports work.
- Hidden panes stay mounted, theme styles remain consistent, code/build output remains usable.

## Steps
- [x] Write failing tests for layout corruption/bounds and four-edge keyboard/pointer resizing with hide/show state preservation.
- [x] Implement src/layout/{model.ts,useWorkspaceLayout.ts,DockPanel.tsx,LayoutMenu.tsx,layout.css} with Doxygen comments.
- [x] Integrate App.tsx and IdePanels.tsx, preserving current children and identity isolation.
- [x] Add browser scenarios for hide/restore-all, dragging four edges, reload/reset, code retention and narrow viewport recovery.
- [x] Run unit/build/browser gates; inspect screenshots; record review fixes, update frontend/root progress and completion beep.

Final evidence:147 unit tests, production build and17 targeted production browser tests passed. Independent review regressions were fixed; screenshots reviewed. See progress.md for the handoff.
