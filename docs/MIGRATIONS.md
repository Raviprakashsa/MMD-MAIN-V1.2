Database Migrations Guidance
===========================

This repo currently includes `db:seed` used for CI and test setups. For production use, consider migrating to a proper migration framework.

Options:
- Mongock / migrate-mongo / db-migrate / custom ts-node migrations

Recommended approach:
1. Adopt a migration tool (e.g., migrate-mongo) and store ordered migration files under `migrations/`.
2. Add npm scripts:
   - `npm run migrate` — run pending migrations
   - `npm run migrate:status`
3. Run migrations in CI/CD prior to deployment.

Example (migrate-mongo):
```bash
npm i -D migrate-mongo
npx migrate-mongo init
# create migration file and implement up/down
npx migrate-mongo up
```

If you keep seeding in CI, ensure seeds are idempotent and safe to run repeatedly.
