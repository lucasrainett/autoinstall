#!/usr/bin/env bash
set -euo pipefail

# One at a time and tolerant of failure: Homebrew refuses to remove a formula another package
# depends on, and one such refusal must not strand the rest of the list.
for pkg in tree tmux htop coreutils gnu-sed grep make openssl readline; do
  brew uninstall "$pkg" 2>/dev/null || echo "Kept $pkg (another package depends on it)."
done
