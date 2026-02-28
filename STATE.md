# STATE.md — Current Project State

## Status: Pre-development setup

## What has been done
- Project deployed at gormost.vercel.app (demo for colleagues)
- Core modules created: Dispatcher, Deputy/Foreman, Master/Brigadier, Service Chief, Boss Dashboard, Transport, Complaints, Admin Panel
- Database schema created manually in Supabase SQL Editor
- CLAUDE.md and .claudeignore configured for AI agent workflow
- Development methodology defined: file-based context, feature branches, build before commit

## What needs to be done next
1. Create PROJECT.md — full project description with modules and user roles
2. Create ARCHITECTURE.md — current codebase structure, components, data flows
3. Create REQUIREMENTS.md — what's in v1, what's in v2, what's out of scope
4. Create ROADMAP.md — phased plan of work
5. Remove gormost.tar from repository (binary bloat)

## Planned changes
- Add HR module (employee lists, personnel management)
- Move Settings out of main navigation (to a corner/secondary position)
- Restructure navigation for role-based access

## Current modules
| Module | Route | Status | Description |
|--------|-------|--------|-------------|
| Dispatcher | /dispatcher | Exists | Central control hub |
| Deputy/Foreman | /deputy | Exists | Shift planning |
| Master/Brigadier | /master | Exists | Task management |
| Service Chief | /chief | Exists | Service work plans |
| Boss Dashboard | /boss | Exists | KPI and statistics |
| Transport | /transport | Exists | Vehicle fleet |
| Complaints | /complaints | Exists | Handling complaints |
| Admin Panel | /admin | Exists | Reference data |
| HR | TBD | Planned | Employee lists and management |

## Tech Stack
- Next.js (check actual version in package.json)
- TypeScript 5.9.3
- Tailwind CSS 3.4.0
- Supabase 2.47.10
- @dnd-kit (drag and drop)
- Deployed on Vercel from main branch

## Key decisions
- Database changes: agent creates SQL migration files in supabase/migrations/, human reviews and executes
- Git workflow: feature branches, main must always be deployable
- No tests yet, npm run build is the minimum quality check
- English comments in code
- No new dependencies without human approval

## Development environment
- Home: Mac, Claude Code CLI installed
- Work: ALT Linux, Claude Code CLI installed
- Sync: GitHub (git pull/push between machines)
