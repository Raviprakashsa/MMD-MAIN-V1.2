Production Release Checklist
==========================

1. Ensure secrets are set
   - `NEXTAUTH_SECRET` is stored in production env/secret store.
   - `DATABASE_URL` points to the production DB.

2. Run checks
   - `npm ci`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`

3. Seed/migrate DB (if applicable)
   - `npm run db:seed` (ensure idempotent in production or use migrations)

4. Start app
   - Use process manager (systemd, pm2, or container platform).
   - Expose only necessary ports and enable TLS at the load balancer.

5. Smoke tests
   - Run Playwright smoke suite against the deployed host.

6. Post-release
   - Monitor logs for auth errors (JWT decryption/secret mismatch).
   - Rotate secrets carefully and restart all nodes together.
