# Phase 3 Audit History Fix

Adds Migration 9. The audit log keeps historical Tour UUIDs after Tour deletion, so audit_log.tour_id intentionally no longer has a foreign key to public.tours. The exact cascade deletion scenario has been smoke-tested successfully in the hosted development database.
