$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot"

# 1) Remove cache files
Get-ChildItem -Path . -Filter *.tsbuildinfo -Recurse -Force |
  Remove-Item -Force -ErrorAction SilentlyContinue

# 2) Ensure ignore rules exist (idempotent)
$gitignorePath = ".gitignore"
if (-not (Test-Path $gitignorePath)) {
  New-Item -ItemType File -Path $gitignorePath | Out-Null
}

$gitignoreLines = Get-Content $gitignorePath
$gitignoreLines = $gitignoreLines | Where-Object {
  $_ -notmatch '^tsconfig\.tsbuildinfo$' -and $_ -notmatch '^\*\.tsbuildinfo$'
}
$gitignoreLines += "tsconfig.tsbuildinfo"
$gitignoreLines += "*.tsbuildinfo"
Set-Content -Path $gitignorePath -Value $gitignoreLines

# 3) Rebuild TypeScript cleanly
npx tsc --build --force

# 4) Untrack cached files if already tracked
$trackedTsBuildInfo = git ls-files | Select-String -Pattern "\.tsbuildinfo$"
foreach ($match in $trackedTsBuildInfo) {
  git rm --cached -- "$($match.Line)"
}

# 5) Stage .gitignore and script changes (no commit)
git add .gitignore cleanup-tsbuildinfo.ps1

Write-Host "Done: cleanup completed."