#!/usr/bin/env bash
set -euo pipefail

# Anthropic's apt repository, per code.claude.com/docs/en/desktop-linux.
#
# The previous URLs 404'd: the keyring moved from .../claude-desktop/apt/claude-desktop-keyring.asc
# to .../claude-desktop/key.asc, and the suite path gained a /stable segment. The first full
# lifecycle run caught it as "install failed" with `curl: (22) 404` followed by
# "gpg: no valid OpenPGP data found" — the download failed and the key was written anyway.
#
# The key is used in ASCII form rather than dearmored, which is what the vendor documents and
# avoids the `gpg --dearmor -o` re-run problem entirely.
KEYRING=/usr/share/keyrings/claude-desktop-archive-keyring.asc
EXPECTED_FPR=31DDDE24DDFAB679F42D7BD2BAA929FF1A7ECACE

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL -o "$TMP_DIR/key.asc" https://downloads.claude.ai/claude-desktop/key.asc

# Verified before it is trusted: a 404 or a captive portal yields a file that is not a key at all,
# and installing it produces an apt failure much later that names nothing useful.
fpr=$(gpg --show-keys --with-colons "$TMP_DIR/key.asc" 2>/dev/null | awk -F: '/^fpr:/ {print $10; exit}')
if [ "$fpr" != "$EXPECTED_FPR" ]; then
  echo "Refusing to install: the signing key from downloads.claude.ai does not match the" >&2
  echo "fingerprint Anthropic documents." >&2
  echo "  expected $EXPECTED_FPR" >&2
  echo "  got      ${fpr:-<not a valid OpenPGP key>}" >&2
  exit 1
fi

sudo install -d -m 0755 /usr/share/keyrings
sudo install -m 0644 "$TMP_DIR/key.asc" "$KEYRING"

printf '%s\n' \
  "deb [arch=amd64,arm64 signed-by=$KEYRING] https://downloads.claude.ai/claude-desktop/apt/stable stable main" \
  | sudo tee /etc/apt/sources.list.d/claude-desktop.list >/dev/null

sudo apt update -y
sudo apt install -y claude-desktop
