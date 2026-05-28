CI and Integration Test Guide
=============================

Required repository secrets
- `NEXTAUTH_SECRET` — a long random string used by NextAuth for signing/encryption.

What the workflow does
- Builds the app, starts a MongoDB service, seeds the database, starts Next.js in production mode, and runs Playwright integration tests.

Recommended local steps
On PowerShell (Windows):

```powershell
$env:NEXTAUTH_SECRET='your_local_secret'
$env:DATABASE_URL='mongodb://localhost:27017/mmdss'
npm ci
npm run db:seed
npm run build
npm run start
# in another shell: npx playwright test --reporter=list
```

On macOS / Linux:

```bash
export NEXTAUTH_SECRET='your_local_secret'
export DATABASE_URL='mongodb://localhost:27017/mmdss'
npm ci
npm run db:seed
npm run build
nohup npm run start >/tmp/server.log 2>&1 &
npx wait-on http://localhost:3000
npx playwright test --reporter=list
```

CI notes
- The workflow expects `NEXTAUTH_SECRET` to be set in repository secrets.
- The workflow uses a MongoDB service container; for hosted runners, no extra setup is required.
- `npm run db:seed` is run in CI to ensure predictable test data.

If you want, I can also add a smaller workflow that only runs typechecking / linting on pull requests.
## CI / Build Requirements

This project requires a few environment variables and steps for CI or local production builds.

Required environment variables
- `NEXTAUTH_SECRET` or `AUTH_SECRET`: cryptographically-strong secret used by NextAuth for JWT/session signing. MUST be set for `NODE_ENV=production`.
- `MONGODB_URI` or whichever DB connection you use (the project uses a MongoDB connection in `lib/db/mongodb`).
- `NODE_ENV`: should be `production` for production builds.
- `VERCEL_URL` / `NEXT_PUBLIC_BASE_URL` (optional): if you need absolute URLs for SSR-generated content.

Quick commands

Run lint, typecheck, and build locally (PowerShell example):

```powershell
$env:NEXTAUTH_SECRET = 'your_prod_secret_here'
$env:MONGODB_URI = 'mongodb+srv://user:pass@cluster/...'
npm run lint
npm run typecheck
npm run build
```

If you prefer to run a single CI-style script in your CI provider, ensure secrets are stored securely and then run the same commands in your pipeline.

Notes
- I removed the deprecated `.eslintignore` and moved ignore patterns into `eslint.config.mjs` (see `ignores`).
- The repo still reports ESLint warnings (unused vars) across dashboard UI files; these are non-blocking and can be cleaned up progressively.
- Do not commit any real secrets into source control. Use your CI provider's secret store.

If you want, I can:
- Quiet the remaining unused-var warnings automatically (will modify many UI files), or
- Create a focused PR that fixes those files one-by-one for safer review.
