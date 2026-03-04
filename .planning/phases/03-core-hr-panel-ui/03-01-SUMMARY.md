---
phase: 03-core-hr-panel-ui
plan: "01"
subsystem: hr-panel
tags: [hr, ui, scaffold, navigation]
dependency_graph:
  requires: [02-02]
  provides: [hr-route, hr-panels, hr-summary-tiles, hr-service-groups]
  affects: [src/types/index.ts, src/app/hr/page.tsx, src/components/hr/]
tech_stack:
  added: []
  patterns: [AuthGuard render-prop, thin-orchestrator, stub-card, service-grouping]
key_files:
  created:
    - src/app/hr/page.tsx
    - src/components/hr/SummaryPanel.tsx
    - src/components/hr/ServiceSection.tsx
  modified:
    - src/types/index.ts
decisions:
  - "EmployeeCard is stubbed inline in ServiceSection.tsx — Plan 02 will extract it as a separate file"
  - "HEAD role: canEdit=false filters service by session.service_id; ZAMPORAB/ADMIN/BOSS see all"
  - "Services array order drives grouped rendering — not SERVICE_META key order"
metrics:
  duration: "11 minutes"
  completed: "2026-03-04"
  tasks_completed: 3
  files_created: 4
  files_modified: 1
---

# Phase 03 Plan 01: HR Panel Skeleton Summary

HR panel scaffold with navigation entry, page orchestrator, summary tiles, and service-grouped employee cards using a read-only stub card — ready for Plan 02 to drop in interactive EmployeeCard.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add HR panel to PANELS and create component directory | 63a906e | src/types/index.ts, src/components/hr/.gitkeep |
| 2 | Create SummaryPanel.tsx — per-service working/total tiles | dd8a066 | src/components/hr/SummaryPanel.tsx |
| 3 | Create ServiceSection.tsx, create page.tsx orchestrator | 9203350 | src/components/hr/ServiceSection.tsx, src/app/hr/page.tsx |

## What Was Built

### PANELS entry (src/types/index.ts)
Added `id: 'hr'` entry with roles `['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']`, teal color scheme, navigating to `/hr`.

### SummaryPanel.tsx
Horizontal scrollable row of glass tiles — one per service with employees in the visible set. Each tile shows service emoji, service_name (from DB, not SERVICE_META), working count in green, and total count. Absent statuses (Otgul, Bolnichniy, Otpusk, Uvolen) are excluded from "working" count. Services with zero visible employees are skipped entirely.

### ServiceSection.tsx
Renders service header (emoji + name + employee count badge) and a responsive grid of EmployeeCardStub cards. The stub card shows full_name, position, status badge with correct EMPLOYEE_STATUS_CONFIG color, and a placeholder text for future status buttons. HEAD role sees no interactive controls (canEdit=false).

### src/app/hr/page.tsx
Thin orchestrator (~70 lines) following the established pattern:
- AuthGuard with ZAMPORAB/HEAD/ADMIN/BOSS roles
- Loads fetchAllCurrentStatuses() + fetchServices() in parallel
- Filters employees with null service_id (ADMIN accounts)
- HEAD: filters visibleEmployees to own service_id only
- canEdit = !isHead — HEAD is fully read-only
- Groups employees by service using the services array order
- Renders SummaryPanel + ServiceSection list + empty state

## Verification Results

- `npx tsc --noEmit` — zero errors in source files
- `npm run build` — exits 0, `/hr` route listed in build output
- PANELS array contains `{ id: 'hr', roles: ['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS'] }`
- `fetchAllCurrentStatuses` imported and called in page.tsx
- SummaryPanel receives `visibleEmployees` prop
- ServiceSection rendered for each grouped service

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files exist
- src/types/index.ts — modified, contains `id: 'hr'` at line 240
- src/app/hr/page.tsx — created
- src/components/hr/SummaryPanel.tsx — created
- src/components/hr/ServiceSection.tsx — created

### Commits exist
- 63a906e — feat(03-01): add HR panel to PANELS array
- dd8a066 — feat(03-01): create SummaryPanel
- 9203350 — feat(03-01): create ServiceSection stub and HR page orchestrator

## Self-Check: PASSED
