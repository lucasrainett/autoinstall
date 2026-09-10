#!/usr/bin/env bash
set -uo pipefail

# Same shape as Brave, and for the same reason: this is Chromium's installer, and its uninstall
# shows a confirmation page unless given --force-uninstall. Left to prompt, it ran past the
# ten-minute harness cap and was killed, wedging the Windows installer lock for the three entries
# that followed it in the same shard.
# Git Bash ships coreutils, so `timeout` is normally there. This must not die without it, or
# nothing would be uninstalled at all; the harness cap still applies, we just lose the ability to
# stop short of it.
bounded() {
  if command -v timeout >/dev/null 2>&1; then timeout 240 "$@"; else "$@"; fi
}

bounded winget uninstall --id eloston.ungoogled-chromium -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

roots=(
  "${LOCALAPPDATA:-$HOME/AppData/Local}/Chromium/Application"
  "/c/Program Files/Chromium/Application"
  "/c/Program Files (x86)/Chromium/Application"
)

for root in "${roots[@]}"; do
  [ -d "$root" ] || continue
  echo "winget left ungoogled-chromium at $root; running its own uninstaller."
  # setup.exe lives in a versioned subdirectory; newest first, since an upgrade keeps the old one.
  setup=$(find "$root" -name setup.exe -path "*/Installer/*" 2>/dev/null | sort -V | tail -1)
  [ -z "$setup" ] && { echo "  no setup.exe under $root" >&2; continue; }
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
done

for root in "${roots[@]}"; do
  if [ -d "$root" ]; then
    echo "ungoogled-chromium is still installed at $root." >&2
    exit 1
  fi
done
