#!/usr/bin/env bash
# Generate an ED25519 SSH key for GitHub authentication.
# Prints the public key and the GitHub URL to add it.

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -f ~/.ssh/id_ed25519 ] && echo "SSH key already exists, skipping." && exit 0

ssh-keygen -t ed25519 -N '' -C "lucas@rainett.dev" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
echo "https://github.com/settings/ssh/new"
