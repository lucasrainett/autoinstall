#!/usr/bin/env bash
set -euo pipefail

# Deleting each key returns macOS to its own default, which is the only honest reversal: the
# previous values were never recorded. Terminal's profile is left alone — it may have been the
# user's choice before this entry ever ran.
for key in AppleShowAllFiles ShowPathbar ShowStatusBar FXPreferredViewStyle \
           FXEnableExtensionChangeWarning _FXShowPosixPathInTitle _FXSortFoldersFirst; do
  defaults delete com.apple.finder "$key" 2>/dev/null || true
done

for key in AppleShowAllExtensions NSNavPanelExpandedStateForSaveMode \
           NSNavPanelExpandedStateForSaveMode2 PMPrintingExpandedStateForPrint \
           PMPrintingExpandedStateForPrint2; do
  defaults delete NSGlobalDomain "$key" 2>/dev/null || true
done

defaults delete com.apple.systempreferences NSQuitAlwaysKeepsWindows 2>/dev/null || true

killall Finder 2>/dev/null || true
killall SystemUIServer 2>/dev/null || true

echo "Finder and dialog defaults reset."
