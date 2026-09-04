#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads, verifies and runs autoinstall on Windows.

.DESCRIPTION
    Windows has no curl|bash equivalent worth relying on, so this is the Windows half of the
    bootstrap. It fetches the release binary for this machine's architecture, checks it against
    the published SHA-256 checksum, and runs it.

    The checksum step is not optional: this downloads an executable that will be run with the
    user's privileges, and an unverified download is exactly the attack this tool should not
    introduce. If the checksum file is missing or does not match, nothing is executed.

.PARAMETER Version
    Release tag to install. Defaults to the latest release.

.PARAMETER Repo
    GitHub repository in owner/name form. Override when installing from a fork.
#>
[CmdletBinding()]
param(
    [string]$Version = "latest",
    # Kept in step with DEFAULT_UPDATE_REPO in src/version.ts, which the running tool uses to
    # check for its own updates. Overridable so a fork publishing its own releases works
    # unmodified.
    [string]$Repo = $env:AUTOINSTALL_REPO
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = "lucasrainett/autoinstall"
}

# Git for Windows provides Git Bash, which every catalog script runs through, and git itself for
# cloning a personal overlay repository. Checked before downloading anything so the requirement is
# reported up front rather than after a 100 MB download.
$gitBash = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $gitBash) {
    Write-Warning @"
Git for Windows was not found. autoinstall runs its catalog scripts through Git Bash, so it is
required. Install it first:
    winget install --id Git.Git -e
"@
}

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "aarch64" } else { "x86_64" }
$asset = "autoinstall-$arch-pc-windows-msvc.exe"

$releaseUrl = if ($Version -eq "latest") {
    "https://api.github.com/repos/$Repo/releases/latest"
} else {
    "https://api.github.com/repos/$Repo/releases/tags/$Version"
}

Write-Host "Resolving release from $Repo..."
# Handled explicitly rather than left to $ErrorActionPreference: a bare 404 from Invoke-RestMethod
# does not say what was being looked for. The two realistic causes are a repository with no
# releases yet and a wrong name, so the message names both.
try {
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ "User-Agent" = "autoinstall-bootstrap" }
} catch {
    Write-Error @"
Could not find a $Version release for $Repo.

Either that repository has not published a release yet, or the name is wrong.
Check https://github.com/$Repo/releases - and if you meant a different repository:

    `$env:AUTOINSTALL_REPO = 'owner/name'
    .\bootstrap.ps1
"@
    exit 1
}

$binaryAsset = $release.assets | Where-Object { $_.name -eq $asset }
$sumsAsset = $release.assets | Where-Object { $_.name -eq "SHA256SUMS" }

if (-not $binaryAsset) { Write-Error "This release has no $asset — it may not build for $arch yet." }
if (-not $sumsAsset) { Write-Error "This release publishes no SHA256SUMS, so the download cannot be verified. Refusing to run it." }

$dest = Join-Path $env:TEMP $asset
$sums = Join-Path $env:TEMP "SHA256SUMS"

Write-Host "Downloading $asset ($([math]::Round($binaryAsset.size / 1MB)) MB)..."
Invoke-WebRequest -Uri $binaryAsset.browser_download_url -OutFile $dest
Invoke-WebRequest -Uri $sumsAsset.browser_download_url -OutFile $sums

# Compare against the published checksum before the file is ever executed.
$expected = (Select-String -Path $sums -Pattern ([regex]::Escape($asset)) | Select-Object -First 1) -split '\s+' | Select-Object -First 1
$actual = (Get-FileHash -Path $dest -Algorithm SHA256).Hash.ToLower()

if (-not $expected) { Write-Error "SHA256SUMS contains no entry for $asset. Refusing to run an unverified binary." }
if ($actual -ne $expected.ToLower()) {
    Remove-Item $dest -Force
    Write-Error "Checksum mismatch for $asset (expected $expected, got $actual). The download was deleted and nothing was run."
}

Write-Host "Checksum verified. Starting autoinstall..."
& $dest @args
