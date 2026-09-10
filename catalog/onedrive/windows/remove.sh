#!/usr/bin/env bash
set -euo pipefail

# Stop the client first: OneDriveSetup refuses to uninstall while it is running, and winget then
# reports a failure that says nothing about the cause.
powershell.exe -NoProfile -Command \
  "Get-Process OneDrive -ErrorAction SilentlyContinue | Stop-Process -Force" 2>/dev/null || true

winget uninstall --id Microsoft.OneDrive -e --accept-source-agreements --disable-interactivity --purge --silent
