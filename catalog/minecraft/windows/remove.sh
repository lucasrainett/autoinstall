#!/usr/bin/env bash
set -uo pipefail

# Retries on Windows Installer error 1618, ERROR_INSTALL_ALREADY_RUNNING, and only on that.
#
# Windows Installer runs one transaction at a time. Minecraft Launcher is an MSI, and twice on a
# runner its uninstall — started seconds after its own install finished — was refused with
# "Uninstall failed with exit code: 1618" because another installer job had not yet let go. The
# documented response to 1618 is to wait for the other installation to finish and try again, which
# is what this does: up to six attempts, twenty seconds apart. Any other failure is reported at
# once, and a lock that never clears still fails, well inside the harness's ten-minute cap.
attempts=6
for attempt in $(seq 1 "$attempts"); do
  out=$(winget uninstall --id Mojang.MinecraftLauncher -e \
    --accept-source-agreements --disable-interactivity --purge --silent 2>&1)
  rc=$?
  echo "$out"
  [ "$rc" -eq 0 ] && exit 0
  if ! echo "$out" | grep -q "1618"; then
    exit "$rc"
  fi
  if [ "$attempt" -lt "$attempts" ]; then
    echo "Another Windows Installer job is running (1618); waiting 20s before attempt $((attempt + 1)) of $attempts."
    sleep "${MINECRAFT_1618_DELAY:-20}"
  fi
done

echo "Windows Installer was still busy with another job (1618) after $attempts attempts." >&2
exit "$rc"
