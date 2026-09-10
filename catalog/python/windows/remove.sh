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

# Removes whichever Python 3 is actually installed, resolved from winget's own output, rather than
# guessing at a minor version. Naming the namespace directly would make winget refuse with
# "multiple packages found" as soon as two are installed.
INSTALLED=$(winget list --id Python.Python.3 --accept-source-agreements 2>/dev/null |
  grep -oE "Python\.Python\.3\.[0-9]+" | sort -u)

if [ -z "$INSTALLED" ]; then
  echo "No Python 3 is installed through winget; nothing to do."
  exit 0
fi

for id in $INSTALLED; do
  echo "Removing $id"
  winget uninstall --id "$id" -e --accept-source-agreements --disable-interactivity --purge --silent
done
