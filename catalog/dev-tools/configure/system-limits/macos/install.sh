#!/usr/bin/env bash
set -euo pipefail

# A LaunchDaemon rather than `launchctl limit` alone: the latter does not survive a reboot, and an
# entry whose effect quietly disappears overnight is worse than one that never applied.
PLIST=/Library/LaunchDaemons/com.autoinstall.maxfiles.plist

sudo tee "$PLIST" > /dev/null <<'CONF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Written by autoinstall (dev-tools/configure/system-limits). Delete to revert. -->
<plist version="1.0">
  <dict>
    <key>Label</key><string>com.autoinstall.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string><string>limit</string><string>maxfiles</string>
      <string>65536</string><string>200000</string>
    </array>
    <key>RunAtLoad</key><true/>
  </dict>
</plist>
CONF

sudo chown root:wheel "$PLIST"
sudo chmod 644 "$PLIST"
sudo launchctl limit maxfiles 65536 200000

echo "Open-file limit raised. macOS has no inotify, so only this half of the entry applies here."
