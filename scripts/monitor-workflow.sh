#!/usr/bin/env bash
# Monitor GitHub Actions workflow runs using the `gh` CLI.
# Usage: ./scripts/monitor-workflow.sh <owner/repo> <workflow_file_or_name> <branch>
# Example: ./scripts/monitor-workflow.sh Raviprakashsa/MMD-MAIN-V1.2 ci-integration.yml chore/production-hardening

set -euo pipefail

REPO=${1:-}
WORKFLOW=${2:-ci-integration.yml}
BRANCH=${3:-chore/production-hardening}

if [ -z "$REPO" ]; then
  echo "Usage: $0 <owner/repo> <workflow-file-or-name> <branch>"
  exit 1
fi

echo "Listing recent runs for workflow '$WORKFLOW' on branch '$BRANCH' in repo '$REPO'"
gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$BRANCH" --limit 10

echo "To watch a run, copy the run id and run: gh run watch <run-id> --repo $REPO"
