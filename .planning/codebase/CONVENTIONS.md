# Coding Conventions

**Analysis Date:** 2025-03-01

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `KPICards.tsx`, `RequestModal.tsx`, `AuthGuard.tsx`)
- Pages: lowercase (e.g., `page.tsx`, `layout.tsx`)
- Utilities/functions: camelCase (e.g., `getShiftForDate`, `fetchRequests`, `logAction`)
- Types/interfaces: PascalCase (e.g., `Request`, `AuthSession`, `Service`)

**Functions:**
- Async functions prefixed with verb: `fetch*`, `create*`, `update*`, `delete*` (in `src/lib/api.ts`)
- Handler functions: `handle*` prefix (e.g., `handleSave`, `handleDrop`, `handleDragStart` in components)
- Utility functions: descriptive names (e.g., `getShiftForDate`, `getCurrentShift`, `hasRole`)
- React hooks/callbacks: use camelCase (e.g., `loadData`, `setSession`, `setViewChange`)

**Variables:**
- State hooks: descriptive camelCase (e.g., `requests`, `categories`, `selectedUsers`, `filterService`)
- Booleans: prefix with `is` or `show` (e.g., `isEdit`, `checked`, `showModal`, `showService`)
- Derived/computed values: descriptive names (e.g., `kpi`, `approvedReqs`, `cards`)
- Single letters acceptable for short loops only (e.g., `r` for request, `s` for service, `a` for assignment in `.map()` callbacks)

**Types:**
- Export types from `src/types/index.ts` as PascalCase interfaces
- Use union types for status enums (e.g., `type RequestStatus = 'NEW' | 'PLANNED' | 'IN_PROGRESS' | 'CHECKING' | 'DONE'`)
- Use type aliases for discriminated unions (e.g., `type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`)
- Config objects export as `const CONSTANT_NAME: Record<Type, { ... }>` (e.g., `STATUS_CONFIG`, `PRIORITY_CONFIG`, `SERVICE_META`)

## Code Style

**Formatting:**
- No explicit formatter configured (no .eslintrc.json, .prettierrc)
- Follows Next.js ESLint defaults (via `eslint-config-next` in `package.json`)
- Spacing: 2-space indentation (observed across all files)
- Line width: No strict limit observed; pragmatic line lengths
- Template literals for interpolation (e.g., `` `repeat(${cols.length}, minmax(240px, 1fr))` ``)

**Linting:**
- ESLint: `"eslint": "^9.18.0"` with `"eslint-config-next": "16.1.1"`
- Run: `npm run lint`
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- No test configuration (no Jest, Vitest, etc.)

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from 'react'`)
2. Next.js imports (`import { useRouter, usePathname } from 'next/navigation'`)
3. Third-party imports (`import { supabase } from './supabase'`, `import clsx from 'clsx'`)
4. Internal utilities (`import { fetchRequests, updateRequest } from '@/lib/api'`)
5. Type imports (`import type { Request, Service, AuthSession } from '@/types'`)

**Path Aliases:**
- Configured in `tsconfig.json`: `"@/*": ["./src/*"]`
- Always use `@/` for imports (e.g., `@/lib/api`, `@/components/Header`, `@/types`)
- Do NOT use relative imports (e.g., `../../../lib/api`)

**Sample import block from `src/app/dispatcher/page.tsx`:**
```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import { fetchRequests, fetchCategories, fetchObjects } from '@/lib/api'
import type { Request, Category, GObject, AuthSession } from '@/types'
```

## Error Handling

**Patterns:**
- API functions catch errors and throw (e.g., `if (error) throw new Error(error.message)` in `src/lib/api.ts`)
- Components use try-catch in async handlers: `try { ... } catch (err) { setError(...) }`
- Auth functions return `{ ok: boolean; session?: AuthSession; error?: string }` object pattern
- Logger silently catches and logs errors to console (see `src/lib/logger.ts`)
- Supabase errors propagated to UI via state variables like `error`, `saving`

**Example from `src/lib/api.ts`:**
```typescript
export async function createRequest(req: Partial<Request>, userId: string): Promise<Request | null> {
  const { data, error } = await supabase.from('requests').insert(payload).select().single()
  if (error) throw new Error(error.message)  // Propagate errors
  if (data) {
    await logAction(userId, 'CREATE_REQUEST', 'request', id, { ... })
  }
  return data as Request | null
}
```

**Example from component (`src/app/dispatcher/page.tsx`):**
```typescript
const handleSave = async () => {
  setSaving(true)
  setError(null)
  try {
    // ... API call
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error')
  } finally {
    setSaving(false)
  }
}
```

## Logging

**Framework:** console (no structured logging library)

**Patterns:**
- Log errors with `console.error()` only in catch blocks (e.g., `console.error('Login error:', err)`)
- Audit actions via `logAction()` in `src/lib/logger.ts` — records to `changelog` table
- `logAction(userId, actionType, entityType, entityId, details)` signature

**Where to log:**
- Auth events: `loginWithPin()`, `logout()` in `src/lib/auth.ts`
- Data mutations: `createRequest()`, `updateRequest()`, `approveRequest()` in `src/lib/api.ts`
- User actions: assignment changes, request status updates

## Comments

**When to Comment:**
- Business logic calculations (e.g., shift rotation logic in `src/lib/shifts.ts`)
- Non-obvious algorithms or workarounds
- Deliberately commented out code: avoid (delete if not used)

**Style:**
- Single-line: `// text`
- Multi-line: `/** ... */` for function/type documentation
- JSDoc/TSDoc: Minimal use, prefer self-documenting code

**Example from `src/lib/shifts.ts`:**
```typescript
// Разница в днях
const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

// Определяем позицию в 4-дневном цикле (сутки/трое)
const cyclePosition = daysDiff % 4
```

## Function Design

**Size:**
- Page components ~100-120 lines max (including JSX)
- Sub-components 30-80 lines typical
- Utility functions 5-40 lines typical
- No hard limits; prioritize readability

**Parameters:**
- Destructure props via TypeScript interface
- Max 5-6 props typical; group related props into objects if more
- Use `...rest` patterns sparingly

**Return Values:**
- Void functions for side effects (e.g., `setSession()` returns `void`)
- Promise return types explicit (e.g., `Promise<Request | null>`)
- `| null` preferred over `undefined` for absence (matches Supabase patterns)

**Example from `src/components/dispatcher/KPICards.tsx`:**
```typescript
interface Props {
  total: number
  inProgress: number
  done: number
  critical: number
}

export default function KPICards({ total, inProgress, done, critical }: Props) {
  // Component body, ~20 lines
}
```

## Module Design

**Exports:**
- Named exports for utilities (e.g., `export async function fetchRequests()`)
- Default export for React components
- Type exports via `export type { ... }`

**Barrel Files:**
- Not used in this codebase
- Import directly from module files
- Example: `import { fetchRequests } from '@/lib/api'` (not from a barrel)

**File Organization:**
- One component per file (e.g., `KPICards.tsx` contains only `KPICards` component)
- Sub-components in same file if <50 lines and used only there (e.g., `KPICard` inside `KPICards.tsx`)
- Utility functions grouped by domain (`src/lib/api.ts`, `src/lib/auth.ts`, `src/lib/shifts.ts`, `src/lib/logger.ts`)
- Types centralized in `src/types/index.ts`

## Client/Server Components

**Pattern:**
- All components that use hooks are marked `'use client'` at top
- Example: `src/components/dispatcher/KanbanBoard.tsx` uses `useState`, `'use client'` directive present
- Server components (rare): used for initial layout only (`src/app/layout.tsx`)

## Styling

**Framework:** Tailwind CSS

**Pattern:**
- Utility classes only (no custom CSS files)
- Theme: dark mode with glass effect style (`.glass` class in globals.css)
- Colors: semantic names (`blue-600`, `red-500/20`, `white/50`)
- Responsive: `grid-cols-1 lg:grid-cols-2` pattern for breakpoints

**Custom Classes:**
- `.glass` and `.glass-strong` for background effects (defined in `globals.css`)
- No component-specific CSS files

**Example from `src/components/dispatcher/Toolbar.tsx`:**
```typescript
const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all'
const btnActive = 'bg-blue-600 text-white'
const btnIdle = 'bg-white/5 text-white/50 hover:bg-white/10'

<button className={`${btnBase} ${view === 'kanban' ? btnActive : btnIdle}`}>
  Канбан
</button>
```

## Type Safety

**Patterns:**
- Use `as` casting only when unavoidable (e.g., `data as User[]` after Supabase query)
- Avoid `any` — use `unknown` with type guards if needed
- Type function parameters and return values explicitly
- Use conditional types for complex type relationships (not observed in codebase; keep if needed)

**Example from `src/lib/api.ts`:**
```typescript
const { data } = await supabase.from('users').select('*').single()
return data as User | null  // Cast after Supabase query

export async function fetchUsers(activeOnly = true): Promise<User[]> {
  // Explicit return type
  return (data || []) as User[]
}
```

---

*Convention analysis: 2025-03-01*
