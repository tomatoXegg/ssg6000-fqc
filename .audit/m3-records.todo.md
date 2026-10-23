# Milestone 3: records filters

## Playbook: Feature

1. `how` over the affected subsystem.
   - Read ACCEPTANCE.md, README.md, src/app.js, src/inspections.js, src/views.js records section, public/styles.css, scripts/smoke.mjs.
2. `architect` for parallel design exploration.
   - skip: one query builder and one form. Shape follows the existing list route, no new boundary.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps: filter parsing and `listInspections` signature before the form renders.
   - Independent workstreams: none worth splitting. Query, view, CSS, and smoke assertions share the same param names.
   - Shared mutable state: SQLite read-only for this feature, no writer added.
   - Smallest safe decomposition: one owner for parser, query, view, styles, smoke, README.
4. Delegate code-writing to a subagent with a specific scope.
   - skip worktree: not a git repo. One delegate owns all files.
5. Verify on the matching surface.
6. Rebase into small, ordered commits.
   - skip: not a git repo, user did not ask for commits.
7. If the design is contested, `interrogate` before shipping.
   - n/a: filter semantics are stated in the brief.
8. Run **Opening a PR**.
   - n/a: local demo, no remote.

## Design decisions

| Choice | Alternatives | Pick and reason |
| --- | --- | --- |
| Filter transport | JSON API plus client fetch, GET form | Plain GET form. Back button, refresh, and no-JS all work. |
| Matching | exact, prefix, substring | Substring with `LOWER()` on both sides. Matches how staff search by partial SN. |
| SQL safety | string interpolation, parameters | Bound parameters with escaped `%`, `_`, `\`. |
| Result filter | free text, whitelist | Whitelist `pass` / `fail`. Anything else means all. |
| Date range | skip, day granularity | Include. `date(finished_at)` compares ISO days, two extra clauses. |
| Invalid input | 422, ignore | Ignore and show all. A filter typo should not look like an error. |
| Indexes | add, skip | Skip. `%x%` cannot use a B-tree index, and the demo table is tiny. |
| Pagination | add, fixed cap | Fixed 50 with a visible note. Pagination is not in ACCEPTANCE.md. |

## Task todos

- [x] filter parser at the `/records` boundary
  - `src/filters.js`: trim, 64-char cap, result whitelist, real calendar dates.
- [x] parameterized `listInspections(db, filters, limit)`
  - Bound params only. `%`, `_`, `\` escaped for `LIKE ... ESCAPE`.
- [x] filter form, active values, clear link, two empty states
  - Plain GET form. Empty state differs by whether a filter is active.
- [x] filter styles matching SIGLENT tokens
  - 5 columns desktop, 2 at 800, 1 at 480. No horizontal overflow.
- [x] smoke cases for each filter, empty result, invalid input, injection
  - Checks 23 to 33. `npm run smoke` prints `SMOKE PASS`.
- [x] independent verify: smoke and live 3780
  - 25 HTTP/DB edge checks passed on a temp DB and port, including literal
    `%` / `_`, date boundaries, XSS echo, repeated params, 51-row cap.
  - Chrome CDP passed 14 UI checks at 1280, 800, and 480 widths, including
    submit navigation and the clear link. No console errors.
