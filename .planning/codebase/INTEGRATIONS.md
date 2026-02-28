# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**Supabase (Primary Database):**
- Service: Supabase (PostgreSQL backend)
- What it's used for: All data persistence, user management, real-time data synchronization
- SDK/Client: @supabase/supabase-js 2.47.10
- Auth: Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: Environment variables in `.env.local`
  - Client: @supabase/supabase-js
  - Initialized in: `src/lib/supabase.ts`

**Database Tables:**
- `users` - User accounts with roles, PIN codes, service assignments
- `services` - Service definitions (SRV-ENG, SRV-STR, SRV-FIRE, SRV-VENT, SRV-CCTV)
- `categories` - Work categories
- `objects` - Geographic/structural objects
- `constructions` - Construction site definitions
- `work_types` - Types of work within constructions
- `requests` - Work requests with status lifecycle
- `request_assignments` - User assignments to requests
- `staff_requests` - Inter-service staff transfer requests
- `remarks` - Comments/remarks on requests (complaints)
- `changelog` - Audit log of all actions

**File Storage:**
- Not integrated - No external file storage (local filesystem only if needed)

**Caching:**
- None detected - Direct Supabase client usage without cache layer

## Authentication & Identity

**Auth Provider:**
- Custom PIN-based authentication (no external provider)
  - Implementation: `src/lib/auth.ts`
  - Mechanism: Tab number + PIN code verification against `users` table
  - Session storage: localStorage (key: `gormost_session`)

**Session Management:**
- Session stored in browser localStorage as JSON
- Session structure: `AuthSession` type in `src/types/index.ts`
  - Contains: `user_id`, `tab_number`, `full_name`, `role_level`, `service_id`, `position`
  - No JWT or external token management

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, LogRocket, or error tracking service

**Logs:**
- Application audit logging via custom logger: `src/lib/logger.ts`
  - Logs written to `changelog` table in Supabase
  - Captures: user actions, entity modifications, login/logout events
  - Browser console: `console.error()` for development diagnostics

## CI/CD & Deployment

**Hosting:**
- Vercel (production deployment)
  - Automatic deploy on `main` branch pushes
  - Live URL: https://gormost.vercel.app
  - Environment variables configured in Vercel dashboard

**CI Pipeline:**
- None detected in codebase
- No GitHub Actions workflows or CI configuration files
- Manual build verification required before git commits

## Environment Configuration

**Required env vars:**
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL (public, in NEXT_PUBLIC_*)
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key (public, in NEXT_PUBLIC_*)
```

**Optional env vars:**
- None configured beyond Supabase credentials

**Secrets location:**
- `.env.local` file (not in git)
- Vercel dashboard (for production environment)
- Never include secrets in `.env.example`

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints or API routes configured

**Outgoing:**
- None detected - No external API calls or webhook triggers to third-party services

## Real-Time Features

**Supabase Real-Time:**
- Not actively used in current implementation
- @supabase/supabase-js supports real-time subscriptions via `on('*')` pattern
- Could be enabled for live request updates, but not currently implemented

## Browser APIs & Third-Party Libraries

**Date Handling:**
- date-fns 3.0.0 - Date formatting and calculations
- Native Intl API - Localization (Russian locale used in `src/lib/shifts.ts`)

**UI Libraries:**
- @dnd-kit ecosystem - Drag-and-drop functionality
  - Used in `src/components/KanbanBoard.tsx`
  - Enables kanban board reorganization

**Styling Integration:**
- Tailwind CSS classes - All styling through utility classes
- No custom CSS-in-JS library
- No styled-components or emotion

## Security Considerations

**CORS:**
- Supabase client handles CORS automatically
- No explicit CORS configuration needed (Supabase whitelist managed via project settings)

**Authentication:**
- PIN codes stored in `users.pin_code` (plain text comparison)
- Sessions stored in localStorage (XSS vulnerable if malicious script injected)
- No HTTPS enforcement visible (delegated to Vercel)

**Database Access:**
- Uses Supabase anonymous key with row-level security (RLS)
- RLS policies must be configured in Supabase project
- User identity passed via session in app code (not via Supabase auth)

---

*Integration audit: 2026-03-01*
