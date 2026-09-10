#!/usr/bin/env bash
set -uo pipefail

# Proton Mail's uninstaller answered 4294967295 (0xFFFFFFFF, -1) on a runner. That is what its
# Squirrel/Electron uninstaller returns when the application is still running — and Proton Mail
# launches itself at the end of its own installation, so an install-then-remove sequence hits this
# every time. Closing it first is the documented remedy for the whole Electron family.
#
# taskkill rather than a graceful close: there is no window to click, and the mailbox is not being
# modified — the process is being stopped so its files can be deleted.
for image in "Proton Mail.exe" ProtonMail.exe "Proton Mail Bridge.exe"; do
  MSYS_NO_PATHCONV=1 taskkill //F //IM "$image" >/dev/null 2>&1 || true
done
# Give Windows a moment to release the file handles the uninstaller is about to need.
sleep 3

winget uninstall --id Proton.ProtonMail -e \
  --accept-source-agreements --disable-interactivity --purge --silent
rc=$?

if [ "$rc" -ne 0 ]; then
  echo "winget uninstall returned $rc." >&2
  # 4294967295 is the uninstaller's own -1, not winget's. Report it as itself rather than as a
  # generic failure, so the next person does not start by suspecting winget.
  if [ "$rc" = "4294967295" ] || [ "$rc" = "-1" ]; then
    echo "That is the vendor uninstaller's -1, which normally means the app was still running." >&2
  fi
  exit "$rc"
fi
