# Architecture

**Analysis Date:** 2025-03-01

## Pattern Overview

**Overall:** Role-based multi-panel Next.js application with request lifecycle management and approval workflow.

**Key Characteristics:**
- Next.js 16 App Router with client-side authentication (PIN-based session via localStorage)
- 8 role-based panels with shared components and data abstractions
- Hierarchical approval workflow (HEAD → ZAMPORAB → Dispatcher → Worker)
- Real-time state synchronization via page-level polling (30s refresh intervals)
- Supabase PostgreSQL backend with audit trail (changelog table)

## Layers

**Presentation Layer (UI Components):**
- Purpose: Role-specific interfaces with real-time updates
- Location: `src/app/*/page.tsx` (8 panels), `src/components/*/`
- Contains: Page orchestrators, UI blocks (KanbanBoard, RequestModal, Toolbar, StatsCards)
- Depends on: Auth (AuthGuard), API layer, Type definitions
- Used by: Browser clients via Next.js routing

**Business Logic Layer (Data Orchestration):**
- Purpose: Page-level state management and data loading
- Location: Content components in `src/app/*/page.tsx` (state + loadData hooks)
- Contains: useState, useEffect, useCallback for data fetching and polling
- Depends on: API layer (lib/api.ts)
- Used by: Presentation components

**API Abstraction Layer:**
- Purpose: Centralized Supabase queries with consistent error handling
- Location: `src/lib/api.ts`
- Contains: 13 fetch/create/update functions grouped by domain (users, services, requests, assignments, staff-requests, remarks, changelog, stats)
- Depends on: Supabase client, Logger
- Used by: All page components

**Data Access Layer (Database Client):**
- Purpose: Supabase connection and raw query execution
- Location: `src/lib/supabase.ts` (Supabase client initialization)
- Contains: Configured Supabase client with environment variables
- Depends on: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Used by: API layer

**Authentication Layer:**
- Purpose: PIN-based login, session management, role-based access control
- Location: `src/lib/auth.ts`
- Contains: loginWithPin(), getSession(), setSession(), clearSession(), hasRole()
- Depends on: Supabase (user lookup), Logger (audit trail)
- Used by: AuthGuard component, page components, Header component

**Utilities Layer:**
- Purpose: Domain-specific calculations and formatting
- Location: `src/lib/shifts.ts`, `src/lib/logger.ts`
- Contains: Shift rotation math (4-day cycle), period detection (day/night), audit logging
- Depends on: Supabase (logger writes to changelog)
- Used by: Header component (shifts), API layer (logAction on mutations)

**Type System:**
- Purpose: Single source of truth for interfaces and enums
- Location: `src/types/index.ts`
- Contains: User, Request, Service, Category, GObject, Construction, WorkType + RoleLevel, RequestStatus enums + STATUS_CONFIG, SERVICE_META, PANELS configuration
- Used by: All other layers

## Data Flow

**Request Creation Flow (Dispatcher → Request Lifecycle):**

1. User clicks "+ Создать заявку" in page
2. RequestModal opens (empty form with cascading dropdowns)
3. User selects: Service → Category → Object → Construction → Work Type
4. User enters: description, priority, urgency, transport type, assigns users
5. Form submission calls `createRequest()` in API layer
6. API layer logs action to `changelog` table via `logAction()`
7. Request enters database with status='NEW' (invisible to dispatcher)
8. Page calls `loadData()` callback to refresh state
9. Data flows back through: API → page state → components re-render

**Request Approval Workflow (HEAD → ZAMPORAB → Dispatcher):**

```
NEW (invisible to dispatcher)
  ↓
HEAD reviews in /head panel
  → HEAD clicks "✓ Согласовать"
  → approveRequest(requestId, 'head', userId)
  → Updates approved_by_head = userId_string
  ↓
ZAMPORAB reviews in /zamporab panel
  → ZAMPORAB clicks "✓ Согласовать"
  → approveRequest(requestId, 'zamporab', userId)
  → Updates approved_by_zamporab = true, status changes to PLANNED
  ↓
Dispatcher now sees request (status !== 'NEW' filter in page)
  → Can drag request across kanban columns
  → Status changes: PLANNED → IN_PROGRESS → CHECKING → DONE
  → Each drag triggers updateRequestStatus()
```

**State Management Pattern (Page Level):**

```typescript
// src/app/dispatcher/page.tsx pattern (typical for all panels)
const [requests, setRequests] = useState<Request[]>([])
const [filterService, setFilterService] = useState('')

const loadData = useCallback(async () => {
  // 1. Fetch all reference data in parallel
  const [reqs, cats, objs] = await Promise.all([
    fetchRequests(filterService ? { serviceId: filterService } : undefined),
    fetchCategories(),
    fetchObjects()
  ])
  // 2. Filter/transform if needed
  const approvedReqs = reqs.filter(r => r.status !== 'NEW')
  // 3. Update state
  setRequests(approvedReqs)
  setCategories(cats)
  // 4. Notify child components
}, [filterService])

// 5. Load on mount
useEffect(() => { loadData() }, [loadData])

// 6. Poll for updates every 30s
useEffect(() => {
  const t = setInterval(loadData, 30000)
  return () => clearInterval(t)
}, [loadData])
```

**User Interaction → Data Persistence → UI Update:**

1. User action in component (e.g., drag card to "IN_PROGRESS")
2. Event handler calls API function (e.g., `updateRequestStatus()`)
3. API function:
   - Calls supabase.from('requests').update()
   - Calls `logAction()` to record in changelog
   - Returns updated data or boolean
4. Component's parent (page) calls `loadData()` to refresh entire page state
5. All child components re-render with fresh data

## Key Abstractions

**Request Entity:**
- Purpose: Core business object representing a work task
- Files: `src/types/index.ts` (interface), `src/lib/api.ts` (CRUD operations)
- Pattern: Full lifecycle from NEW → PLANNED → IN_PROGRESS → CHECKING → DONE
- Relationships: belongs_to(Service, Category, Object, Construction, WorkType); has_many(RequestAssignment, Remark)

**Service (Department):**
- Purpose: Organizational unit for users and work scope
- Files: `src/types/index.ts`, `src/lib/api.ts`
- Pattern: Color-coded with emoji (SERVICE_META in types) for quick UI identification
- Used by: HEAD (approves by service), RequestModal (filters users by service)

**User Assignment:**
- Purpose: Links users to requests for execution tracking
- Files: `src/types/index.ts` (RequestAssignment), `src/lib/api.ts` (assignUsers, fetchAssignments)
- Pattern: Many-to-many via request_assignments table; atomic delete-then-insert on update

**Shift Information:**
- Purpose: Automatic shift rotation based on 4-day cycle from Jan 2, 2025 base
- Files: `src/lib/shifts.ts`
- Pattern: Stateless utility functions (getShiftForDate, getCurrentShift, getCurrentPeriod)
- Used by: Header component (displays current shift + chief name)

**Changelog (Audit Trail):**
- Purpose: Immutable record of all state changes for compliance
- Files: Supabase `changelog` table, `src/lib/logger.ts` (logAction function)
- Pattern: Fire-and-forget logging (try/catch silently fails); includes action_type, entity_type, entity_id, details JSON
- Usage: Logged on every mutation (CREATE, UPDATE, DELETE, APPROVE, ASSIGN)

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to /
- Responsibilities: Redirect to /login if not authenticated, else redirect to first accessible panel

**Authentication Entry:**
- Location: `src/app/login/page.tsx`
- Triggers: User without session or explicit /login navigation
- Responsibilities: PIN login form, session creation, redirect to first authorized panel

**Panel Entry (8 total):**
- Format: `/dispatcher`, `/zamporab`, `/foreman`, `/head`, `/boss`, `/transport`, `/complaints`, `/admin`
- Location: `src/app/{panel}/page.tsx`
- Triggers: Role-based access via PANELS configuration in types
- Responsibilities: AuthGuard wrapper (enforces roles), page-level state, data loading, component orchestration

**Data Synchronization Entry:**
- Pattern: Page-level loadData() callback triggered by:
  1. Component mount (useEffect with loadData in dependency array)
  2. User actions (manual refresh button, modal save callback)
  3. Polling interval (setInterval every 30s)

## Error Handling

**Strategy:** Client-side error logging with user feedback for critical failures only

**Patterns:**

- **API errors:** Throw Error with message in async/await catch; page components may catch or let fail silently
- **Auth errors:** Redirect to /login if session invalid (AuthGuard component)
- **Network errors:** Logged to console; page remains in stale state until next loadData succeeds
- **Validation errors:** RequestModal tracks error state and displays inline
- **Audit errors:** logAction() fails silently (try/catch in logger.ts); doesn't block mutations

Example (from api.ts):
```typescript
export async function createRequest(req: Partial<Request>, userId: string): Promise<Request | null> {
  const { data, error } = await supabase.from('requests').insert(payload).select().single()
  if (error) throw new Error(error.message)  // Propagate to caller
  if (data) {
    await logAction(...)  // Audit (fire-and-forget)
  }
  return data as Request | null
}
```

## Cross-Cutting Concerns

**Logging:**
- Pattern: `logAction(userId, actionType, entityType, entityId, details)` called after every mutation
- Files: `src/lib/logger.ts`, all calls in `src/lib/api.ts`
- Output: Written to `changelog` table in Supabase

**Validation:**
- Pattern: No validation library; form state tracked in component with error field
- Example: `src/components/RequestModal.tsx` cascading dropdowns (category → object → construction → workType)
- Strategy: Database constraints enforce data integrity; UI prevents invalid selections

**Authentication & Authorization:**
- Pattern: Session stored in localStorage; role-based component rendering via hasRole()
- Files: `src/lib/auth.ts`, `src/components/AuthGuard.tsx`, `src/components/Header.tsx`
- Enforcement: Every page wrapped in AuthGuard; Header shows only accessible panels

**Real-time Updates:**
- Pattern: Page-level polling (no websockets); 30s interval refresh
- Files: All page components (useEffect with setInterval)
- Rationale: Simpler than subscriptions; sufficient for shift-based operations

**Cascading Data Loading:**
- Pattern: Dependent dropdowns trigger fetchOperations on parent change
- Example: `RequestModal.tsx` - Category selected → fetch Objects → Object selected → fetch Constructions
- Strategy: Clear child fields when parent changes; load data in parallel with Promise.all when possible

---

*Architecture analysis: 2025-03-01*
