# STATE.md — Project Memory

## Current milestone: 1.1 — UI/UX Polish

## Status
v1.0 полностью выполнен и задеплоен на Vercel.
Следующий шаг: начать работу над Milestone 1.1 (полировка UI/UX).

## What has been done
- v1.0 полностью реализован: 8 панелей, канбан, согласование заявок, транспорт, жалобы, аудит
- Деплой: https://gormost.vercel.app (логин: 0000, PIN: 1234)
- CLAUDE.md, PROJECT.md, REQUIREMENTS.md, ROADMAP.md — документация написана
- `.planning/codebase/` — карта кодовой базы создана (map-codebase)
- GSD-проект инициализирован
- Phase 01 Plan 01 complete: Shared EmptyState component, replaced 5 bare empty state strings across kanban/table/head/boss/zamporab panels (REQ-132)
- Phase 01 Plan 02 complete: Header LIVE elapsed counter, mobile clock hide, Admin sistema hamburger section, home page admin card removed

## Current position
- Phase: 01-uiux-improvements
- Last completed: 01-02-PLAN.md (2026-03-02)
- Stopped at: Completed 01-02-PLAN.md

## Next actions
1. Execute 01-03-PLAN.md — wire lastUpdated prop into LIVE panel pages
2. `npm run build` перед любым коммитом
3. Работать в feature-ветках

## Key decisions
- БД: Supabase (PostgreSQL). Миграции — вручную через SQL Editor, агент только создаёт файлы
- Деплой: Vercel, push в `main` = автодеплой. `main` всегда в рабочем состоянии
- Стиль: компонентный подход — page.tsx тонкий оркестратор, каждая секция = отдельный файл
- Нет тестов — `npm run build` минимальная проверка качества
- Комментарии в коде на английском
- Новые зависимости — только с одобрения разработчика
- lastUpdated != null check (covers both null and undefined) in TypeScript strict mode for LIVE counter conditional
- Admin panel removed from home page grid; admin users access /admin via hamburger Система section
- REQ-131 confirmed already working — no changes needed

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
