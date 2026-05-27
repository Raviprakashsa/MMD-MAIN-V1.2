Secret Rotation Guide
=====================

If a secret has been exposed, rotate it immediately. This guide shows steps for `NEXTAUTH_SECRET`.

1. Generate a strong new secret locally (example):

```bash
openssl rand -base64 48 > new_nextauth_secret.txt
```

2. Update GitHub Actions secret (recommended):

```bash
gh secret set NEXTAUTH_SECRET --body-file=new_nextauth_secret.txt --repo <owner/repo>
```

Windows (PowerShell) helper
---------------------------

Use the included PowerShell script to generate and upload a secret on Windows:

```powershell
.
\scripts\rotate-secret.ps1 -Repo "<owner/repo>" -SecretName "NEXTAUTH_SECRET"
```

To monitor the integration workflow run, use the PowerShell monitor helper:

```powershell
.
\scripts\monitor-workflow.ps1 -Repo "<owner/repo>" -Workflow "ci-integration.yml" -Branch "chore/production-hardening"
```

3. Update hosting platform environment variables
- Vercel: `vercel env add NEXTAUTH_SECRET production`
- Heroku: `heroku config:set NEXTAUTH_SECRET=$(cat new_nextauth_secret.txt) --app your-app`
- Kubernetes: `kubectl create secret generic mmdss-secrets --from-file=NEXTAUTH_SECRET=new_nextauth_secret.txt -n namespace --dry-run=client -o yaml | kubectl apply -f -`

4. Restart application instances (all nodes) to ensure sessions decrypt with the new secret.

5. Revoke old secret and invalidate sessions if needed.

6. Verify:
- Login flows work
- No `JWTSessionError` in logs
- CI runs successfully

Do NOT paste the secret into chat or store it in source control.
