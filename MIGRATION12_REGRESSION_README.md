# Migration 12 regression test

Place files as follows in the Golf Tour Live repository:

- `20260930000300_phase4_round_snapshots.sql` -> `supabase/migrations/20260930000300_phase4_round_snapshots.sql`
- `migration12_round_snapshots.test.mjs` -> `tests/integration/migration12-round-snapshots.test.mjs`

Run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Do not apply Migration 12 to hosted dev until all local gates pass.
