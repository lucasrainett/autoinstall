#!/usr/bin/env bash
# Exit 0 = every tool is installed and current, 1 = at least one is missing, 2 = an update exists.
NEEDS_UPDATE=0
for pkg in tree tmux htop coreutils gnu-sed grep make openssl readline; do
  brew list --formula "$pkg" &>/dev/null || exit 1
done
if brew outdated --formula --quiet 2>/dev/null | grep -qE '^(tree|tmux|htop|coreutils|gnu-sed|grep|make|openssl|readline)$'; then
  NEEDS_UPDATE=1
fi
[ "$NEEDS_UPDATE" -eq 1 ] && exit 2
exit 0
