#!/usr/bin/env bash
# Exit 0 = aliases installed and sourced, 1 = not installed.
ALIASES="$HOME/.config/autoinstall/dotfiles/aliases.sh"
[ -f "$ALIASES" ] || exit 1

# The file alone is not enough: if no rc sources it, the aliases do nothing.
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$rc" ] && grep -q "# autoinstall: shell aliases" "$rc" && exit 0
done
exit 1
