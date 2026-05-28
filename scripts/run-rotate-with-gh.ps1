$ghPath = 'C:\Program Files\GitHub CLI'
if (Test-Path $ghPath) {
    $env:PATH = $env:PATH + ';' + $ghPath
}

Write-Output "Using PATH: $env:PATH"
& .\scripts\rotate-secret.ps1 -Repo "Raviprakashsa/MMD-MAIN-V1.2" -SecretName "NEXTAUTH_SECRET"
