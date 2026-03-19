#!/usr/bin/env bash
# Global git configuration.
# Sets user identity, default branch name, and pull strategy.

[ "$AUTOINSTALL_UPDATE" != "true" ] && git config --global user.name &>/dev/null && echo "Git already configured, skipping." && exit 0

git config --global user.name "Lucas Rainett"
git config --global user.email "lucas@rainett.dev"
git config --global init.defaultBranch master
git config --global pull.rebase false
