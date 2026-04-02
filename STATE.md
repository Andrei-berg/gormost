# STATE.md — Current Project State

## Status: Active development

## What has been done
- Project deployed at gormost.vercel.app (demo for colleagues)
- Core modules created: Dispatcher, Deputy/Foreman, Master/Brigadier, Service Chief, Boss Dashboard, Transport, Complaints, Admin Panel
- Database schema created manually in Supabase SQL Editor
- CLAUDE.md and .claudeignore configured for AI agent workflow
- Development methodology defined: file-based context, feature branches, build before commit
- HR module implemented (employee lists, statuses, shift assignments, reports, докладная)
- GSD workflow active — multiple phases planned and executed
- Vitest configured: 30 tests covering shift calculation logic
- GitHub Actions CI pipeline: build + test runs on every push/PR

## What needs to be done next
1. Create PROJECT.md — full project description with modules and user roles
2. Create ARCHITECTURE.md — current codebase structure, components, data flows
3. Create REQUIREMENTS.md — what's in v1, what's in v2, what's out of scope
4. Create ROADMAP.md — phased plan of work
5. Remove gormost.tar from repository (binary bloat)

## Planned changes
- HR reporting: export to Excel/PDF
- Move Settings out of main navigation (to a corner/secondary position)
- Restructure navigation for role-based access

## Current modules
| Module | Route | Status | Description |
|--------|-------|--------|-------------|
| Dispatcher | /dispatcher | Active | Central control hub |
| Deputy/Foreman | /zamporab | Active | Shift planning |
| Master/Brigadier | /foreman | Active | Task management |
| Service Chief | /head | Active | Service work plans |
| Boss Dashboard | /boss | Active | KPI and statistics |
| Transport | /transport | Active | Vehicle fleet |
| Complaints | /complaints | Active | Handling complaints |
| Admin Panel | /admin | Active | Reference data |
| HR | /hr | Active | Employee lists, statuses, reports |
| Safety | /safety | Active | Safety certificates |
| Planner | /planner | Active | Shift schedule planning |

## Tech Stack
- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Supabase (PostgreSQL)
- Vitest (unit tests)
- GitHub Actions (CI: build + test)
- Deployed on Vercel from main branch

## Key decisions
- Database changes: agent creates SQL migration files in supabase/migrations/, human reviews and executes
- Git workflow: main must always be deployable (colleagues see the demo)
- Tests: Vitest, `npm run test` must pass before every commit (same rule as `npm run build`)
- CI/CD: GitHub Actions runs build + test on every push to main and on PRs
- English comments in code
- No new dependencies without human approval

## Development environment
- Home: Mac, Claude Code CLI installed
- Work: ALT Linux, Claude Code CLI installed
- Sync: GitHub (git pull/push between machines)
