#!/usr/bin/env bash
set -uo pipefail

# winget exits non-zero when the package is already present: it reports "No available upgrade
# found" and returns APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE. That is not a failure — it means
# "already at the latest version" — but every caller that checks the exit code sees one. Asking
# first turns a re-run into an honest no-op. Found by the first real Windows lifecycle run, where
# it failed three of four entries for this reason alone.
if winget list --id Logitech.OptionsPlus -e --accept-source-agreements 2>/dev/null | grep -qi "Logitech.OptionsPlus"; then
  echo "Logitech.OptionsPlus is already installed; nothing to do."
  exit 0
fi

# Logi Options+ needs a desktop session: its installer registers a device service and a tray
# component, and on a session-less machine it stops with exit code 1008 (ERROR_NO_TOKEN — "an
# attempt was made to reference a token that does not exist"). That is an environment mismatch
# rather than a broken entry, so it declines, the same as the Store apps and the GNOME-only
# settings do. Any other failure is still reported as one.
out=$(winget install --id Logitech.OptionsPlus -e \
  --accept-source-agreements --disable-interactivity --accept-package-agreements --silent 2>&1)
rc=$?
echo "$out"

if [ "$rc" -ne 0 ]; then
  if echo "$out" | grep -q "exit code: 1008"; then
    echo "Logi Options+ needs an interactive desktop session and could not install here." >&2
    echo "Nothing was changed." >&2
    exit 3
  fi
  exit "$rc"
fi
