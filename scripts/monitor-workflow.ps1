param(
    [string]$Repo = "Raviprakashsa/MMD-MAIN-V1.2",
    [string]$Workflow = "ci-integration.yml",
    [string]$Branch = "chore/production-hardening"
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "gh CLI not found. Install GitHub CLI and authenticate before running this script."
    exit 1
}

Write-Output "Fetching latest run for workflow $Workflow on branch $Branch"
$runJson = gh run list --repo $Repo --workflow $Workflow --branch $Branch --limit 1 --json databaseId,status 2>$null
if ($LASTEXITCODE -ne 0 -or -not $runJson) {
    Write-Output "Couldn't fetch run metadata via gh --json. Showing recent runs instead:"
    gh run list --repo $Repo --workflow $Workflow --branch $Branch --limit 5
    exit 0
}

$run = $runJson | ConvertFrom-Json
if (-not $run -or $run.Count -eq 0) {
    Write-Output "No recent runs found for $Workflow on $Branch"
    exit 0
}

$runId = $run[0].databaseId
Write-Output "Watching run $runId"
gh run watch $runId --repo $Repo
