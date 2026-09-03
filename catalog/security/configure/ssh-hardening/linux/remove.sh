#!/usr/bin/env bash
set -euo pipefail

DROPIN=/etc/ssh/sshd_config.d/99-autoinstall-hardening.conf
[ -f "$DROPIN" ] || exit 0

sudo rm -f "$DROPIN"
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet ssh 2>/dev/null; then
  sudo systemctl reload ssh
fi
echo "SSH hardening removed; distro defaults apply again."
