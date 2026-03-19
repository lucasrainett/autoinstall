#!/usr/bin/env bash
# GitHub CLI (gh) - Official command line tool for GitHub.
# Manage PRs, issues, repos, actions, and more from the terminal.
# https://cli.github.com
#
# Adds the official GitHub CLI apt repo, then installs gh.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v gh &>/dev/null && echo "GitHub CLI already installed, skipping." && exit 0

sudo mkdir -p -m 755 /etc/apt/keyrings
wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install -y gh
gh --version
