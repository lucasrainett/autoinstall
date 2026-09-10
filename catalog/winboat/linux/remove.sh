#!/usr/bin/env bash
set -euo pipefail

# WinBoat installs either as a deb or as an AppImage integrated through Gear Lever, so removal has
# to cover both. The AppImage half previously passed the literal string "winboat" to Gear Lever,
# which expects a path — so it removed nothing and reported success.
PACKAGES=("winboat")

# The check runs before anything is removed, so exit 3 means what it says: nothing changed. Doing
# it the other way round — remove first, check the apt package second — would have exited 3 after
# the snap was already gone. `apt-get -s remove` on a package that is not installed lists nothing,
# so this is a no-op on a machine that only has the AppImage.

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

if dpkg-query -W -f='${Status}' winboat 2>/dev/null | grep -q '^install ok installed$'; then
  sudo apt remove -y "${PACKAGES[@]}"
  exit 0
fi

command -v flatpak >/dev/null 2>&1 || { echo "flatpak is not installed; nothing to remove."; exit 0; }
flatpak info it.mijorus.gearlever &>/dev/null || {
  echo "Gear Lever is not installed, so nothing was integrated through it."; exit 0; }

# Column-padded output: the last field is the path. See the sibling AppImage entries.
# Matched case-insensitively: Gear Lever labels a row from the AppImage it integrated, so a file
# named winboat.appimage lists as "winboat", not "WinBoat". The case-sensitive /^WinBoat/ found
# nothing, the script reported "nothing to remove" and exited 0, and detect afterwards still said
# installed. detect had always matched with `grep -qi`, which is why the two disagreed.
APPIMAGE=$(flatpak run it.mijorus.gearlever --list-installed 2>/dev/null |
  awk 'tolower($0) ~ /^winboat/ { print $NF }' | head -1)

if [ -z "$APPIMAGE" ]; then
  echo "WinBoat is not integrated with Gear Lever; nothing to remove."
  exit 0
fi

flatpak run it.mijorus.gearlever --remove "$APPIMAGE" -y
