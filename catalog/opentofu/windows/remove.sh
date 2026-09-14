#!/usr/bin/env bash
set -uo pipefail

# Portable package: winget unpacked a tofu.exe and registered a command alias. Asking winget to
# uninstall is still right — it owns the alias — but it answered "No installed package found" and
# exited non-zero, because its own record of a portable install does not match an `--id -e` query.
# Treat that specific outcome as "already gone" rather than as a failure.
out=$(winget uninstall --id OpenTofu.Tofu -e \
  --accept-source-agreements --disable-interactivity --purge --silent 2>&1)
rc=$?
echo "$out"

if [ "$rc" -ne 0 ]; then
  if echo "$out" | grep -qi "No installed package found"; then
    echo "winget has no record of it; checking whether the binary is gone anyway."
  else
    echo "winget uninstall returned $rc." >&2
    exit "$rc"
  fi
fi

# Same as detect: the shim lives in winget's Links directory, which this shell's PATH predates.
hash -r 2>/dev/null || true
WINGET_LINKS="${LOCALAPPDATA:-$HOME/AppData/Local}/Microsoft/WinGet/Links"
if [ -f "$WINGET_LINKS/tofu.exe" ] || [ -f "$WINGET_LINKS/tofu" ]; then
  echo "tofu is still installed in $WINGET_LINKS after the uninstall." >&2
  exit 1
fi
