# Phase 3 Audit Fix

Copy these files into the root of the existing `golf-tour-live` repository.

This creates migration `20260929000600_fix_audit_trigger.sql`, preserving the already-applied migration history rather than modifying Migration 3 retrospectively.

After extraction, run `git status --short`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before committing.
