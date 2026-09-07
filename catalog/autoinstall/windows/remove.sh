#!/usr/bin/env bash
set -euo pipefail

# Windows locks a running executable, so a self-removal launched from inside the running tool
# cannot delete it. Rather than leave a half-removed install — binary still there, PATH entry
# gone — this declines and changes nothing. Exit 3 is this catalog's "declined, nothing changed",
# which the runner reports as a decline rather than a failure.
BIN_DIR="${AUTOINSTALL_INSTALL_DIR:-$LOCALAPPDATA/autoinstall/bin}"
BIN="$BIN_DIR/autoinstall.exe"

if [ ! -f "$BIN" ]; then
  echo "autoinstall is not installed at $BIN; nothing to do."
  exit 0
fi

# A rename is the cheap test for "is this file locked": it succeeds only if nothing holds it open,
# and it is trivially reversible if the removal is declined afterwards.
if ! mv "$BIN" "$BIN.removing" 2>/dev/null; then
  echo "Cannot remove autoinstall while it is running — Windows locks a running executable." >&2
  echo "Close autoinstall and run this script again, or delete $BIN by hand." >&2
  exit 3
fi
rm -f "$BIN.removing"

powershell.exe -NoProfile -Command "
  \$dir = '$BIN_DIR'
  \$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  \$kept = (\$userPath -split ';' | Where-Object { \$_ -ne \$dir }) -join ';'
  if (\$kept -ne \$userPath) { [Environment]::SetEnvironmentVariable('Path', \$kept, 'User') }
"
echo "Removed autoinstall. Your saved selection and history are untouched."
