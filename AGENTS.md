# Contributor instructions

- Stay within the authorized repository. Backend and engine are independent.
- Read and update `progress.md` for substantive changes. Create it when absent; record actual commands, outcomes and a clear handoff.
- Prefer reusable modules initialized through parameters; keep domain logic independent of React/XYFlow.
- Use strict TypeScript and Doxygen-compatible public documentation comments (`/** ... */`, `@param`, `@returns`).
- Preserve schema `1.0.0` or document an explicit versioned migration before changing public data.
- Wires connect identified pins/junctions, never drawing intersections alone.
- Test shared pins, branches, separate crossings, imports and persistence when changing connectivity.
- Clearly label editor/demo functionality. Claim firmware execution only with real emulator/compiled binary evidence; never silently fall back.
- Do not create repos, commit/push, deploy, purchase resources or add payments without authorization.
- Verify unit tests, build and relevant browser interactions before completion claims; report failures/unverified behavior.
- Give an audible completion beep when supported. Do not claim an unsuccessful sound command was audible.

See `docs/PHASE1_PLAN.md`, `docs/CONTRACTS.md`, `ARCHITECTURE.md` and `TESTING.md`.
