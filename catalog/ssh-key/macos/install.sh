#!/usr/bin/env bash
set -euo pipefail

KEY="$HOME/.ssh/id_ed25519"

# Checked explicitly: without it the script dies with a bare "command not found" and exit 127,
# which tells the user nothing about what to do. ssh-keygen ships with openssh-client, which is
# present on virtually every desktop but not on minimal images.
if ! command -v ssh-keygen >/dev/null 2>&1; then
  echo "ssh-keygen is not available; install openssh-client and re-run this entry." >&2
  exit 1
fi

# Never overwrite. A private key is not regenerable — anything it was authorised against (servers,
# git remotes, deploy targets) would silently stop working, and the old key cannot be recovered.
# An existing key of any supported type means there is nothing to do here.
for existing in id_ed25519 id_ecdsa id_rsa; do
  if [ -f "$HOME/.ssh/$existing" ]; then
    echo "An SSH key already exists ($HOME/.ssh/$existing); leaving it untouched."
    exit 0
  fi
done

# The comment is only a label, but a meaningful one: it is what appears in a server's
# authorized_keys and is how you identify which key to revoke later. Falls back to user@host when
# no identity is configured rather than refusing — a key with a generic label is still useful.
COMMENT="${AUTOINSTALL_IDENTITY_EMAIL:-$(id -un)@$(hostname)}"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# -N "" generates without a passphrase, which is what makes this runnable unattended. That is a
# deliberate trade: an unencrypted private key is only as safe as the account holding it. It is
# stated plainly below rather than buried, so the choice is visible to whoever runs this.
ssh-keygen -t ed25519 -C "$COMMENT" -f "$KEY" -N "" -q

chmod 600 "$KEY"
chmod 644 "$KEY.pub"

echo "Generated $KEY (labelled $COMMENT)."
echo "Note: this key has no passphrase, so it is only as protected as this user account."
# Load into the agent and store the passphrase-free key in the login keychain, which is the
# macOS-native way to have it available without re-adding it every session.
ssh-add --apple-use-keychain "$KEY" 2>/dev/null || ssh-add "$KEY" 2>/dev/null || true

echo "Public key:"
cat "$KEY.pub"
