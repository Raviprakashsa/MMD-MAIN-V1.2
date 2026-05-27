Sentry Integration Guide
======================

This document explains how to add Sentry for error monitoring.

1. Install (example):

```bash
npm install @sentry/node @sentry/tracing
```

2. Add SENTRY_DSN to your environment/secret store.

3. Minimal server setup (server entry / API route):

```ts
// lib/sentry.ts (example)
import * as Sentry from '@sentry/node'
import { RewriteFrames } from '@sentry/integrations'

export function initSentry(dsn: string) {
  if (!dsn) return
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    integrations: [new RewriteFrames({ root: global.__rootdir__ })],
  })
}
```

4. Initialize early in server startup (e.g., in a custom server or top-level server file):

```ts
import { initSentry } from './lib/sentry'
initSentry(process.env.SENTRY_DSN)
```

5. Add `SENTRY_DSN` to your CI and production secrets.

Notes:
- Do not log or commit the DSN value.
- Tune `tracesSampleRate` according to traffic and budget.
