#!/usr/bin/env bash
set -uo pipefail

# winget exits non-zero when the package is already present: it reports "No available upgrade
# found" and returns APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE. That is not a failure — it means
# "already at the latest version" — but every caller that checks the exit code sees one. Asking
# first turns a re-run into an honest no-op. Found by the first real Windows lifecycle run, where
# it failed three of four entries for this reason alone.
if winget list --id MarkText.MarkText -e --accept-source-agreements 2>/dev/null | grep -qi "MarkText.MarkText"; then
  echo "MarkText.MarkText is already installed; nothing to do."
  exit 0
fi

# MarkText's installer crashes on a machine with no interactive desktop: winget reports
# "Installer failed with exit code: 3221225477", which is 0xC0000005, an access violation — the
# installer process died rather than returning an error. It is an Electron/NSIS bundle that expects
# a session to draw into. That is an environment mismatch, not a broken entry, so it declines the
# same way the Store apps and the GNOME-only settings do. Any other failure is still a failure.
out=$(winget install --id MarkText.MarkText -e \
  --accept-source-agreements --disable-interactivity --accept-package-agreements --silent 2>&1)
rc=$?
echo "$out"

if [ "$rc" -ne 0 ]; then
  if echo "$out" | grep -q "exit code: 3221225477"; then
    echo "MarkText's installer crashed; it needs an interactive desktop session." >&2
    echo "Nothing was changed." >&2
    exit 3
  fi
  exit "$rc"
fi
