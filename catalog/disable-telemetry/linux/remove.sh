#!/usr/bin/env bash
set -euo pipefail

MARKER="# autoinstall: telemetry block"

if command -v systemctl >/dev/null 2>&1; then
  for unit in whoopsie apport; do
    sudo systemctl unmask "$unit" 2>/dev/null || true
  done
fi

# Deletes exactly the marked block — the marker line and the entries following it, up to the next
# blank line — and nothing else, so any hosts entries the user added themselves survive.
if grep -q "^${MARKER}" /etc/hosts 2>/dev/null; then
  TMP="$(mktemp)"
  # Blank lines are buffered rather than printed immediately, so the one this entry inserted
  # *before* its marker is dropped along with the block. Without that, every apply/revert cycle
  # would leave another blank line behind and /etc/hosts would slowly grow.
  awk -v marker="$MARKER" '
    !inblock && /^[[:space:]]*$/ { pending = pending $0 "\n"; next }
    $0 == marker { inblock = 1; pending = ""; next }
    inblock && /^[[:space:]]*$/ { inblock = 0; next }
    inblock { next }
    { printf "%s", pending; pending = ""; print }
    END { printf "%s", pending }
  ' /etc/hosts > "$TMP"
  sudo cp "$TMP" /etc/hosts
  rm -f "$TMP"
fi

if command -v gsettings >/dev/null 2>&1 && [ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  for k in report-technical-problems send-software-usage-stats remember-app-usage; do
    gsettings reset org.gnome.desktop.privacy "$k" || true
  done
fi

echo "Telemetry settings reverted."
