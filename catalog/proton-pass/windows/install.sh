#!/usr/bin/env bash
set -euo pipefail

# winget exits non-zero when the package is already present: it reports "No available upgrade
# found" and returns APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE. That is not a failure — it means
# "already at the latest version" — but every caller that checks the exit code sees one. Asking
# first turns a re-run into an honest no-op. Found by the first real Windows lifecycle run, where
# it failed three of four entries for this reason alone.
if winget list --id Proton.ProtonPass -e --accept-source-agreements 2>/dev/null | grep -qi "Proton.ProtonPass"; then
  echo "Proton.ProtonPass is already installed; nothing to do."
  exit 0
fi

winget install --id Proton.ProtonPass -e \
  --accept-source-agreements --accept-package-agreements --silent
