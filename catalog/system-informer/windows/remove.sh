#!/usr/bin/env bash
set -uo pipefail

# Hung at "Starting package uninstall..." until the harness killed it at ten minutes, wedging the
# Windows installer lock for the entries behind it. System Informer ships an Inno Setup uninstaller,
# and winget's --silent does not reach it; Inno's own switches do.
#
# /VERYSILENT suppresses the wizard entirely, /SUPPRESSMSGBOXES answers the prompts it would still
# raise, and /NORESTART stops it asking to reboot. MSYS_NO_PATHCONV keeps Git Bash from rewriting
# them into paths before the uninstaller sees them.
UNINSTALLERS=(
  "/c/Program Files/SystemInformer/unins000.exe"
  "/c/Program Files (x86)/SystemInformer/unins000.exe"
  "${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/SystemInformer/unins000.exe"
)

for u in "${UNINSTALLERS[@]}"; do
  [ -f "$u" ] || continue
  echo "Running System Informer's own uninstaller before winget, so nothing waits on a wizard."
  MSYS_NO_PATHCONV=1 "$u" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
  echo "  uninstaller exit code: $?"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -f "$u" ] || break
    sleep 2
  done
  break
done

winget uninstall --id WinsiderSS.SystemInformer -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

for u in "${UNINSTALLERS[@]}"; do
  if [ -f "$u" ]; then
    echo "System Informer is still installed at $(dirname "$u")." >&2
    exit 1
  fi
done
