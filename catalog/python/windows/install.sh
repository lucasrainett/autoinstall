#!/usr/bin/env bash
set -euo pipefail
# `Python.Python.3` is not a package. In winget-pkgs it is a namespace directory whose children
# are the real packages — Python.Python.3.12, .3.13, .3.14 — so `-e` (exact) matched nothing and
# every install reported "No package found matching input criteria". It had never worked; nothing
# noticed because no Windows lifecycle run had ever completed.
#
# Presence and removal deliberately match the family rather than one minor version: a machine with
# 3.13 already on it should read as "Python is installed", not as "the wrong Python". Only the
# install has to name a concrete package, and that is the current stable series.

# winget exits non-zero when the package is already present: it reports "No available upgrade
# found" and returns APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE. That is not a failure — it means
# "already at the latest version" — but every caller that checks the exit code sees one.
if winget list --id Python.Python.3 --accept-source-agreements 2>/dev/null | grep -qi "Python.Python.3\."; then
  echo "A Python 3 is already installed; nothing to do."
  exit 0
fi

winget install --id Python.Python.3.14 -e \
  --accept-source-agreements --disable-interactivity --accept-package-agreements --silent
