# Staging Testing Checklist

This document lists the required preconditions, commands, and verification steps to validate the application in a staging environment before production rollout.

## 1. Environment & secrets
- Required env vars (minimum):
  - `NODE_ENV=production` (for staging run as production-like)
  - `NEXTAUTH_SECRET` — set a secure secret
  - `NEXTAUTH_URL` — staging base URL (e.g., https://staging.example.com or http://staging:3000)
  - `DATABASE_URL` — Mongo connection for staging
  - `SENTRY_DSN` (optional but recommended)
  - `REDIS_URL` — required if using distributed throttling/session store
  - `AUTH_URL` / `NEXTAUTH_URL_INTERNAL` if used in your environment

Verify presence:

```bash
# Example (bash)
export NEXTAUTH_SECRET="$(openssl rand -hex 32)"
export NEXTAUTH_URL="http://staging:3000"
export DATABASE_URL="mongodb://mongo:27017/mmd-staging"
export REDIS_URL="redis://redis:6379"
```

## 2. Build and dependency lockfile
- Regenerate `package-lock.json` with Node 20 / npm 10 (if CI uses Node 20):

```bash
# Locally (recommended in a clean Node 20 environment)
rm -rf node_modules package-lock.json
npm install
npm run build
```

- Ensure CI uses the same lockfile and `npm ci` in pipeline.

## 3. Database migration & seed
- Apply migrations (if using `migrate-mongo`):

```bash
npm run migrate
# or in CI: migrate-mongo up --config migrate-mongo-config.js
```

- Seed test data for deterministic tests:

```bash
npm run db:seed
```

## 4. Start app (production-like)
- Use `next start` after build for production-like behavior:

```bash
npm run build
npm start
```

- For containerized staging, use the provided Dockerfile and k8s manifests in `k8s/`.

## 5. Verify health & critical endpoints
- Health endpoint (example):

```bash
curl -sS $NEXTAUTH_URL/api/health | jq
```

- Confirm `/api/auth/providers` and `/api/auth/session` respond 200.

## 6. Run automated tests (smoke + role-matrix + Playwright)
- Role-matrix runtime test (login + protected route access):

```bash
# from repo root
npm run test:role-matrix
```

- Playwright smoke/integration tests:

```bash
npx playwright test --project=chromium --reporter=list
```

- Visual/layout checks (optional):

```bash
npm run test:visual
npm run test:layout
```

## 7. Throttling / rate-limit readiness
- Ensure `REDIS_URL` is configured and staging has a Redis instance.
- Verify throttle middleware reads config and uses Redis (smoke: simulate bursts and observe headers/429).

## 8. Observability & error reporting
- Confirm `SENTRY_DSN` is set and app initializes Sentry.
- Trigger a non-destructive error in staging and verify it appears in Sentry (or logs).

## 9. Hydration / client issues
- Replicate client in incognito or without browser extensions to confirm any `data-scribe-recorder-ready` warnings are not from the app.
- If persistent, search for client code that mutates `<html>` (scripts or initializers) and wrap in client-only mount guards.

## 10. Acceptance sign-off items
- All Playwright tests pass.
- Role-matrix test completes for all roles (SUPER_ADMIN, ADMIN, COORDINATOR, RECRUITER, SCRAPER).
- No missing critical env/secrets.
- Lockfile regenerated and CI uses `npm ci` with the same lockfile.
- Redis configured for throttling if multi-instance staging.

---

If you want, I can:
- run the `npm run test:role-matrix` now and collect failures, or
- run `npx playwright test` (requires Playwright setup and browsers installed), or
- scan the codebase for `<html>` mutations to address the hydration warning.

Tell me which action to run next.