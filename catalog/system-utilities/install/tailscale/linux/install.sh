#!/usr/bin/env bash
set -euo pipefail

# Tailscale's own apt repo, per tailscale.com/kb/1187/install-linux. The keyring and sources list
# are both published per release codename, so they are fetched rather than hand-written.
#
# Deliberately stops at installing the package: it does NOT run `tailscale up`. Joining a tailnet
# is an authentication step that opens a browser and binds this machine to an account, which is
# well beyond what "install this software" should do without being asked.

CODENAME=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}")
if [ -z "$CODENAME" ]; then
  echo "Could not determine the Ubuntu/Debian codename; Tailscale's repo is published per release." >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${CODENAME}.noarmor.gpg" \
  -o "$TMP_DIR/tailscale-archive-keyring.gpg"
sudo install -m 0644 "$TMP_DIR/tailscale-archive-keyring.gpg" \
  /usr/share/keyrings/tailscale-archive-keyring.gpg

curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${CODENAME}.tailscale-keyring.list" \
  -o "$TMP_DIR/tailscale.list"
sudo install -m 0644 "$TMP_DIR/tailscale.list" /etc/apt/sources.list.d/tailscale.list

sudo apt update -y
sudo apt install -y tailscale

echo "Tailscale installed. Run 'sudo tailscale up' to sign in and join your tailnet."
