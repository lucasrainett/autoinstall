#!/usr/bin/env bash
set -euo pipefail

# Turns off "Share Mac Analytics" / "Share with App Developers" — the same switches as the
# Privacy & Security pane, written directly so the entry is scriptable and reversible.
# `defaults` takes a domain, not a file. Given a path that already ends in .plist it appends
# another one, so the install was writing DiagnosticMessagesHistory.plist.plist while detect's
# `[ -f ]` looked for DiagnosticMessagesHistory.plist. That passed only on an image where macOS had
# already created the real file, and started failing the moment the runner image no longer did.
DOMAIN="/Library/Application Support/CrashReporter/DiagnosticMessagesHistory"
PLIST="$DOMAIN.plist"
sudo mkdir -p "$(dirname "$PLIST")"
sudo defaults write "$DOMAIN" AutoSubmit -bool false
sudo defaults write "$DOMAIN" ThirdPartyDataSubmit -bool false
sudo chmod 644 "$PLIST"
echo "Diagnostic submission to Apple disabled."
