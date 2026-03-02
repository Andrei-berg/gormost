---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: HR-модуль
status: defining_requirements
last_updated: "2026-03-02T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# STATE.md — Project Memory

## Current milestone: v2.0 — HR-модуль

## Status
Defining requirements. Milestone v2.0 started 2026-03-02.

## What has been done (accumulated)
- v1.0 fully implemented: 8 panels, kanban, request approval chain, transport, complaints, audit log
- v1.1 complete: UI/UX polish — EmptyState, Header LIVE counter, mobile responsive KPI, admin hamburger, lastUpdated wired to all LIVE panels
- Deploy: https://gormost.vercel.app (логин: 0000, PIN: 1234)
- CLAUDE.md, PROJECT.md, REQUIREMENTS.md, ROADMAP.md — docs maintained
- .planning/codebase/ — codebase map created (map-codebase)

## Current position
- Phase: Not started (defining requirements)
- Plan: —
- Last activity: 2026-03-02 — Milestone v2.0 started

## Next actions
1. Complete requirement scoping for HR module
2. Run roadmapper to create phased execution plan
3. `/gsd:plan-phase [N]` to start execution

## Key decisions
- БД: Supabase (PostgreSQL). Migrations — manual via SQL Editor, agent creates files only
- Deploy: Vercel, push to `main` = auto-deploy. `main` always deployable
- Style: component approach — page.tsx thin orchestrator, each section = separate file
- No tests — `npm run build` is minimum quality check
- Comments in English
- New dependencies — only with developer approval
- Admin panel removed from home page grid; admin users access /admin via hamburger Система section

## Tech stack
- Next.js 16 (App Router), TypeScript strict, Tailwind CSS, Supabase, @dnd-kit
- Deployed on Vercel from `main` branch

## Development environment
- Home: Mac, Claude Code CLI
- Work: ALT Linux, Claude Code CLI
- Sync: GitHub (git pull/push)

## Open questions
- HR-модуль: нужна ли отдельная роль `HR` или достаточно ADMIN/BOSS/ZAMPORAB?
- Печать нарядов: ждём шаблоны от Андрея с работы
