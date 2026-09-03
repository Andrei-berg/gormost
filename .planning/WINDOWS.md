---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 3
total_count: 4
last_updated: 2026-09-03T09:22:54.438Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 08 | stub | src/lib/kb/stem.ts | 12 | stem() returns token unchanged (identity) — Snowball RU algorithm lands in plan 08-02 | fixed |  | 2026-09-03T08:48:48.537Z | 2026-09-03T09:06:32.365Z |
| 2 | 08 | todo | src/lib/kb/expandAbbreviations.ts | 11 | 4-entry seed abbreviation dictionary — grown in plan 08-03 | fixed |  | 2026-09-03T08:48:48.657Z | 2026-09-03T09:22:54.319Z |
| 3 | 08 | todo | src/lib/kb/normalize.ts | 12 | code-point rules only; №/dash/quote/punct/numeric-token rules land in plan 08-03 | fixed |  | 2026-09-03T08:48:48.779Z | 2026-09-03T09:22:54.438Z |
| 4 | 08 | stub | src/lib/kb/resolve.ts | 46 | resolver ladder step 3 (fuzzy) returns unresolved — fuzzy layer lands in plan 08-05 | open |  | 2026-09-03T08:48:48.896Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "08",
    "file": "src/lib/kb/stem.ts",
    "line": 12,
    "description": "stem() returns token unchanged (identity) — Snowball RU algorithm lands in plan 08-02",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-03T08:48:48.537Z",
    "resolved_at": "2026-09-03T09:06:32.365Z"
  },
  {
    "id": 2,
    "kind": "todo",
    "phase": "08",
    "file": "src/lib/kb/expandAbbreviations.ts",
    "line": 11,
    "description": "4-entry seed abbreviation dictionary — grown in plan 08-03",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-03T08:48:48.657Z",
    "resolved_at": "2026-09-03T09:22:54.319Z"
  },
  {
    "id": 3,
    "kind": "todo",
    "phase": "08",
    "file": "src/lib/kb/normalize.ts",
    "line": 12,
    "description": "code-point rules only; №/dash/quote/punct/numeric-token rules land in plan 08-03",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-03T08:48:48.779Z",
    "resolved_at": "2026-09-03T09:22:54.438Z"
  },
  {
    "id": 4,
    "kind": "stub",
    "phase": "08",
    "file": "src/lib/kb/resolve.ts",
    "line": 46,
    "description": "resolver ladder step 3 (fuzzy) returns unresolved — fuzzy layer lands in plan 08-05",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-03T08:48:48.896Z",
    "resolved_at": null
  }
]
````
