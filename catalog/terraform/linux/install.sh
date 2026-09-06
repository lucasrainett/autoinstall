#!/usr/bin/env bash
set -euo pipefail

sudo install -m 0755 -d /etc/apt/keyrings
# --batch --yes: without them, gpg stops to ask "File '...' exists. Overwrite? (y/N)" whenever the
# keyring is already there (any re-run, including after an earlier attempt failed later on), which
# hangs a non-interactive install. Re-importing the same public key is harmless, so overwrite.
curl -fsSL https://apt.releases.hashicorp.com/gpg |
  sudo gpg --batch --yes --dearmor -o /etc/apt/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list > /dev/null
sudo apt update -y
sudo apt install -y terraform
