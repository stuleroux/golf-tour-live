# Phase 3 Score Audit Fix

Copy these files into the root of the existing `golf-tour-live` repository.

This adds migration `20260929000700_fix_score_audit_trigger.sql` instead of changing the already-applied Migration 5. The correction makes the generic score-audit trigger use `match_id` as the audited entity key for `match_confirmations`, whose primary key is `match_id`, while retaining `id` for the other audited score tables.

The corrected function has already been smoke-tested directly in the hosted development database. After extraction run the full project test, typecheck, lint, and build gates before committing.
