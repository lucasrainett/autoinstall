#!/usr/bin/env bash
set -euo pipefail

# Restores Apple's default (submission enabled) rather than deleting the file: the plist is part
# of the OS, and removing it outright is a larger change than this entry ever made.
# `defaults` takes a domain, not a file: given a path ending in .plist it appends another one.
# The install and detect scripts had drifted apart on exactly this, so keep all three writing the
# domain and testing the file.
DOMAIN="/Library/Application Support/CrashReporter/DiagnosticMessagesHistory"
PLIST="$DOMAIN.plist"
[ -f "$PLIST" ] || exit 0
sudo defaults write "$DOMAIN" AutoSubmit -bool true
sudo defaults write "$DOMAIN" ThirdPartyDataSubmit -bool true
echo "Diagnostic submission restored to the macOS default."
