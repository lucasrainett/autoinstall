#!/usr/bin/env bash
set -euo pipefail

command -v systemctl >/dev/null 2>&1 || exit 0

# The same check install.sh uses, and for the same reason it was changed there: the previous
# `systemctl list-unit-files | grep "^<unit>"` matched nothing on a runner where
# `list-unit-files <unit>.service` matched fine. The removal printed "Background services restored"
# having unmasked nothing, and detect afterwards still found ModemManager masked — which the
# harness correctly reported as a removal that had not happened.
unit_exists() {
  systemctl list-unit-files "$1.service" 2>/dev/null | grep -q "^$1\.service"
}

# Unmask then enable: unmasking alone leaves a unit installed but inactive, which is not where it
# was found. Each step tolerates failure so one absent unit cannot strand the rest.
restored=0
for unit in cups-browsed ModemManager; do
  if ! unit_exists "$unit"; then
    echo "$unit is not installed here; nothing to restore."
    continue
  fi
  sudo systemctl unmask "$unit" 2>/dev/null || true
  sudo systemctl enable --now "$unit" 2>/dev/null || true
  echo "Restored $unit."
  restored=$((restored + 1))
done

echo "Background services restored ($restored)."
