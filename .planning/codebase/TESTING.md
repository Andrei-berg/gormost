# Testing Patterns

**Analysis Date:** 2025-03-01

## Test Framework

**Status:** No test framework configured

**Runner:**
- Not detected — no Jest, Vitest, Mocha, or similar in `package.json`
- No test scripts in `package.json` (`"test"` command absent)

**Assertion Library:**
- Not applicable — no testing framework present

**Run Commands:**
```bash
npm run lint              # Check for linting errors (only testing-adjacent command)
npx tsc --noEmit         # TypeScript validation without compilation
npm run build            # Validate code builds successfully
```

## Test File Organization

**Location:**
- No test files present in codebase
- No `__tests__`, `__test__`, `tests/`, or `test/` directories found
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files

**Pattern:** When tests are added, use:
- Co-locate tests with source: `src/components/ComponentName.test.tsx` next to `src/components/ComponentName.tsx`
- Use `.test.ts` extension for all test files
- Group related tests in same file (prefer one describe block per module)

## Current Testing Approach

**Manual Testing:**
- Demo deployment: https://gormost.vercel.app
- Live validation: build must pass before commits (`npm run build` in CLAUDE.md instructions)
- TypeScript type checking: `npx tsc --noEmit` for compile validation

**Code Validation:**
- ESLint: `npm run lint` validates style and common errors
- TypeScript strict mode: `tsconfig.json` has `"strict": true`

## Code Quality Safeguards (Without Tests)

**Type Safety:**
- TypeScript strict mode enabled
- All database queries typed via `src/types/index.ts` interfaces
- Component props fully typed via `interface Props { ... }`
- Function signatures include return types

**Example from `src/lib/api.ts`:**
```typescript
export async function fetchRequests(filters?: {
  serviceId?: string
  status?: RequestStatus
  dateWork?: string
  shiftNo?: number
  createdBy?: string
}): Promise<Request[]> {
  let q = supabase.from('requests').select('*').order('created_at', { ascending: false })
  // ... filtering logic
  const { data } = await q
  return (data || []) as Request[]
}
```

**Build Validation:**
- `npm run build` runs Next.js build pipeline
- Fails if:
  - TypeScript compilation errors exist
  - ESLint violations (via `next lint`)
  - React component issues detected
- Required to pass before commit (per CLAUDE.md)

**Linting:**
- ESLint config: `eslint-config-next` (Next.js defaults)
- Command: `npm run lint`
- Catches common issues: unused vars, missing dependencies, type mismatches

## Error Handling Testing

**Manual validation approach:**

**API Error Handling:**
- Supabase errors thrown (see `src/lib/api.ts`):
```typescript
if (error) throw new Error(error.message)
```
- Components catch and display via state:
```typescript
try {
  await updateRequest(...)
} catch (err) {
  setError(err instanceof Error ? err.message : 'Unknown error')
}
```

**Auth Validation:**
- Login returns structured response: `{ ok: boolean; session?: AuthSession; error?: string }`
- Components check `ok` flag before proceeding
- Invalid PIN/missing user tested via demo (login: `0000`, PIN: `1234`)

**Component Error Boundaries:**
- `AuthGuard.tsx` protects routes — redirects to login if no session
- Shows loading state during auth check:
```typescript
if (!checked || !session) {
  return <div className="...">Загрузка...</div>
}
```

## Key Patterns for Future Test Coverage

**What should be tested (if tests added):**

**1. API Query Layer (`src/lib/api.ts`):**
- Fetch functions correctly query Supabase
- Filter parameters apply correctly
- Error handling returns appropriate error messages
- Data transformation (`as User[]` casts work correctly)

**Example test structure (when tests are added):**
```typescript
// src/lib/api.test.ts
describe('fetchRequests', () => {
  it('should fetch requests for all services when no filter', async () => {
    // Mock supabase response
    // Verify query called without eq('service_id', ...)
  })

  it('should filter requests by service_id', async () => {
    // Mock supabase response
    // Verify query.eq('service_id', serviceId) called
  })

  it('should throw on Supabase error', async () => {
    // Mock error response
    // Expect throw
  })
})
```

**2. Auth Functions (`src/lib/auth.ts`):**
- PIN validation succeeds with correct PIN
- PIN validation fails with incorrect PIN
- Session persists in localStorage
- Session cleared on logout

**Example test structure:**
```typescript
// src/lib/auth.test.ts
describe('loginWithPin', () => {
  it('should return ok=true with valid credentials', async () => {
    // Mock user in Supabase
    // Call loginWithPin('0000', '1234')
    // Expect ok: true, session present
  })

  it('should return error for incorrect PIN', async () => {
    // Mock user in Supabase with PIN '1234'
    // Call loginWithPin('0000', '9999')
    // Expect ok: false, error message
  })
})
```

**3. Shift Calculation (`src/lib/shifts.ts`):**
- Shift number rotates every 4 days
- Base date (2025-01-02) = shift 4
- Off-days return next working shift
- Current period (day/night) based on hour

**Example test structure:**
```typescript
// src/lib/shifts.test.ts
describe('getShiftForDate', () => {
  it('should return shift 4 for base date (2025-01-02)', () => {
    const result = getShiftForDate(new Date('2025-01-02'))
    expect(result.shiftNumber).toBe(4)
  })

  it('should rotate shift every 4 days', () => {
    const d1 = getShiftForDate(new Date('2025-01-02'))  // shift 4
    const d2 = getShiftForDate(new Date('2025-01-06'))  // shift 1
    const d3 = getShiftForDate(new Date('2025-01-10'))  // shift 2
  })
})
```

**4. Component Integration:**
- `KanbanBoard` drag-drop updates status via API
- `RequestModal` cascade selects (Category → Object → Construction)
- Toolbar filters display correct requests
- `AuthGuard` redirects unauthenticated users

**Example test structure (React Testing Library):**
```typescript
// src/components/KanbanBoard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import KanbanBoard from './KanbanBoard'

describe('KanbanBoard', () => {
  it('should call updateRequestStatus when drag-drop', async () => {
    const mockOnStatusChange = jest.fn()
    render(
      <KanbanBoard
        requests={[mockRequest]}
        session={mockSession}
        onStatusChange={mockOnStatusChange}
      />
    )
    // Simulate drag-drop
    // Expect mockOnStatusChange called
  })
})
```

## Missing Test Infrastructure

**Not configured:**
- Testing library (Jest, Vitest, Mocha)
- Component testing tool (React Testing Library, Enzyme)
- E2E testing (Cypress, Playwright, WebDriver)
- Mock/stub library (jest.mock, sinon)
- Test data generators (factories, fixtures)

**To add testing:**

1. **Install framework:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

2. **Create `jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}
```

3. **Add to `package.json`:**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

4. **Create `jest.setup.js`:**
```javascript
import '@testing-library/jest-dom'
```

5. **Create first test file:**
```bash
touch src/lib/shifts.test.ts
```

## Current Build Validation

The project relies on **build-time validation** instead of unit tests:

```bash
npm run build    # Validates:
                 # - TypeScript compilation (strict mode)
                 # - ESLint rules
                 # - React/Next.js issues
                 # - All imports resolve correctly
```

This is suitable for the current development stage (demo-ready, not production). As features stabilize, add unit tests for:
- API layer (Supabase interaction)
- Auth flows
- Business logic (shift calculation)
- Component behavior

## Code Review Checklist (Without Tests)

Since automated testing is not configured, use this checklist for manual validation:

**Before committing:**
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] TypeScript strict mode violations: none
- [ ] Error handling: try-catch present for async operations
- [ ] API calls: error checking present
- [ ] New pages: protected with `<AuthGuard roles={[...]}>`
- [ ] Styling: only Tailwind classes (no new CSS files unless necessary)
- [ ] Component imports: all use `@/` alias paths

---

*Testing analysis: 2025-03-01*
