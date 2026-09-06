#!/usr/bin/env bash
set -euo pipefail

MARKER="# autoinstall: telemetry block"

# Mask rather than purge. Masking is exactly reversible, whereas purging these packages would make
# "remove" mean "reinstall them" — a different operation with different risks. Package removal
# belongs to a cleanup-kind entry (Phase 5), not to a configure entry that must revert cleanly.
if command -v systemctl >/dev/null 2>&1; then
  for unit in whoopsie apport; do
    if systemctl list-unit-files 2>/dev/null | grep -q "^${unit}"; then
      sudo systemctl stop "$unit" 2>/dev/null || true
      sudo systemctl mask "$unit" 2>/dev/null || true
    fi
  done
fi

# Null-route the endpoints that receive the reports. Written as one marked block so that removal
# is an exact reversal rather than a guess at which lines were ours.
if ! grep -q "^${MARKER}" /etc/hosts 2>/dev/null; then
  printf '\n%s\n0.0.0.0 metrics.ubuntu.com\n0.0.0.0 popcon.ubuntu.com\n0.0.0.0 daisy.ubuntu.com\n0.0.0.0 errors.ubuntu.com\n' \
    "$MARKER" | sudo tee -a /etc/hosts > /dev/null
fi

# Best-effort: gsettings needs a running session bus, which a headless or container run does not
# have. A desktop machine gets these settings; anything else still gets the service masking and
# host blocking above, so a missing bus must not fail the entry.
if command -v gsettings >/dev/null 2>&1 && [ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  gsettings set org.gnome.desktop.privacy report-technical-problems false || true
  gsettings set org.gnome.desktop.privacy send-software-usage-stats false || true
  gsettings set org.gnome.desktop.privacy remember-app-usage false || true
fi

echo "Telemetry disabled."
