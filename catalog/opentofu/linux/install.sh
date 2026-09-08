#!/usr/bin/env bash
set -euo pipefail

# OpenTofu's own apt repository, the channel get.opentofu.org documents. Deliberately not a
# downloaded .deb: a repository keeps it updatable through the same apt path as everything else.
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://get.opentofu.org/opentofu.gpg |
  sudo tee /etc/apt/keyrings/opentofu.gpg >/dev/null
curl -fsSL https://packages.opentofu.org/opentofu/tofu/gpgkey |
  sudo gpg --no-tty --batch --dearmor -o /etc/apt/keyrings/opentofu-repo.gpg
sudo chmod a+r /etc/apt/keyrings/opentofu.gpg /etc/apt/keyrings/opentofu-repo.gpg

printf '%s\n%s\n' \
  "deb [signed-by=/etc/apt/keyrings/opentofu.gpg,/etc/apt/keyrings/opentofu-repo.gpg] https://packages.opentofu.org/opentofu/tofu/any/ any main" \
  "deb-src [signed-by=/etc/apt/keyrings/opentofu.gpg,/etc/apt/keyrings/opentofu-repo.gpg] https://packages.opentofu.org/opentofu/tofu/any/ any main" \
  | sudo tee /etc/apt/sources.list.d/opentofu.list >/dev/null

sudo apt update -y
sudo apt install -y tofu
