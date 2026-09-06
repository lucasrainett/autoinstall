#!/usr/bin/env bash
set -euo pipefail

# Restores Apple's default (submission enabled) rather than deleting the file: the plist is part
# of the OS, and removing it outright is a larger change than this entry ever made.
PLIST=/Library/Application\ Support/CrashReporter/DiagnosticMessagesHistory.plist
[ -f "$PLIST" ] || exit 0
sudo defaults write "$PLIST" AutoSubmit -bool true
sudo defaults write "$PLIST" ThirdPartyDataSubmit -bool true
echo "Diagnostic submission restored to the macOS default."
