#!/usr/bin/env bash
set -euo pipefail

# ufw ships on Ubuntu/Zorin but is not guaranteed present on every Debian-family system.
if ! command -v ufw >/dev/null 2>&1; then
  sudo apt update -y
  sudo apt install -y ufw
fi

# Deliberately does NOT touch existing rules: someone may already have a considered ruleset, and
# silently rewriting it would be a destructive surprise from an entry whose job is "turn the
# firewall on". Default incoming-deny only applies to a fresh ufw install.
sudo ufw --force enable
sudo ufw status verbose
