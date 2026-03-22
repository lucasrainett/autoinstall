#!/usr/bin/env bash
# Generate an ED25519 SSH key for GitHub authentication.
# Prints the public key and the GitHub URL to add it.

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -f ~/.ssh/id_ed25519 ] && echo "SSH key already exists, skipping." && exit 0

mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -N '' -C "lucas@rainett.dev" -f ~/.ssh/id_ed25519

# add to macOS keychain
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519 2>/dev/null

# configure SSH to use keychain
if [ ! -f ~/.ssh/config ] || ! grep -q "UseKeychain" ~/.ssh/config; then
    cat >> ~/.ssh/config <<'EOF'

Host *
    AddKeysToAgent yes
    UseKeychain yes
    IdentityFile ~/.ssh/id_ed25519
EOF
fi

cat ~/.ssh/id_ed25519.pub
echo "https://github.com/settings/ssh/new"
