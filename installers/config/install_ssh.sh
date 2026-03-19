#!/usr/bin/env bash
[ -f ~/.ssh/id_ed25519 ] && echo "SSH key already exists, skipping." && exit 0

ssh-keygen -t ed25519 -N '' -C "lucas@rainett.dev" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
echo "https://github.com/settings/ssh/new"
