#!/usr/bin/env bash
set -euo pipefail

sudo mkdir -p -m 755 /etc/apt/keyrings
# --batch --yes: without them, gpg stops to ask "File '...' exists. Overwrite? (y/N)" on any re-run
# where the keyring already exists, which hangs a non-interactive install.
curl -fsSL https://gitlab.com/paulcarroty/vscodium-deb-rpm-repo/raw/master/pub.gpg |
  sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/vscodium-archive-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/vscodium-archive-keyring.gpg] https://paulcarroty.gitlab.io/vscodium-deb-rpm-repo/debs/ vscodium main" \
  | sudo tee /etc/apt/sources.list.d/vscodium.list > /dev/null
sudo apt update -y
sudo apt install -y codium
