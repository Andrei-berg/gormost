# CLAUDE.md — Project Instructions for AI Agent

## Project Overview
Gormost — web application for tunnel operations management at GBU "Gormost".
Built for dispatching, shift planning, task management, transport coordination, KPI dashboards, and complaint handling.

- **Repo:** https://github.com/Andrei-berg/gormost
- **Deploy:** https://gormost.vercel.app (login: 0000, PIN: 1234)
- **Supabase project:** wwwtsvboqffzbnliuiun

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (auto-deploy from `main` branch)
- **Package manager:** npm

## Development Commands
```bash
npm install          # install dependencies
npm run dev          # local dev server (http://localhost:3000)
npm run build        # production build — MUST pass before any commit
npm run test         # run tests (Vitest) — MUST pass before any commit
npm run test:watch   # run tests in watch mode during development
npm run lint         # ESLint (flat config) — 0 errors required; 47 warnings = baseline, do not grow it
npx tsc --noEmit     # TypeScript check without compilation
```

## Critical Rules

### Core Principles
- **IMPORTANT: Preserve the original code and logic as much as possible. Only change what is necessary.**
- **State your assumptions explicitly before writing code. If ambiguous, propose interpretations and ask.**

### Testing
- `npm run test` **must pass before any commit** — same rule as `npm run build`
- New business logic functions require tests **before** implementation code (TDD)
- Use `npm run test:watch` during development for instant feedback
- Test files live next to the source file: `src/lib/foo.ts` → `src/lib/foo.test.ts`
- Tests cover core business logic only (shift calculations, scheduling rules, data transforms) — not UI components or API calls
- Current suite: 97 tests — `shifts.test.ts` (30), `timesheet.test.ts` (20), `export1c.test.ts` (13), `journalPermit.test.ts` (18), `highRiskWorks.test.ts` (10), `journalStats.test.ts` (6)

### Component Architecture (follow this every time)
Goal: add/remove features without rewriting code.

**Pattern — `dispatcher/page.tsx`:**
```
src/app/dispatcher/page.tsx          ← thin orchestrator (state + loadData only, ~50 lines)
src/components/dispatcher/
  KPICards.tsx                        ← KPI cards block
  Toolbar.tsx                         ← filters + buttons
  TableView.tsx                       ← requests table
  PeopleStats.tsx                     ← staff statistics
  ServiceSummary.tsx                  ← service summary table
```

Rules for all pages:
- `page.tsx` = state + loadData only, ~50 lines
- Each UI section = separate file in `src/components/[panel]/`
- Add feature = new component + 1 import in page.tsx
- Remove feature = delete import + file
- Loading/errors: wrap loadData with `useLoadData` (src/lib/useLoadData.ts) → `{ loading, error, reload }`;
  refresh callbacks and mutations call `reload`, never raw loadData; render `PanelLoader` / `DataErrorBanner`
- Confirmations/notices: `useConfirm()` from `src/components/ConfirmDialog.tsx` — never window.confirm/alert

### Database
- Agent CAN create SQL migration files in `supabase/migrations/`
- Agent CANNOT execute migrations directly — human reviews and runs via Supabase SQL Editor
- Migration file requirements:
  - Clear filename: `001_add_employee_status.sql`
  - Comment at top: what and why
  - Rollback section at bottom
- Never hardcode Supabase credentials, always use environment variables

**DB field types (important!):**
- `approved_by_head: string | null` — stores user_id (string)
- `approved_by_zamporab: boolean | null` — boolean value
- `approved_by_boss: boolean | null` — boolean value

### API & Auth (since 2026-06-12)
- `/api/db` is the single RPC endpoint: client calls go through `api-client.ts` → POST `{fn, args}`;
  it requires the `gormost_token` httpOnly cookie (set by `/api/auth/login`), and sensitive
  functions are gated by the `ROLE_RESTRICTED` map in `src/app/api/db/route.ts`
- Loading lists of work plans: use `fetchWorkPlansWithItems(ids)` (batch); the single-plan
  variant is for single-plan modals only — never call it in a loop

### Theming
- Dark theme is the default; dark utility classes are canonical in components
- Light mode lives ONLY in CSS: the override layer + CSS tokens in `globals.css`
  (`--bg-card`, `--text-primary`, …). Never write `isLight ? … : …` in JS
- Non-multiple-of-5 alpha modifiers (`bg-white/3`) require BOTH the `opacity` scale entry in
  `tailwind.config.ts` AND a light-mode override rule in globals.css; bracket form
  (`bg-white/[0.03]`) is a different class name and needs its own override

### Git Workflow
- `main` branch must always be deployable (colleagues see the demo)
- Run `npm run build` before committing — if build fails, fix before commit
- Run `npm run test` before committing — if tests fail, fix before commit
- Write clear commit messages in English

### Code Style
- Comments in English
- Use TypeScript types, avoid `any`
- Follow existing code patterns and naming conventions
- Use Tailwind CSS for styling, no custom CSS files unless necessary
- Use Supabase client from existing utils, don't create new instances

### What NOT to Do
- Don't install new major dependencies without asking
- Don't refactor working code unless explicitly asked
- Don't change environment variable names
- Don't modify Vercel or Supabase configuration
- **Don't create HTML prototypes or simulation files** without explicit user request — go straight to real implementation to save tokens

## Panels & Roles
| Panel | File | Roles |
|-------|------|-------|
| Dispatcher | `src/app/dispatcher/page.tsx` | DISPATCHER, ADMIN, BOSS |
| Deputy/Foreman | `src/app/zamporab/page.tsx` | ZAMPORAB, ADMIN, BOSS |
| Master/Brigadier | `src/app/foreman/page.tsx` | FOREMAN, ADMIN, BOSS, ZAMPORAB |
| Service Chief | `src/app/head/page.tsx` | HEAD, ADMIN, BOSS |
| Chief Engineer | `src/app/chief/page.tsx` | CHIEF_ENGINEER, ADMIN, BOSS |
| Boss Dashboard | `src/app/boss/page.tsx` | BOSS, ADMIN |
| Journal planner | `src/app/journal/page.tsx` | BOSS, ADMIN |
| Transport | `src/app/transport/page.tsx` | TRANSPORT, ADMIN, BOSS, ZAMPORAB |
| Complaints | `src/app/complaints/page.tsx` | COMPLAINTS, ADMIN, BOSS, DISPATCHER |
| Admin Panel | `src/app/admin/page.tsx` | ADMIN |
| Safety (ТБиОТ) | `src/app/safety/page.tsx` | SAFETY_ENGINEER, ADMIN |

## Work Plan Approval Flow
```
Service Chief (until 16:00)
  └─ creates work plan: items + required workers/foremen/vehicles
       ↓ status: DRAFT → SUBMITTED
Chief Engineer
  └─ reviews and approves
       ↓ status: APPROVED
Deputy (Zamporab)
  └─ can edit items, then confirms
       ↓ status: PLANNED
Boss (meeting at 16:30)
  └─ confirms all plans at the daily meeting
       ↓ status: BOSS_CONFIRMED
Site Foreman (after meeting, evening)
  └─ assigns workers by name to each work item (brigade formation)
       ↓ status: ASSIGNED
  └─ starts work plan
       ↓ status: IN_PROGRESS → DONE
```

**Work plan statuses:**
`DRAFT → SUBMITTED → APPROVED → REJECTED → PLANNED → BOSS_CONFIRMED → ASSIGNED → IN_PROGRESS → DONE`

## Shift System (4 rotating crews)
- Rotation: 24h on, 72h off (сутки через трое), 4 crews
- **Anchor: 2025-01-02 = Shift 4** (hardcoded in `shifts.ts` BASE_DATE/BASE_SHIFT)
- Verified: 14 March 2026 = Shift 4, 15 March 2026 = Shift 1

**Schedule types** (stored in `schedules` table, assigned via `employee_assignments`):
| Code | Logic | Shift constraint |
|------|-------|-----------------|
| 1/3, сутки/3 | works when their crew is on duty | YES — shift_num required |
| 5/2 | weekdays only | YES — shift_num + weekday |
| 3/3 | 3 on / 3 off rolling cycle | NO — shift_reference_date anchor |
| 6/6 | 6 on / 6 off rolling cycle | NO — shift_reference_date anchor |
| 15/15 | 1st–15th or 16th–end of month | NO — rotation_group '1' or '2' |

**Key function:** `isWorkerOnDuty(assignment, date)` in `shifts.ts`

### Two schedule эталоны (single sources — change these, propagates everywhere)
- **Hours & phases** (день/ночь/сутки): `SHIFT_HOURS` in `src/lib/workSchedule.ts` —
  per phase: emoji, label, short, one-letter code (Д/Н/С), canonical colour, hours.
  Helper `phaseMeta('day'|'night'|'round')`. Резолвится фаза 'round' = суточная (1/3).
  Journal `PERIOD_META`, dispatcher OnDutyMonitor, HR roster/tabel/check, print forms all derive.
- **Schedule TYPES** (график сменности): `SCHEDULES` in `src/lib/shifts.ts` —
  per code (1/3, 5/2, 2/2, 3/3, 6/6, 15/15, X/Y): short, label, tip, kind,
  requiresShiftNum, requiresPhase. Helper `scheduleMeta(code)`. `PHASE_SCHEDULE_CODES`,
  `isPhaseSchedule`, planner `CYCLIC_CODES`, `help/ScheduleBadge` all derive.
- Daily-routine work hours live ONLY in `workSchedule.ts` — never hardcode '21:00' etc.

## Brigade Formation
A "brigade" (бригада) = a work group for one specific work plan item.
A "shift" (смена) = all workers on duty today (one of 4 rotating crews).

After boss confirms plans, the site foreman:
1. Opens `/foreman` → "Бригады" tab
2. Sees all BOSS_CONFIRMED plans for their service
3. Assigns workers by name to each item with roles: WORKER / BRIGADIER / MASTER / DRIVER
4. Marks plan ASSIGNED when all workers named
5. Starts work in the morning → IN_PROGRESS

## Key Files
- `src/lib/api/` — all Supabase queries, 11 domain modules (users, catalog, requests, stats, hr,
  plans, vehicles, shift-data, safety, auth, alerts); `src/lib/api.ts` is a barrel re-export —
  /api/db dispatches RPC by exported name, so new functions are picked up automatically
- `src/lib/api-client.ts` — typed client wrappers (one per api function, kept in sync MANUALLY)
- `src/lib/useLoadData.ts` — loading/error hook for all panel pages
- `src/lib/session-token.ts` — HMAC session tokens for the httpOnly auth cookie
- `src/lib/auth.ts` — loginWithPin, getSession, logout, hasRole (client side)
- `src/lib/shifts.ts` — shift calculation + `isWorkerOnDuty()` + **`SCHEDULES` эталон** (schedule types)
- `src/lib/workSchedule.ts` — **`SHIFT_HOURS` эталон** (распорядок дня: hours/phases/colours)
- `src/lib/journalStats.ts` — `aggregateJournal()` for the boss «План дня» dashboard
- `src/types/index.ts` — all TypeScript types + STATUS_CONFIG, PANELS, SERVICE_META
- `src/components/ConfirmDialog.tsx` — DialogProvider + useConfirm() (replaces window.confirm/alert)
- `src/components/DataState.tsx` — PanelLoader skeleton + DataErrorBanner
- `src/components/Header.tsx` — navigation header (hamburger menu)
- `src/components/KanbanBoard.tsx` — kanban board (shared across panels)
- `src/components/RequestModal.tsx` — request create/edit modal
- `src/components/AuthGuard.tsx` — role-based page protection
- `src/components/ShiftRoster.tsx` — who is on duty today/any date (shared widget)
- `src/components/admin/ShiftTab.tsx` — manage employee shift assignments
- `src/components/boss/WorkPlansMeeting.tsx` — 16:30 meeting plan confirmation
- `src/components/boss/JournalDashboard.tsx` — boss «План дня» dashboard from `daily_plan_items`
- `src/components/foreman/BrigadeAssigner.tsx` — assign workers to brigades
- `src/components/zamporab/ZamporabPlanCard.tsx` — edit plan before confirming
- `src/components/journal/` — Журнал планов applet (`JournalApp` + Feed/Board/Table views,
  ShiftHeaderBar «шапка дня», SpecialtyEditor, TransportDetail, FlagSelect, PermitReadiness)
- `src/components/VehicleNumberBadge.tsx` — prominent garage-number badge (used app-wide)

## New DB Tables (migration 012)
- `work_assignments` — employee assignments to work plan items (brigade)
  - `plan_item_id`, `user_id`, `role` (WORKER/BRIGADIER/MASTER/DRIVER), `assigned_by`
- `work_plan_items` new columns: `required_workers`, `required_foremen`, `required_vehicles`, `is_redirected`, `redirect_reason`

## Existing DB Tables (key ones)
- `employee_assignments` — employee schedule assignment (shift_num 1–4, schedule_id, shift_reference_date, rotation_group)
- `schedules` — 6 schedule types (сутки/3, 1/3, 5/2, 3/3, 6/6, 15/15)
- `work_plans` — work plans per service per shift
- `work_plan_items` — individual work items within a plan

## Services (SERVICE_META in types/index.ts)
| ID | Name | Emoji |
|----|------|-------|
| SRV-ENG | Инженерные системы | ⚡ |
| SRV-STR | Строительная служба | 🏗️ |
| SRV-FIRE | Пожарная безопасность | 🚒 |
| SRV-VENT | Вентиляция | 💨 |
| SRV-CCTV | Видеонаблюдение | 📹 |

## File Structure
- Pages and layouts: `src/app/`
- Reusable components: `src/components/`
- Supabase client and utilities: `src/lib/`
- Types and interfaces: `src/types/`
- DB migrations: `supabase/migrations/`

## Environment Variables
Stored in `.env.local` (not in Git). Template in `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Project Status
- Active development, not in production use
- Used for internal demos to colleagues
- Main branch = demo-ready at all times
- **Migrations:** journal migrations `042`–`049` applied in Supabase (042 daily plans,
  043/044 work-permit catalog, 045 сутки shift, 046 shift headers, 047 specialties,
  048 vehicle numbers, 049 item flag). Older `038_status_metadata` / `041_directive_worker_assignments`
  — verify before relying on them.
- June 2026 overhaul complete: api split into domain modules, httpOnly auth on /api/db,
  unified loading/error handling, CSS-token theming (dark default), batch plan loading,
  ConfirmDialog, lint baseline 0 errors / 47 warnings.
- Journal planner (`/journal`, BOSS/ADMIN): daily plans by object × service × shift
  (день/ночь/сутки), permit-readiness strip, specialties, garage numbers, «по распоряжению»
  flags; launches наряд-допуск; feeds the boss «План дня» dashboard. Two schedule эталоны
  established (`SHIFT_HOURS`, `SCHEDULES`). Suite: 97 tests.
