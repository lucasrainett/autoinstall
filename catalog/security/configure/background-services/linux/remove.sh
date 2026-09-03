#!/usr/bin/env bash
set -euo pipefail

command -v systemctl >/dev/null 2>&1 || exit 0

# Unmask then enable: unmasking alone leaves a unit installed but inactive, which is not where it
# was found. Each step tolerates failure so one absent unit cannot strand the rest.
for unit in cups-browsed ModemManager; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^${unit}"; then
    sudo systemctl unmask "$unit" 2>/dev/null || true
    sudo systemctl enable --now "$unit" 2>/dev/null || true
    echo "Restored $unit."
  fi
done

echo "Background services restored."
