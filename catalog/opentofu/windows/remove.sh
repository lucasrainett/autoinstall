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

if command -v tofu >/dev/null 2>&1; then
  echo "tofu is still on PATH after the uninstall." >&2
  exit 1
fi
