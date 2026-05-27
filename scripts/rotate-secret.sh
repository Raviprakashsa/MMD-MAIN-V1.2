#!/usr/bin/env bash
# Helper instructions for rotating NEXTAUTH_SECRET. DO NOT paste secrets into chat.
set -euo pipefail

echo "1) Generate a new secret locally (example using openssl):"
echo "   openssl rand -base64 48 > new_nextauth_secret.txt"

echo "2) Set GitHub Actions secret (requires gh CLI authenticated):"
echo "   gh secret set NEXTAUTH_SECRET --body-file=new_nextauth_secret.txt --repo <owner/repo>"

echo "3) Update hosting platform env vars (Vercel/Heroku/Kubernetes/other). Examples:"
echo "   # Vercel: vercel env add NEXTAUTH_SECRET production" 
echo "   # Kubernetes: kubectl create secret generic mmdss-secrets --from-file=NEXTAUTH_SECRET=new_nextauth_secret.txt -n <namespace> --dry-run=client -o yaml | kubectl apply -f -"

echo "4) Restart your app instances / deployments to pick up the new secret."

echo "5) Revoke old secret where applicable and verify logins and CI."

echo "NOTE: Do not commit or paste the secret anywhere public."
