# CLAUDE.md — Project Instructions for AI Agent

## Project Overview
Gormost — web application for tunnel operations management at GBU "Gormostˮ.
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
npm install        # install dependencies
npm run dev        # local dev server (http://localhost:3000)
npm run build      # production build — MUST pass before any commit
npm run lint       # check for linting errors
npx tsc --noEmit   # TypeScript check without compilation
```

## Critical Rules

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

### Git Workflow
- `main` branch must always be deployable (colleagues see the demo)
- Create a feature branch for any changes: `git checkout -b feature/description`
- Run `npm run build` before committing — if build fails, fix before commit
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
- Don't create test files (no test framework configured yet)

## Panels & Roles
| Panel | File | Roles |
|-------|------|-------|
| Dispatcher | `src/app/dispatcher/page.tsx` | DISPATCHER, ADMIN, BOSS |
| Deputy/Foreman | `src/app/zamporab/page.tsx` | ZAMPORAB, ADMIN, BOSS |
| Master/Brigadier | `src/app/foreman/page.tsx` | FOREMAN, ADMIN, BOSS, ZAMPORAB |
| Service Chief | `src/app/head/page.tsx` | HEAD, ADMIN, BOSS |
| Boss Dashboard | `src/app/boss/page.tsx` | BOSS, ADMIN |
| Transport | `src/app/transport/page.tsx` | TRANSPORT, ADMIN, BOSS, ZAMPORAB |
| Complaints | `src/app/complaints/page.tsx` | COMPLAINTS, ADMIN, BOSS, DISPATCHER |
| Admin Panel | `src/app/admin/page.tsx` | ADMIN |

## Request Approval Flow
```
NEW → (HEAD approves) → approved_by_head = userId
    → (ZAMPORAB approves) → approved_by_zamporab = true, status = PLANNED
    → Dispatcher sees request (filter: status != NEW)
    → Goes to work: IN_PROGRESS → CHECKING → DONE
```

## Key Files
- `src/lib/api.ts` — all Supabase queries (fetch/create/update/approve)
- `src/lib/auth.ts` — loginWithPin, getSession, logout, hasRole
- `src/lib/shifts.ts` — shift calculation (auto-detect shift number)
- `src/types/index.ts` — all TypeScript types + STATUS_CONFIG, PANELS, SERVICE_META
- `src/components/Header.tsx` — navigation header (hamburger menu)
- `src/components/KanbanBoard.tsx` — kanban board (shared across panels)
- `src/components/RequestModal.tsx` — request create/edit modal
- `src/components/AuthGuard.tsx` — role-based page protection

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
- Pending: print templates for work orders (waiting for documents from Andrei)
