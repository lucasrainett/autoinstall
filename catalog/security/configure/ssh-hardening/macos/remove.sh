#!/usr/bin/env bash
set -euo pipefail

DROPIN=/etc/ssh/sshd_config.d/99-autoinstall-hardening.conf
[ -f "$DROPIN" ] || exit 0

sudo rm -f "$DROPIN"
if command -v launchctl >/dev/null 2>&1 && launchctl print system/com.openssh.sshd 2>/dev/null; then
  sudo launchctl kickstart -k system/com.openssh.sshd
fi
echo "SSH hardening removed; distro defaults apply again."
