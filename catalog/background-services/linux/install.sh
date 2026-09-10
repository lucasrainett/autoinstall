#!/usr/bin/env bash
set -euo pipefail

# A short list, chosen so that masking each one is defensible on a desktop:
#   cups-browsed   — auto-discovers network printers. Printing itself (cups) is untouched; only
#                    the discovery daemon goes, and it has a poor security record.
#   ModemManager   — manages mobile-broadband modems. Dead weight on a machine without one.
#
# Deliberately NOT included: bluetooth, avahi-daemon and cups. Each is widely relied on, and an
# entry that quietly breaks printing or local device discovery would cost far more than the few
# megabytes it saves. Masking rather than disabling, so nothing can pull them back up as a
# dependency.
UNITS=(cups-browsed ModemManager)

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd is not in use here, so there are no background services to reduce." >&2
  exit 3
fi

# One check, used both to decide whether there is anything to do and to decide what to touch.
# There used to be two — a `list-unit-files <pattern> | grep <unit>` guard and a
# `list-unit-files | grep ^<unit>` loop — and they disagreed on a CI runner: the guard let the
# script through, the loop matched nothing, and it printed "Background services reduced." having
# masked nothing at all. detect then correctly reported the entry as unsatisfied.
unit_exists() {
  systemctl list-unit-files "$1.service" 2>/dev/null | grep -q "^$1\.service"
}

masked=0
for unit in "${UNITS[@]}"; do
  if ! unit_exists "$unit"; then
    echo "$unit is not installed here; nothing to mask."
    continue
  fi
  sudo systemctl stop "$unit" 2>/dev/null || true
  if sudo systemctl mask "$unit" 2>/dev/null; then
    echo "Masked $unit."
    masked=$((masked + 1))
  else
    echo "Could not mask $unit." >&2
  fi
done

# Nothing to reduce is not the same as a reduction. On a machine that never had these services —
# a CI runner, a minimal server — there is nothing to change, and claiming otherwise made detect
# report the entry as unsatisfied for ever after.
if [ "$masked" -eq 0 ]; then
  echo "None of the services this entry reduces are present, so nothing was changed." >&2
  exit 3
fi

echo "Background services reduced ($masked masked)."
