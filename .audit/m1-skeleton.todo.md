# Milestone 1: skeleton + login

## Playbook: Feature

1. `how` over the affected subsystem.
   - n/a: greenfield directory, no existing subsystem. ACCEPTANCE.md and frontend-draft.html are the only inputs.
2. `architect` for parallel design exploration.
   - skip: one small module graph (db / auth / views / app). Design space enumerated below, no code to integrate with.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps: schema + seed + auth primitives before any page renders.
   - Independent workstreams: none that pay for coordination; one delegate owns the whole tree.
   - Shared mutable state: single SQLite file, one writer; no parallel writers.
   - Smallest safe decomposition: one owner, because the feature is smaller than the coordination cost.
4. Delegate code-writing to a subagent with a specific scope.
   - skip worktree: directory is not a git repo. One delegate owns all files, no parallel writer.
5. Verify on the matching surface.
6. Rebase into small, ordered commits.
   - skip: not a git repo, user did not ask for commits.
7. If the design is contested, `interrogate` before shipping.
   - n/a: uncontested.
8. Run **Opening a PR**.
   - n/a: no remote, demo runs locally.

## Design decisions

| Choice | Alternatives | Pick and reason |
| --- | --- | --- |
| Session store | express-session + MemoryStore, connect-sqlite3, own `sessions` table | Own table. Survives restart, no extra dep, ~40 lines. |
| Views | EJS, template literals | Template functions in `src/views.js`. One less dep, one escape helper. |
| Login identity | username only, username + role | Username unique, role stored on the user row. |
| Stub routes | real 404, placeholder page | Placeholder page with 200. Demo should not look broken. |

## Task todos

- [x] package.json, .gitignore, schema + seed
- [x] auth primitives (bcrypt, session table, cookie middleware)
- [x] login page, home, stub pages, styles
- [x] smoke script + README
- [x] verify with npm install, smoke, live curl on 3780
