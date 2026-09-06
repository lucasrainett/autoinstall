#!/usr/bin/env bash
set -euo pipefail

# Turns off "Share Mac Analytics" / "Share with App Developers" — the same switches as the
# Privacy & Security pane, written directly so the entry is scriptable and reversible.
PLIST=/Library/Application\ Support/CrashReporter/DiagnosticMessagesHistory.plist
sudo mkdir -p "$(dirname "$PLIST")"
sudo defaults write "$PLIST" AutoSubmit -bool false
sudo defaults write "$PLIST" ThirdPartyDataSubmit -bool false
sudo chmod 644 "$PLIST"
echo "Diagnostic submission to Apple disabled."
