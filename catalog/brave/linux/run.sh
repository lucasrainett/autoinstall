#!/usr/bin/env bash
# Starts the application. Optional operation: an entry without one simply cannot be started from
# the tool, which is the honest answer for a command-line utility with nothing to open.
#
# Resolved at run time from the desktop entry rather than hardcoding a binary path. Apt, deb and
# vendor installers put executables in /usr/bin, /opt/<vendor>/, or a versioned directory under
# either, and the binary is often not named after the application. Every one of them does install
# a .desktop file, and that is also what the desktop's own launcher uses — so a match here is a
# thing the user could have clicked.
#
# Matched on a substring of Name= because desktop entries rarely use the bare product name:
# Brave calls itself "Brave Web Browser", Thunderbird "Mozilla Thunderbird".
set -euo pipefail

SEARCH="Brave"
DIRS=(
  /usr/share/applications
  "$HOME/.local/share/applications"
  /var/lib/flatpak/exports/share/applications
  "$HOME/.local/share/flatpak/exports/share/applications"
  /var/lib/snapd/desktop/applications
)

desktop=""
for dir in "${DIRS[@]}"; do
  [ -d "$dir" ] || continue
  # -m1 per file, then take the first file: enough to identify the entry, and it stops grep from
  # walking every localisation of every Name= line in a large applications directory.
  # `|| true` is load-bearing under `set -e`: an assignment takes its pipeline's exit status, and
  # grep exits 1 for a directory with no match. Without it the first empty directory ended the
  # script before it ever reached the one holding the entry — which is most of them.
  found=$(grep -rlEi "^Name(\[[a-z_]+\])?=.*${SEARCH}" "$dir" 2>/dev/null \
    | grep -vE 'url-handler|settings|\.desktop\.desktop' | sort | head -1) || true
  if [ -n "$found" ]; then desktop="$found"; break; fi
done

if [ -z "$desktop" ]; then
  echo "No desktop entry matching \"${SEARCH}\" — is it installed?" >&2
  exit 1
fi

# gio launch honours the entry's own Exec, TryExec and Terminal fields, including the field codes
# (%U, %F) that a naive `Exec` invocation would pass through as literal arguments.
exec gio launch "$desktop" "$@"
