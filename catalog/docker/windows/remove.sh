#!/usr/bin/env bash
set -uo pipefail

# Docker Desktop's uninstall ran past the ten-minute harness cap and was killed, and killing winget
# mid-uninstall leaves the Windows installer lock held — which then blocked the eleven entries that
# followed it in the same shard. So the winget attempt is bounded here rather than left to be cut
# off, and Docker's own installer is driven directly if anything is left.
#
# `Docker Desktop Installer.exe uninstall` is Docker's documented command-line uninstall, at the
# all-user path or the per-user one. --quiet keeps it unattended.
# https://docs.docker.com/desktop/uninstall/
# Git Bash ships coreutils, so `timeout` is normally there. This must not die without it, or
# nothing would be uninstalled at all; the harness cap still applies, we just lose the ability to
# stop short of it.
bounded() {
  if command -v timeout >/dev/null 2>&1; then timeout 240 "$@"; else "$@"; fi
}

bounded winget uninstall --id Docker.DockerDesktop -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

installers=(
  "/c/Program Files/Docker/Docker/Docker Desktop Installer.exe"
  "${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/DockerDesktop/Docker Desktop Installer.exe"
)
for installer in "${installers[@]}"; do
  [ -f "$installer" ] || continue
  echo "winget left Docker Desktop in place; running its own uninstaller."
  bounded "$installer" uninstall --quiet
  echo "  uninstaller exit code: $?"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -f "$installer" ] || break
    sleep 2
  done
done

if [ -d "/c/Program Files/Docker/Docker" ]; then
  echo "Docker Desktop is still installed after both winget and its own uninstaller." >&2
  exit 1
fi
