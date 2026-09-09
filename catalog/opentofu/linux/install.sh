#!/usr/bin/env bash
set -euo pipefail

# OpenTofu's own apt repository, the channel get.opentofu.org documents. Deliberately not a
# downloaded .deb: a repository keeps it updatable through the same apt path as everything else.
#
# Note `gpg --dearmor` writes to stdout here rather than taking `-o <file>`: with `-o` it refuses
# when the file already exists ("File exists. Overwrite?"), and under `--batch` that is a hard
# failure rather than a prompt — so a re-run of this script died. Every other keyring-adding entry
# in this catalog uses the stdout form for the same reason; this one did not, and the first full
# lifecycle run caught it as "not safe to re-run".
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

sudo install -d -m 0755 /etc/apt/keyrings

curl -fsSL https://get.opentofu.org/opentofu.gpg > "$TMP_DIR/opentofu.gpg"
sudo install -m 0644 "$TMP_DIR/opentofu.gpg" /etc/apt/keyrings/opentofu.gpg

curl -fsSL https://packages.opentofu.org/opentofu/tofu/gpgkey |
  gpg --no-tty --batch --dearmor > "$TMP_DIR/opentofu-repo.gpg"
sudo install -m 0644 "$TMP_DIR/opentofu-repo.gpg" /etc/apt/keyrings/opentofu-repo.gpg

printf '%s\n%s\n' \
  "deb [signed-by=/etc/apt/keyrings/opentofu.gpg,/etc/apt/keyrings/opentofu-repo.gpg] https://packages.opentofu.org/opentofu/tofu/any/ any main" \
  "deb-src [signed-by=/etc/apt/keyrings/opentofu.gpg,/etc/apt/keyrings/opentofu-repo.gpg] https://packages.opentofu.org/opentofu/tofu/any/ any main" \
  | sudo tee /etc/apt/sources.list.d/opentofu.list >/dev/null

sudo apt update -y
sudo apt install -y tofu
