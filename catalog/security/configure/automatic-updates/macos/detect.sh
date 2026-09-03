#!/usr/bin/env bash
# Exit 0 = automatic security updates enabled, 1 = not enabled.
# Readable without elevation, which the unelevated startup scan requires.
[ "$(defaults read /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled 2>/dev/null)" = "1" ] &&
  [ "$(defaults read /Library/Preferences/com.apple.SoftwareUpdate CriticalUpdateInstall 2>/dev/null)" = "1" ]
