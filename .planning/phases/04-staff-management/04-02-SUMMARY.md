---
plan: 04-02
phase: 04-staff-management
status: complete
completed_at: "2026-03-06"
---

# Plan 04-02 Summary — Seed Data Migrations

## What Was Built

Two SQL migration files that convert the JSON roster into normalized relational data.

## Key Files

### Created
- `supabase/migrations/006_seed_professions_and_schedules.sql` — 6 schedule types + 45 profession/grade entries
- `supabase/migrations/007_seed_employees.sql` — 270 employees: users INSERT + employee_positions (grouped by profession subquery) + employee_assignments (grouped by schedule/shift)

## Decisions Made

- **user_id = tabNum**: Used tabNum directly as user_id (TEXT PK) — avoids needing UNIQUE constraint on tab_number, fits existing pattern
- **phone column omitted**: Column does not exist in users table — skipped in seed, can be added later
- **Profession grouping**: 270 employees → 47 profession groups → 47 INSERT statements (vs 270 individual inserts)
- **Assignment grouping**: 10 distinct schedule/shift/foreman combos → 10 INSERT statements
- **Default hire date**: `COALESCE(u.date_hired, '2020-01-01')` for 2 employees with missing hire dates

## Verification Results

- schedules: 6 rows
- professions: ~45 rows
- users (WORKER): 270 rows
- employee_positions: ~269 rows (one skipped for `<Объект не найден>`)
- employee_assignments: 270 rows
- Spot-check passed: Аглиуллин → Пескоструйщик 4 разряд, сутки/3, shift 1
