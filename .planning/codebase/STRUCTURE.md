# Codebase Structure

**Analysis Date:** 2025-03-01

## Directory Layout

```
gormost/
├── src/
│   ├── app/                        # Next.js App Router pages (8 panels + auth + root)
│   │   ├── layout.tsx              # Root layout wrapper
│   │   ├── page.tsx                # Home / redirect page
│   │   ├── login/
│   │   │   └── page.tsx            # PIN login form
│   │   ├── dispatcher/
│   │   │   └── page.tsx            # Dispatcher (shift manager) dashboard
│   │   ├── zamporab/
│   │   │   └── page.tsx            # Deputy/Foreman planning panel
│   │   ├── foreman/
│   │   │   └── page.tsx            # Master/Brigadier task assignments
│   │   ├── head/
│   │   │   └── page.tsx            # Service Chief approval & planning
│   │   ├── boss/
│   │   │   └── page.tsx            # Boss KPI dashboard
│   │   ├── transport/
│   │   │   └── page.tsx            # Transport/vehicles panel
│   │   ├── complaints/
│   │   │   └── page.tsx            # Complaints/issues handling
│   │   ├── admin/
│   │   │   └── page.tsx            # Admin reference data management
│   │   └── globals.css             # Tailwind CSS imports
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── AuthGuard.tsx           # Role-based access control wrapper
│   │   ├── Header.tsx              # Top navigation with shift info, logout
│   │   ├── KanbanBoard.tsx         # Drag-drop status board (shared across panels)
│   │   ├── RequestCard.tsx         # Individual request card in kanban
│   │   ├── RequestModal.tsx        # Create/edit request form modal
│   │   │
│   │   ├── dispatcher/             # Dispatcher-specific components
│   │   │   ├── KPICards.tsx        # KPI metrics (total, in-progress, done, critical)
│   │   │   ├── KPIPanel.tsx        # Additional KPI display variant
│   │   │   ├── Toolbar.tsx         # View toggle (kanban/table), filters, refresh
│   │   │   ├── TableView.tsx       # Tabular request view (alternative to kanban)
│   │   │   ├── PeopleStats.tsx     # Deployed staff summary by service
│   │   │   └── ServiceSummary.tsx  # Work distribution by service
│   │   │
│   │   ├── boss/                   # Boss dashboard components
│   │   │   └── OverviewCharts.tsx  # Statistical charts (requests by status/service)
│   │   │
│   │   ├── head/                   # Service Chief components
│   │   │   └── ServiceStats.tsx    # Service team statistics & assignments
│   │   │
│   │   ├── zamporab/               # Deputy/Foreman components
│   │   │   └── PlanStats.tsx       # Planning statistics & staff distribution
│   │   │
│   │   ├── foreman/                # Master/Brigadier components
│   │   │   └── TaskList.tsx        # Task execution status list
│   │   │
│   │   └── transport/              # Transport panel components
│   │       ├── TransportRequests.tsx
│   │       └── VehicleGrid.tsx
│   │
│   ├── lib/                        # Business logic & utilities
│   │   ├── supabase.ts             # Supabase client initialization
│   │   ├── api.ts                  # All Supabase CRUD operations (13 domains)
│   │   ├── auth.ts                 # Authentication (login, session, roles)
│   │   ├── logger.ts               # Audit trail logging to changelog table
│   │   └── shifts.ts               # Shift rotation math (4-day cycle from Jan 2, 2025)
│   │
│   └── types/
│       └── index.ts                # All TypeScript interfaces, enums, config constants
│
├── supabase/
│   └── migrations/                 # SQL migration files (not executed by app)
│
├── public/                         # Static assets (if needed)
│
├── .env.example                    # Template for .env.local
├── .env.local                      # Environment variables (git-ignored)
├── .gitignore                      # Git ignore rules
├── package.json                    # npm dependencies
├── tsconfig.json                   # TypeScript config (strict mode)
├── tailwind.config.ts              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS (Tailwind) config
├── next.config.js                  # Next.js config
├── CLAUDE.md                       # Project instructions for AI agents
├── REQUIREMENTS.md                 # Feature specs & scope
├── ROADMAP.md                      # Phased development plan
├── ARCHITECTURE.md                 # System design document
├── README.md                       # Project overview
└── PROJECT.md                      # Current project state & todos
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and layouts
- Contains: 8 role-based panel pages, login page, root layout
- Key files: Each `page.tsx` is a page-level orchestrator (~100 lines max per pattern)

**`src/components/`:**
- Purpose: Reusable React components shared across panels
- Contains: UI blocks, panel-specific sub-components
- Structure: Root components (AuthGuard, Header, KanbanBoard, RequestModal) + panel subdirectories

**`src/lib/`:**
- Purpose: Business logic, data access, utilities
- Contains: 5 modules with specific concerns (Supabase, API, Auth, Logging, Shifts)
- Key: Single source of truth for all database queries (lib/api.ts)

**`src/types/`:**
- Purpose: Centralized type definitions and configuration constants
- Contains: User, Request, Service, Category, GObject, Construction, WorkType interfaces
- Also contains: Enums (RoleLevel, RequestStatus, Priority, Urgency), CONFIG maps (STATUS_CONFIG, SERVICE_META, PANELS)

**`supabase/migrations/`:**
- Purpose: SQL migration version control (not auto-executed)
- Contains: Numbered migration files (e.g., `001_create_users_table.sql`)
- Pattern: Human reviews and runs via Supabase SQL Editor

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Root redirect (to /login or first panel)
- `src/app/login/page.tsx`: PIN authentication form
- `src/app/{panel}/page.tsx`: 8 role-based panels (dispatcher, zamporab, foreman, head, boss, transport, complaints, admin)

**Configuration:**
- `src/types/index.ts`: PANELS, STATUS_CONFIG, SERVICE_META, role enums
- `.env.local`: Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `tailwind.config.ts`: Dark mode, color scale, custom utilities

**Core Logic:**
- `src/lib/api.ts`: ~380 lines; all Supabase queries grouped by domain
- `src/lib/auth.ts`: ~84 lines; session management + PIN validation
- `src/lib/shifts.ts`: ~114 lines; 4-day shift rotation algorithm

**Testing:**
- No test files present (no test framework configured)

**Shared Components:**
- `src/components/AuthGuard.tsx`: Role-based access control wrapper
- `src/components/Header.tsx`: Top navigation (shifts, user info, panel menu, logout)
- `src/components/KanbanBoard.tsx`: Drag-drop kanban with status columns
- `src/components/RequestModal.tsx`: Create/edit request form with cascading selectors
- `src/components/RequestCard.tsx`: Individual request card display

## Naming Conventions

**Files:**
- PascalCase for components: `KanbanBoard.tsx`, `ServiceStats.tsx`
- camelCase for utilities: `api.ts`, `auth.ts`, `shifts.ts`
- `page.tsx` for Next.js App Router pages (lowercase by convention)
- `globals.css` for global styles

**Directories:**
- kebab-case for top-level: `src/app`, `src/lib`, `src/types`, `src/components`
- PascalCase for subdirectories matching role names: `src/components/dispatcher/`, `src/components/head/`, `src/components/zamporab/`

**Components:**
- PascalCase for all exported React components
- Descriptive names (KPICards, PeopleStats, RequestModal, AuthGuard)

**Functions:**
- camelCase: `fetchRequests()`, `createRequest()`, `updateRequestStatus()`, `logAction()`
- Prefixes for clarity: `fetch*` (read), `create*` (insert), `update*` (modify), `delete*` (remove), `approve*` (approval workflow)

**Types & Interfaces:**
- PascalCase: `User`, `Request`, `Service`, `RoleLevel`, `RequestStatus`
- Enum values: UPPERCASE: `'NEW'`, `'PLANNED'`, `'IN_PROGRESS'`, `'DISPATCHER'`, `'HEAD'`

**Configuration Objects:**
- UPPERCASE_SNAKE_CASE: `STATUS_CONFIG`, `SERVICE_META`, `PRIORITY_CONFIG`, `URGENCY_CONFIG`, `PANELS`

## Where to Add New Code

**New Feature (e.g., add a new status type):**
1. Add type to `src/types/index.ts` (enum value + config entry)
2. Update enum in `src/types/index.ts`
3. Add config entry: `STATUS_CONFIG[NEW_STATUS] = { label, color, bg }`
4. Use in components via imports
5. Database schema updated separately in Supabase

**New Component/Module:**
1. Create file in `src/components/{panel}/` subdirectory (if panel-specific) or `src/components/` (if shared)
2. Use PascalCase filename matching component name
3. Use 'use client' directive (all components are client-side)
4. Import from `@/types`, `@/lib/api`, `@/components`
5. Import in parent page's `page.tsx`

**New API Function:**
1. Add function to `src/lib/api.ts` in appropriate domain section (// ============ DOMAIN ============ comments)
2. Follow naming pattern: `fetch*()`, `create*()`, `update*()`, `delete*()`
3. Include type annotations for parameters and return
4. Add logging via `logAction()` if mutation (CREATE, UPDATE, DELETE, APPROVE)
5. Wrap Supabase errors: `if (error) throw new Error(error.message)`

**New Page/Panel:**
1. Create folder: `src/app/{panel-name}/`
2. Create `page.tsx` following dispatcher pattern:
   - Export default function wrapping with `AuthGuard` component
   - Inner `Content()` function holds state + loadData hook
   - No component render logic in page.tsx (max ~100 lines)
   - Import child components from `src/components/{panel-name}/`
3. Add role permission to `src/types/index.ts` PANELS array
4. Add sub-components to `src/components/{panel-name}/` subdirectory

**Utilities/Helpers:**
- Shared utilities: `src/lib/{name}.ts`
- Domain-specific: Create in `src/lib/` with clear name (e.g., `shifts.ts`, `logger.ts`)

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD documentation (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md)
- Generated: Yes (by GSD mapper tool)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build cache and compiled output
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**`supabase/migrations/`:**
- Purpose: SQL schema version control
- Generated: No (manually created by developer)
- Committed: Yes (for collaboration and auditability)

## Import Aliases

**Path alias usage:**
- `@/components`: Maps to `src/components/`
- `@/lib`: Maps to `src/lib/`
- `@/types`: Maps to `src/types/`

Example imports:
```typescript
import AuthGuard from '@/components/AuthGuard'
import { fetchRequests, createRequest } from '@/lib/api'
import type { Request, AuthSession } from '@/types'
```

Defined in `tsconfig.json`:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

---

*Structure analysis: 2025-03-01*
