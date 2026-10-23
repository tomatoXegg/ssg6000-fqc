# Milestone 4: closeout

## Playbook: Feature

1. `how` over the affected subsystem.
   - The closeout touches README.md, scripts/smoke.mjs, and the two audit files. No runtime code.
2. `architect` for parallel design exploration.
   - skip: documentation and test additions only.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps: M3 verified before closeout claims are written.
   - Independent workstreams: smoke cases and README can be written in parallel but share the same filter contract, so one owner.
   - Shared mutable state: none.
   - Smallest safe decomposition: one owner.
4. Delegate code-writing to a subagent with a specific scope.
   - The M3 delegate also owns the smoke extension and README update, so the contract stays in one head.
5. Verify on the matching surface.
6. Rebase into small, ordered commits.
   - skip: not a git repo.
7. If the design is contested, `interrogate` before shipping.
   - n/a.
8. Run **Opening a PR**.
   - n/a: local demo.

## Closeout checklist

- [x] smoke covers each M3 filter and the empty state
  - Checks 23 to 33, including echo, invalid result, invalid filter input,
    injection string, and UTC date range.
- [x] smoke still passes every M1 and M2 case
  - Checks 1 to 22 unchanged and passing. `SMOKE PASS`.
- [x] README marks the demo complete through M4 and documents filters
  - Status line, filter table, route params, milestone list.
- [x] README start, accounts, port, and env values match the code
  - `npm start`, 3780, `admin` / `admin123`, `operator` / `op123`,
    `PORT` / `DB_PATH`.
- [x] known limits stated: 50-row cap, UTC day boundary, ASCII case folding, no pagination
  - Also notes the missing full-text index and the demo-only security posture.
