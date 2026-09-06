#!/usr/bin/env bash
set -euo pipefail

PLIST=/Library/LaunchDaemons/com.autoinstall.maxfiles.plist
[ -f "$PLIST" ] || exit 0

sudo rm -f "$PLIST"
# The running limit stays until reboot: launchctl cannot lower it back to the default in place.
# Said plainly rather than pretending the reversal is instant.
echo "Removed $PLIST. The raised limit stays in effect until the next reboot."
