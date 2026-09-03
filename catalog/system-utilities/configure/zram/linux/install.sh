#!/usr/bin/env bash
set -euo pipefail

sudo apt update -y
sudo apt install -y zram-tools
sudo systemctl enable --now zramswap 2>/dev/null || true

echo "Compressed swap enabled."
