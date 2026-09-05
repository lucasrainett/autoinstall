<#
.SYNOPSIS
    Installs autoinstall on Windows.

.DESCRIPTION
    Downloads the release binary for this machine, verifies its SHA256 checksum against the
    release's SHA256SUMS, installs it, and puts it on your PATH. Installs only — it does not run
    the tool.

    The checksum step is not optional. This installs software with the user's privileges; an
    unverified download-and-run would be the exact weakness this tool exists to help people avoid.

.EXAMPLE
    irm https://raw.githubusercontent.com/lucasrainett/autoinstall/master/install.ps1 | iex

.NOTES
    Git for Windows is required at run time, not install time: every catalog script runs through
    Git Bash. Checked here so the requirement is reported now rather than on first use.
#>
[CmdletBinding()]
param(
    [string]$Version = $(if ($env:VERSION) { $env:VERSION } else { "latest" }),
    # Kept in step with DEFAULT_UPDATE_REPO in src/version.ts, which the running tool uses to check
    # for its own updates. Overridable so a fork publishing its own releases works unmodified.
    [string]$Repo = $env:AUTOINSTALL_REPO,
    [string]$InstallDir = $env:AUTOINSTALL_INSTALL_DIR,
    [switch]$NoModifyPath
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) { $Repo = "lucasrainett/autoinstall" }
if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = Join-Path $env:LOCALAPPDATA "autoinstall\bin"
}

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "aarch64" } else { "x86_64" }
$asset = "autoinstall-$arch-pc-windows-msvc.exe"

$releaseUrl = if ($Version -eq "latest") {
    "https://api.github.com/repos/$Repo/releases/latest"
} else {
    "https://api.github.com/repos/$Repo/releases/tags/$Version"
}

Write-Host "Resolving $Version release from $Repo..."
# Handled explicitly rather than left to $ErrorActionPreference: a bare 404 does not say what was
# being looked for. The two realistic causes are a repository with no releases yet and a wrong
# name, so the message names both.
try {
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ "User-Agent" = "autoinstall-install" }
} catch {
    Write-Error @"
Could not find a $Version release for $Repo.

Either that repository has not published a release yet, or the name is wrong.
See https://github.com/$Repo/releases
"@
    exit 1
}

$binaryAsset = $release.assets | Where-Object { $_.name -eq $asset }
$sumsAsset = $release.assets | Where-Object { $_.name -eq "SHA256SUMS" }

if (-not $binaryAsset) { Write-Error "This release has no $asset - it may not build for your platform yet."; exit 1 }
if (-not $sumsAsset) { Write-Error "This release publishes no SHA256SUMS, so the download cannot be verified. Refusing to install it."; exit 1 }

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("autoinstall-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
    $binaryPath = Join-Path $tmp $asset
    $sumsPath = Join-Path $tmp "SHA256SUMS"

    Write-Host "Downloading $asset..."
    Invoke-WebRequest -Uri $binaryAsset.browser_download_url -OutFile $binaryPath
    Invoke-WebRequest -Uri $sumsAsset.browser_download_url -OutFile $sumsPath

    $line = Select-String -Path $sumsPath -Pattern ([regex]::Escape($asset)) | Select-Object -First 1
    if (-not $line) { Write-Error "SHA256SUMS has no entry for $asset. Refusing to install an unverified binary."; exit 1 }
    $expected = ($line.Line -split '\s+')[0]
    $actual = (Get-FileHash -Path $binaryPath -Algorithm SHA256).Hash

    if ($actual -ne $expected) {
        Write-Error @"
Checksum mismatch for $asset.
  expected $expected
  got      $actual
The download was discarded and nothing was installed.
"@
        exit 1
    }
    Write-Host "Checksum verified."

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    $target = Join-Path $InstallDir "autoinstall.exe"
    Copy-Item -Path $binaryPath -Destination $target -Force
    Write-Host "Installed to $target"
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

# PATH, for the user only - never the machine-wide variable, which needs admin and affects
# everyone. Appends only when absent, so re-running does not accumulate duplicates.
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$onPath = $userPath -split ';' | Where-Object { $_ -eq $InstallDir }
if ($onPath) {
    # already there
} elseif ($NoModifyPath) {
    Write-Host ""
    Write-Host "Not modifying your PATH (-NoModifyPath). Add this yourself:"
    Write-Host "  $InstallDir"
} else {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$InstallDir", "User")
    Write-Host "  PATH updated for your user account"
}

$gitBash = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

Write-Host ""
Write-Host "autoinstall is installed."
Write-Host ""
if (-not $gitBash) {
    Write-Host "  One thing first: Git for Windows is not installed, and every catalog script runs"
    Write-Host "  through Git Bash. Install it from https://git-scm.com/download/win"
    Write-Host ""
}
Write-Host "  Open a new terminal, then run:"
Write-Host "    autoinstall              # the interactive interface"
Write-Host "    autoinstall --dry-run    # show what it would change, touching nothing"
Write-Host ""
Write-Host "  Nothing is applied until you review the plan and confirm it."
