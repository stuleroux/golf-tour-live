# Phase 4 Idempotent Supabase Importer

This adds the missing database-write step for the conservative Phase 4 package.

## Requirements
- Migration `20260930000100_phase4_import_identity.sql` already applied to `golf-tour-live-dev`.
- Existing committed `data/courses.csv`, `data/course_tees.csv`, `data/course_holes.csv`.
- `@supabase/supabase-js` installed in the project.
- Use the development project's service-role/secret key only. Never expose it in browser code or commit it.

## Dry run
`node scripts/import_phase4_supabase.mjs --dry-run`

Expected local validation: 460 courses / 2,273 tees / 3,888 holes / 216 routings. No DB writes occur.

## Hosted dev import
Set these only in the current PowerShell session:
`$env:SUPABASE_TEST_URL="https://YOUR_PROJECT_REF.supabase.co"`
`$env:SUPABASE_TEST_SERVICE_ROLE_KEY="YOUR_DEV_SERVICE_ROLE_KEY"`

Then:
`node scripts/import_phase4_supabase.mjs`

Run the exact same command a second time. Database counts must remain unchanged on run 2. The script prints before, after, and delta counts.
