# Phase 8 — KB migrations, split for the Supabase SQL Editor

Run in order, one file per query, wait for "Success" between each:

1. `01-apply-053.sql` — enrichment columns on `work_types` + `journal_objects`
2. `02-apply-054.sql` — `entity_aliases` table + indexes + `anon_all_entity_aliases` RLS policy
3. `03-apply-055.sql` — Гормост-Лефортово seed (8 objects, 5 work-type attributions, 28 aliases)
4. `04-verify.sql` — 4 checks; send the output back

Each file is plain SQL (lines starting with `--` are comments). Paste the whole file.

Authoritative copies live in `supabase/migrations/` — these are ordered duplicates for convenience.

Stop and report the exact error if:
- `02` errors near a uniqueness clause (must not contain `NULLS NOT DISTINCT`)
- `03` errors on a missing column / FK → 01 or 02 did not actually apply
