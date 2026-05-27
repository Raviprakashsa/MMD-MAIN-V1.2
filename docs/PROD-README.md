Production Deployment README
===========================

This file summarizes recommended production deployment steps and options.

1. Prepare secrets
   - NEXTAUTH_SECRET: long random string
   - DATABASE_URL: production MongoDB connection string
   - SENTRY_DSN: optional for monitoring

2. Build and push image
   - `docker build -t myregistry/mmdss:latest .`
   - `docker push myregistry/mmdss:latest`

3. Kubernetes example (apply manifests in `k8s/`), ensure you create `mmdss-secrets` with keys `DATABASE_URL` and `NEXTAUTH_SECRET`.

4. Run smoke tests (Playwright) against the staging URL.

5. Promote to production and monitor logs for NextAuth & DB errors.
