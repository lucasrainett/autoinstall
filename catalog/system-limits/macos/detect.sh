#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.
#
# Reports on the LaunchDaemon this entry installs, not on the live `launchctl limit`. The live
# limit is the right thing for a human to look at but the wrong thing to detect on: macOS keeps a
# raised limit until the next reboot, so after a successful removal the limit is still high and
# detect said the entry was still present — a correct removal recorded as a failure. Detect must
# answer for the thing the entry actually manages.
PLIST=/Library/LaunchDaemons/com.autoinstall.maxfiles.plist
[ -f "$PLIST" ] || exit 1

# A daemon that no longer asks for the limit this entry sets is out of date rather than absent.
grep -q '65536' "$PLIST" 2>/dev/null || exit 2
exit 0
