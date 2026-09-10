#!/usr/bin/env bash
set -euo pipefail

# Nothing to reduce is not the same as a reduction. On a machine that never had these services —
# a CI runner, a minimal server — masking them changes nothing, and detect afterwards reported the
# entry as unsatisfied. Decline instead of claiming a change that did not happen.
if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd is not in use here, so there are no background services to reduce." >&2
  exit 3
fi
present=false
for unit in cups-browsed ModemManager; do
  systemctl list-unit-files "$unit.service" 2>/dev/null | grep -q "$unit" && present=true
done
if [ "$present" = false ]; then
  echo "None of the services this entry reduces are installed, so there is nothing to change." >&2
  exit 3
fi

command -v systemctl >/dev/null 2>&1 || { echo "No systemd here; nothing to do." >&2; exit 1; }

# A short list, chosen so that disabling each one is defensible on a desktop:
#   cups-browsed   — auto-discovers network printers. Printing itself (cups) is untouched; only
#                    the discovery daemon goes, and it has a poor security record.
#   ModemManager   — manages mobile-broadband modems. Dead weight on a machine without one.
#
# Deliberately NOT included: bluetooth, avahi-daemon and cups. Each is widely relied on, and an
# entry that quietly breaks printing or local device discovery would cost far more than the few
# megabytes it saves. Masking rather than disabling, so nothing can pull them back up as a
# dependency.
for unit in cups-browsed ModemManager; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^${unit}"; then
    sudo systemctl stop "$unit" 2>/dev/null || true
    sudo systemctl mask "$unit" 2>/dev/null || true
    echo "Masked $unit."
  fi
done

echo "Background services reduced."
