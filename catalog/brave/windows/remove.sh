#!/usr/bin/env bash
set -uo pipefail

# Brave's uninstall is what wedged an entire Windows lifecycle run, so this is deliberately
# defensive rather than a one-liner.
#
# What happened: `winget uninstall --id Brave.Brave --purge --silent` ran past the harness's
# ten-minute cap and was killed. Brave's own uninstaller shows a "why are you leaving" survey
# page unless it is given --force-uninstall, so winget sat waiting on a dialog nobody could see.
# Killing winget mid-uninstall left the Windows Installer busy, and every winget operation for the
# rest of the run — sixteen of them — then sat on "Waiting for another install/uninstall to
# complete..." until it too was killed at ten minutes. One interactive uninstaller cost about two
# and a half hours and the entire remainder of the run.
#
# So: bound the winget attempt ourselves rather than letting the harness kill it mid-flight, and
# drive Brave's own setup.exe with the switches Chromium's installer documents for unattended
# removal.
# Git Bash ships coreutils, so `timeout` is normally there — but this must not die if it is not,
# because then nothing would be uninstalled at all. Without it the harness's own cap still applies;
# we simply lose the ability to stop short of it.
bounded() {
  if command -v timeout >/dev/null 2>&1; then timeout 240 "$@"; else "$@"; fi
}

bounded winget uninstall --id Brave.Brave -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

# Brave installs per-user by default and per-machine when elevated, so both roots are checked.
# The fact on disk is the Application directory; `winget list` reads Add/Remove Programs and lags.
roots=(
  "${LOCALAPPDATA:-$HOME/AppData/Local}/BraveSoftware/Brave-Browser/Application"
  "/c/Program Files/BraveSoftware/Brave-Browser/Application"
  "/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application"
)

for root in "${roots[@]}"; do
  [ -d "$root" ] || continue
  echo "winget left Brave at $root; falling back to its own uninstaller."

  # setup.exe lives in a versioned subdirectory (…/Application/1.2.3.4/Installer/setup.exe).
  # Newest first, because an upgraded install keeps the old version's folder around.
  setup=$(find "$root" -name setup.exe -path "*/Installer/*" 2>/dev/null | sort -V | tail -1)
  if [ -z "$setup" ]; then
    echo "  no setup.exe under $root" >&2
    continue
  fi

  # --force-uninstall is the switch that suppresses the survey page; without it the uninstaller
  # waits for a click. --system-level is passed only for the machine-wide install, since it
  # changes which registration is removed.
  args=(--uninstall --force-uninstall --chrome)
  case "$root" in
    /c/Program*) args+=(--system-level) ;;
  esac

  echo "  running: $setup ${args[*]}"
  bounded "$setup" "${args[@]}"
  echo "  uninstaller exit code: $?"

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -d "$root" ] || break
    sleep 2
  done
  echo "  after waiting, $root $([ -d "$root" ] && echo 'still exists' || echo 'is gone')"
done

for root in "${roots[@]}"; do
  if [ -d "$root" ]; then
    echo "Brave is still installed at $root after both winget and its own uninstaller." >&2
    exit 1
  fi
done
