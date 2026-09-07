#!/usr/bin/env bash
set -euo pipefail

# Remove whichever packaging is actually present. Detect recognises both, so removal has to as
# well — otherwise unchecking this would silently do nothing on a machine that used the flatpak.
# Every flatpak installation, not the first one found: an app can be installed system-wide and
# per-user at once, and stopping at the first left the other copy behind — after which detect
# correctly reported the entry as still present and the removal was recorded as a failure.
removed_flatpak=0
if command -v flatpak >/dev/null 2>&1; then
  for scope in --user --system; do
    if flatpak info "$scope" org.gnome.Boxes &>/dev/null; then
      flatpak uninstall "$scope" org.gnome.Boxes -y
      removed_flatpak=1
    fi
  done
fi
# Only fall through to apt when this was not a flatpak install at all. Boxes can be either.
[ "$removed_flatpak" -eq 1 ] && exit 0

PACKAGES=("gnome-boxes")

# `apt remove` silently drags out every reverse-dependency too. Measured on a real machine:
# removing `curl` would also have uninstalled Steam, and removing `python3-pip` would have
# uninstalled howdy (a PAM authentication module). Uninstalling one catalog entry must never
# quietly take unrelated software with it, so refuse and report instead of guessing.
COLLATERAL=$(apt-get -s remove "${PACKAGES[@]}" 2>/dev/null |
  awk '/^Remv/ {print $2}' |
  grep -vxF -f <(printf '%s\n' "${PACKAGES[@]}") || true)

if [ -n "$COLLATERAL" ]; then
  # Skip, don't fail: declining to touch unrelated software is the correct outcome here, not an
  # error. Uninstalling one entry must never remove anything the user didn't ask about.
  echo "Skipping removal of ${PACKAGES[*]}: apt would also remove:"
  printf '  - %s\n' $COLLATERAL
  echo "Left installed. Remove those packages explicitly first if that is really intended."
  # Exit 3, not 0: the engine verifies each action by re-running detect.sh afterwards, and this
  # entry is deliberately still installed. Reporting success would make that check call a correct,
  # protective decision a failure; 3 means "declined, nothing changed".
  exit 3
fi

sudo apt remove -y "${PACKAGES[@]}"
