# Milestone 2: checklist + submissions

## Playbook: Feature

1. `how` over the affected subsystem.
   - Read ACCEPTANCE.md, the SOP sections in frontend-draft.html (lines 1180-1502), the pass-card JS, and the M1 sources.
2. `architect` for parallel design exploration.
   - skip: shape fixed by the SOP and M1. Catalog is data, submissions are two tables, result is one server-side rule.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps: catalog + schema + submission rule before any page renders.
   - Independent workstreams: server/data vs views/CSS could split, but the form field names, keys, and catalog type cross every layer. One owner costs less than the contract.
   - Shared mutable state: one SQLite file, one writer, one transaction per submission. No parallel writers.
   - Smallest safe decomposition: one owner for catalog, schema, routes, views, smoke, README.
4. Delegate code-writing to a subagent with a specific scope.
   - skip worktree: directory is not a git repo. One delegate owns all files, no parallel writer.
5. Verify on the matching surface.
6. Rebase into small, ordered commits.
   - skip: not a git repo, user did not ask for commits.
7. If the design is contested, `interrogate` before shipping.
   - n/a: rule set comes from ACCEPTANCE.md.
8. Run **Opening a PR**.
   - n/a: local demo, no remote.

## Design decisions

| Choice | Alternatives | Pick and reason |
| --- | --- | --- |
| Checklist source | parse draft at runtime, hand-written catalog module | Catalog module with stable keys. The draft is prose, parsing it is fragile, keys survive copy edits. |
| Item storage | JSON blob, one row per item | One row per item. Per-item status is queryable and M3 filters can use it. |
| Result | client-declared, server-derived | Server derives pass from the catalog, client only sends intent. |
| Start time | server on GET, hidden field | Hidden field set on GET. No orphan draft rows, still honest enough for a demo. |
| List scope | stub, minimal list | Minimal list plus detail page. Submit has to land somewhere and M3 extends it. |
| Pass card | image, text | Text card rendered on the record page with clipboard copy. No PDF. |

## Task todos

- [x] checklist catalog (30 items, 7 sections)
- [x] schema: inspections + inspection_items
- [x] POST /inspect validation and transactional insert
- [x] /inspect page, record detail, minimal /records list, styles, copy JS
- [x] extend smoke, update README
- [x] independent verify: smoke + live curl on 3780
