#!/usr/bin/env bash
set -euo pipefail

# Removing the tool from inside the tool works on Linux and macOS: unlinking a running executable
# leaves the running process on its old inode, so the current session finishes normally and the
# file is gone afterwards. Verified rather than assumed.
BIN_DIR="${AUTOINSTALL_INSTALL_DIR:-$HOME/.autoinstall/bin}"
BIN="$BIN_DIR/autoinstall"

if [ ! -e "$BIN" ]; then
  echo "autoinstall is not installed at $BIN; nothing to do."
  exit 0
fi

rm -f "$BIN"
# Only prune the directory this entry created, and only when empty — never a directory the user
# pointed at with AUTOINSTALL_INSTALL_DIR that holds their own binaries.
if [ "$BIN_DIR" = "$HOME/.autoinstall/bin" ]; then
  rmdir "$BIN_DIR" 2>/dev/null || true
  rmdir "$HOME/.autoinstall" 2>/dev/null || true
fi

# The installer appends a delimited block; remove exactly that, leaving the rest of the file byte
# for byte as the user left it.
for rc in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.zshrc" "${XDG_CONFIG_HOME:-$HOME/.config}/fish/config.fish"; do
  [ -f "$rc" ] || continue
  if grep -q '^# added by the autoinstall installer$' "$rc"; then
    tmp=$(mktemp)
    grep -v -e '^# added by the autoinstall installer$' -e "^export PATH=\"$BIN_DIR:\$PATH\"$" \
      -e "^fish_add_path $BIN_DIR$" "$rc" > "$tmp"
    cat "$tmp" > "$rc"
    rm -f "$tmp"
  fi
done

echo "Removed autoinstall. Your saved selection and history are untouched."
