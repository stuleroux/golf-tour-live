# Phase 4 Conservative Import Package

Source: `Phase4_validation_results.xlsx`.

V1 imports only records already accepted by the strict validator. Quarantined records are intentionally excluded.

Expected generated counts:
- 460 courses represented by the structurally valid rated-tee set
- 2,273 structurally valid rated tees
- 3,888 validated hole rows / 216 fully validated 18-hole tee routings

## Build
Copy `Phase4_validation_results.xlsx` into this package root and run:
`python scripts/build_phase4_import.py`

## Import approach
1. Apply migration `20260930000100_phase4_import_identity.sql`.
2. Import `data/courses.csv`, then `data/course_tees.csv`, then `data/course_holes.csv` using upsert semantics keyed by the deterministic UUID `id` values.
3. Re-running the exact import must not change row counts.

Do not import the Quarantine sheet in V1.
