#!/usr/bin/env bash
set -uo pipefail

# OpenTofu is a portable package: winget unpacks tofu.exe and registers it in Add/Remove Programs
# with the uninstall command "winget uninstall --product-code OpenTofu.Tofu_Microsoft.Winget.Source_…".
# `winget uninstall --id OpenTofu.Tofu -e` answered "No installed package found" against that very
# install — shown by the before/after snapshots, which still had the registry entry and the
# WinGet\Links\tofu.exe shim after it. So the product code is read from the registry and used, as
# Windows itself would.
code=""
for hive in 'HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall' \
            'HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall' \
            'HKLM\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'; do
  # MSYS_NO_PATHCONV: Git Bash would otherwise rewrite /s and /f into Windows paths.
  code=$(MSYS_NO_PATHCONV=1 reg.exe query "$hive" /s /f "OpenTofu" 2>/dev/null | tr -d '\r' |
         grep -oE 'product-code [^ ]+' | head -1 | cut -d' ' -f2)
  [ -n "$code" ] && break
done

if [ -n "$code" ]; then
  echo "Removing through the product code Add/Remove Programs registered: $code"
  winget uninstall --product-code "$code" \
    --accept-source-agreements --disable-interactivity --silent || true
else
  winget uninstall --id OpenTofu.Tofu -e \
    --accept-source-agreements --disable-interactivity --purge --silent || true
fi

# The shim lives in winget's Links directory, which this shell's PATH predates; the file is the fact.
hash -r 2>/dev/null || true
WINGET_LINKS="${LOCALAPPDATA:-$HOME/AppData/Local}/Microsoft/WinGet/Links"
if [ -f "$WINGET_LINKS/tofu.exe" ] || [ -f "$WINGET_LINKS/tofu" ]; then
  echo "tofu is still installed in $WINGET_LINKS after the uninstall." >&2
  exit 1
fi
