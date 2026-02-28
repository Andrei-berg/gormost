# Codebase Concerns

**Analysis Date:** 2025-03-01

## Tech Debt

**PIN Code Storage (Authentication Security):**
- Issue: PIN codes stored in plaintext in Supabase `users` table
- Files: `src/lib/auth.ts` (lines 50-51), `src/app/admin/page.tsx` (lines 173, 109)
- Impact: Credentials visible to anyone with database access; violates security best practices
- Fix approach: Hash PINs with bcrypt or Argon2 before storage; update `loginWithPin()` to compare hashes instead of plain text comparison

**Duplicate Kanban Component:**
- Issue: Two KanbanBoard implementations exist with different patterns
- Files: `src/components/KanbanBoard.tsx` (92 lines, typed, modern) vs `src/components/dispatcher/KanbanBoard.tsx` (299 lines, untyped `any`, legacy inline styles)
- Impact: Maintenance confusion; dispatcher uses outdated version; double work if either needs updates
- Fix approach: Delete `src/components/dispatcher/KanbanBoard.tsx`; verify dispatcher/page.tsx imports the correct shared component

**Missing Error Recovery in Batch Operations:**
- Issue: Assignment operations delete all existing assignments before inserting new ones; no transaction support
- Files: `src/lib/api.ts` (lines 244-255 in `assignUsers()`)
- Impact: If insert fails after delete, assignments are lost with no way to restore
- Fix approach: Implement transaction-like pattern or add rollback state; consider server action wrapper

**Untyped Any Abuse:**
- Issue: `any` type used extensively, defeating TypeScript strict mode benefits
- Files: `src/app/complaints/page.tsx` (line 45 `.map((r: any)`), `src/app/admin/page.tsx` (line 325 generic constraint `any`), `src/components/dispatcher/KanbanBoard.tsx` (multiple instances)
- Impact: Lost type safety; harder to refactor; runtime errors not caught at compile time
- Fix approach: Replace `any` with proper discriminated union types or interfaces; use generics correctly

**Inconsistent Request Status Handling:**
- Issue: Request approval mixes string and boolean fields; semantic confusion
- Files: `src/types/index.ts` (lines 79-81), `src/lib/api.ts` (lines 213-229)
- Impact: Hard to determine if request is actually approved; logic spread across multiple fields
- Fix approach: Create unified `ApprovalState` type; consolidate approval logic into single source of truth

---

## Security Considerations

**Session Storage in localStorage:**
- Risk: AuthSession stored unencrypted in browser localStorage; accessible via XSS
- Files: `src/lib/auth.ts` (lines 18-23)
- Current mitigation: None; stored as plain JSON
- Recommendations:
  - Use httpOnly cookies for session tokens instead
  - Implement CSRF protection on state-changing operations
  - Add Content-Security-Policy headers to prevent XSS

**No Input Validation:**
- Risk: User inputs not validated before database insertion
- Files: `src/components/RequestModal.tsx` (entire form), `src/app/admin/page.tsx` (user creation)
- Current mitigation: Database constraints only (weak)
- Recommendations:
  - Add Zod schemas for all form inputs
  - Validate on both client and server
  - Sanitize text inputs that appear in remarks/descriptions

**PIN Authentication Only:**
- Risk: Single-factor authentication with only 4-digit PIN (10,000 possibilities)
- Files: `src/lib/auth.ts` (lines 31-75)
- Current mitigation: None
- Recommendations:
  - Implement rate limiting on login attempts
  - Add account lockout after N failed attempts
  - Log all login attempts (currently logged but not monitored)

**Database Query Injection Potential:**
- Risk: Direct Supabase `.in()` queries with user-provided arrays
- Files: `src/lib/api.ts` (lines 324, 333)
- Current mitigation: Supabase parameterization
- Recommendations: Validate array contents before passing to queries; add query logging

---

## Performance Bottlenecks

**N+1 Query Pattern in People Stats:**
- Problem: Fetches requests, then assignments, then users, then objects sequentially + multiple in-memory iterations
- Files: `src/lib/api.ts` (lines 306-360 in `fetchPeopleStats()`)
- Cause: 4 separate database queries + nested loop matching (O(n²) for 300+ assignments)
- Improvement path:
  - Use PostgreSQL JOIN instead of separate queries
  - Cache result for 30-60 seconds (data doesn't change frequently)
  - Limit to only IN_PROGRESS requests' assignments (not all)

**Inefficient Request Stats Calculation:**
- Problem: Fetches ALL request rows just to count by status/service
- Files: `src/lib/api.ts` (lines 364-381 in `fetchRequestStats()`)
- Cause: No aggregation at database level; entire table loaded into memory
- Improvement path: Use PostgreSQL aggregation (`COUNT(*) GROUP BY status`)

**30-Second Polling Without Stale Tracking:**
- Problem: Full data reload every 30s even if nothing changed
- Files: `src/app/dispatcher/page.tsx` (lines 51-54)
- Cause: No change detection; all dependents (KPI, tables) re-render
- Improvement path:
  - Implement differential polling (fetch only changed request IDs)
  - Use WebSocket for real-time updates instead of polling
  - Add request deduplication in cache

---

## Fragile Areas

**Cascading Form State in RequestModal:**
- Files: `src/components/RequestModal.tsx` (lines 52-80)
- Why fragile: 5 cascading useEffect hooks; changing one field clears others; hard to trace state flow
- Safe modification:
  - Consolidate into single `onChange` handler
  - Use reducer pattern for dependent fields
  - Add validation state for each cascade level
- Test coverage: No unit tests; manual E2E required

**Shift Calculation Logic:**
- Files: `src/lib/shifts.ts` (lines 27-68)
- Why fragile: Hardcoded base date (2025-01-02) and shift numbers; will break after base rotation
- Safe modification:
  - Move base date to environment variable or database
  - Support dynamic shift chief assignment
  - Add tests for date boundary conditions
- Test coverage: None; critical business logic untested

**Admin Panel Generic CRUD:**
- Files: `src/app/admin/page.tsx` (lines 325+ CrudTab generic)
- Why fragile: Single generic function handles all entity types; bugs propagate to all tabs
- Safe modification:
  - Split into separate, testable components per entity
  - Add proper error boundaries
  - Validate form data before submit
- Test coverage: None

**Request Approval Flow:**
- Files: `src/lib/api.ts` (lines 213-229), type definition split across `types/index.ts`
- Why fragile: Logic distributed between API layer and components; easy to misinterpret approval state
- Safe modification:
  - Create dedicated `ApprovalService` class
  - Add state machine validation (prevent invalid transitions)
  - Document state diagram
- Test coverage: None

---

## Missing Critical Features

**No Input Validation Framework:**
- Problem: Zero validation on user inputs; accepts any string/number
- Blocks: Cannot safely accept user-generated content in remarks/descriptions
- Mitigation: Forms work in dev environment; risky in production

**No Error Boundary Components:**
- Problem: Single error crashes entire page
- Blocks: Cannot gracefully degrade if data loads fail
- Mitigation: None; users see blank screen on error

**No Optimistic UI Updates:**
- Problem: 2-3 second delay waiting for Supabase response before UI updates
- Blocks: Poor UX for drag-drop and form submissions
- Mitigation: Users wait with no visual feedback

**No Offline Capability:**
- Problem: Zero connectivity = blank page
- Blocks: Dispatcher cannot work offline or on poor connections
- Mitigation: Application requires constant internet

---

## Test Coverage Gaps

**Business Logic Completely Untested:**
- What's not tested: Shift calculation, approval flow, request status transitions, cascade logic
- Files: `src/lib/shifts.ts`, `src/lib/api.ts`, `src/components/RequestModal.tsx`
- Risk: Critical bugs in production; no regression detection; hard to refactor
- Priority: **High** — Shift calculation affects all work planning

**Database Queries Untested:**
- What's not tested: Filter combinations, edge cases, performance with large datasets
- Files: All functions in `src/lib/api.ts`
- Risk: Silent data corruption; race conditions on concurrent updates
- Priority: **High** — Database is single source of truth

**Component Integration Untested:**
- What's not tested: Modal form submissions, cascading selects, drag-drop status changes
- Files: `src/components/RequestModal.tsx`, `src/components/KanbanBoard.tsx`, `src/app/dispatcher/page.tsx`
- Risk: Form saves fail silently; data inconsistencies undetected
- Priority: **Medium** — E2E testing could catch these

**Role-Based Access Untested:**
- What's not tested: AuthGuard enforcement, role filtering, permission boundaries
- Files: `src/components/AuthGuard.tsx`, all pages with `AuthGuard`
- Risk: Unauthorized access to protected data
- Priority: **High** — Security-critical

---

## Dependencies at Risk

**No Database Migration System:**
- Risk: No structured way to evolve schema; manual SQL in Supabase console is error-prone
- Impact: Cannot version-control schema changes; hard to rollback
- Migration plan: Implement Supabase migration files in `supabase/migrations/` directory; document version in `package.json`

**@dnd-kit Drag-Drop Used Minimally:**
- Risk: Heavy import for basic drag-drop functionality; actual implementation uses native HTML5
- Impact: Dead code; larger bundle
- Migration plan: Remove `@dnd-kit/*` dependencies; use only native drag-drop

**No TypeScript Strict Mode Compliance:**
- Risk: `any` types, missing error handling bypass checks
- Impact: False sense of type safety
- Migration plan: Enable strict mode in `tsconfig.json`; audit all `any` uses

---

## Scaling Limits

**Database Queries Scale Linearly:**
- Current capacity: Works fine with < 1000 requests, < 500 users
- Limit: N+1 patterns will timeout with 10,000+ requests
- Scaling path:
  - Implement caching layer (Redis or in-memory LRU)
  - Add database indexes on frequent filter columns
  - Migrate to parameterized aggregation queries

**Browser Storage 5MB Limit:**
- Current capacity: Session + cache fits comfortably
- Limit: Adding offline-first data sync would exceed limit quickly
- Scaling path: Implement IndexedDB for large offline caches; use Service Worker

**30-Second Polling Unsustainable:**
- Current capacity: Works for < 50 concurrent users
- Limit: 2+ polls/sec across 100+ users = thousands of DB queries/min
- Scaling path: Implement WebSocket or Server-Sent Events for real-time push

---

## Known Bugs

**Complaints Using Remarks Table Hack:**
- Symptoms: Complaints displayed as remarks; pipe-delimited parsing fragile
- Files: `src/app/complaints/page.tsx` (lines 40-55)
- Trigger: Create complaint; navigate away; data format is non-standard
- Workaround: Currently functional but unmaintainable; needs proper complaints table

**Cascade State Resets Lose User Input:**
- Symptoms: User selects category, then object; changing category clears object (expected but data lost)
- Files: `src/components/RequestModal.tsx` (lines 53-59)
- Trigger: Select category → select object → change category
- Workaround: User must re-enter object; no undo

**Shift Calculation Breaks on Leap Year:**
- Symptoms: Shift number may be off by one on Feb 29
- Files: `src/lib/shifts.ts` (lines 36 modulo calculation)
- Trigger: Use app on Feb 29, 2025 or any leap year
- Workaround: Add special case for Feb 29

---

*Concerns audit: 2025-03-01*
