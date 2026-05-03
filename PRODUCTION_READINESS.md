# Production Readiness Notes

## Current Status

- Production build passes with `npm run build`.
- TypeScript passes with `npm run typecheck`.
- ESLint passes with warnings only.
- Login no longer exposes demo account hints by default.
- Authentication no longer auto-creates or resets default users during sign-in.
- Production requires an explicit `DATABASE_URL`.
- Google Fonts are no longer fetched during build.
- Core security headers are configured in `next.config.mjs`.
- Requirement creation/update now enforces active signed company MOU status.

## Required Before Selling To Customers

- Configure strong production values for `DATABASE_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `CRON_SECRET`, and `DOCUMENT_DOWNLOAD_SECRET`.
- Create real customer/admin users through a controlled seed/admin flow, not through runtime auth.
- Run `npm run release:check` before every release.
- Run `npm audit --audit-level=moderate` and review the remaining ExcelJS/uuid advisory. Do not force the current npm fix without regression testing spreadsheet exports.
- Replace any demo/synthetic seed data before tenant/customer onboarding.
- Decide the production storage strategy for `.storage/uploads`; local disk is not enough for multi-instance/cloud deployments.

## Known Remaining Work

- `npm audit` still reports `uuid <14` through `exceljs@4.4.0`. The vulnerable uuid code path affects v3/v5/v6 buffer usage; ExcelJS currently imports uuid v4 through CommonJS, and uuid v14 is ESM-only, so a direct override is risky.
- ESLint reports 139 warnings, mostly unused imports/state in dashboard/design surfaces. They do not block the build, but they should be cleaned before a polished customer handoff.
- This folder is not a git repository, so changes are not versioned locally unless you initialize or copy them into source control.
