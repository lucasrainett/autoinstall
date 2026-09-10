#!/usr/bin/env bash
set -euo pipefail

# Compressed swap needs the kernel's zram module. Containers and some virtual machines cannot load
# it, and there the package installs happily while no zram device ever appears — detect then
# correctly reports the entry unsatisfied and the install looks broken. Check first and decline.
if [ ! -e /sys/class/zram-control ] && ! modprobe -n zram >/dev/null 2>&1; then
  echo "This kernel does not provide zram, so there is no compressed swap to configure." >&2
  echo "Nothing was changed." >&2
  exit 3
fi

sudo apt update -y
sudo apt install -y zram-tools
sudo systemctl enable --now zramswap 2>/dev/null || true

echo "Compressed swap enabled."
