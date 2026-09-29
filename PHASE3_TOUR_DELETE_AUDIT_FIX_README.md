# Phase 3 Tour Delete Audit Fix

Copy these files into the root of the existing `golf-tour-live` repository.

This adds migration `20260929000800_fix_tour_delete_audit.sql` rather than rewriting any previously applied migration. When a Tour is deleted, `audit_log.tour_id` is set to NULL because the referenced Tour no longer exists. The deleted Tour UUID is retained in `entity_id` and the full deleted row remains in `old_data`.

The exact delete scenario has already been smoke-tested successfully in the hosted development database.
