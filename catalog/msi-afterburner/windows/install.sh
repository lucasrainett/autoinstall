#!/usr/bin/env bash
set -euo pipefail

# Bundles RivaTuner Statistics Server, which its installer offers separately; --silent accepts the
# vendor's defaults rather than leaving a dialog waiting for input on an unattended run.
# winget exits non-zero when the package is already present: it reports "No available upgrade
# found" and returns APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE. That is not a failure — it means
# "already at the latest version" — but every caller that checks the exit code sees one. Asking
# first turns a re-run into an honest no-op. Found by the first real Windows lifecycle run, where
# it failed three of four entries for this reason alone.
if winget list --id Guru3D.Afterburner -e --accept-source-agreements 2>/dev/null | grep -qi "Guru3D.Afterburner"; then
  echo "Guru3D.Afterburner is already installed; nothing to do."
  exit 0
fi

winget install --id Guru3D.Afterburner -e \
  --accept-source-agreements --disable-interactivity --accept-package-agreements --silent
