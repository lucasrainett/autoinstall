#!/usr/bin/env bash
set -euo pipefail

# Security updates and system data files only — deliberately not AutomaticallyInstallMacOSUpdates,
# which would let the machine move to a new macOS version unattended. That is a far larger change
# than "stay patched" and should stay a human decision.
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool true
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticDownload -bool true
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate CriticalUpdateInstall -bool true
sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate ConfigDataInstall -bool true

echo "Automatic security updates enabled."
