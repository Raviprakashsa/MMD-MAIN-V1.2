param(
    [string]$Repo = "Raviprakashsa/MMD-MAIN-V1.2",
    [string]$SecretName = "NEXTAUTH_SECRET",
    [string]$OutFile = "new_nextauth_secret.txt"
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "gh CLI not found. Install GitHub CLI and authenticate before running this script."
    exit 1
}

# Generate a 48-byte base64 secret
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

Set-Content -Path $OutFile -Value $secret -Encoding ASCII
Write-Output "Generated secret into $OutFile"

Write-Output "Uploading secret to GitHub repository $Repo as $SecretName"
# Use -b to pass the secret body (compatible with this gh version)
& gh secret set $SecretName -b (Get-Content -Raw $OutFile) --repo $Repo

Write-Output "Done. Remember to update your hosting environment variables and restart all nodes."
