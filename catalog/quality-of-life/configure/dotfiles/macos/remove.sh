#!/usr/bin/env bash
set -euo pipefail

MARKER="# autoinstall: shell aliases"
DEST="$HOME/.config/autoinstall/dotfiles/aliases.sh"

# Removes exactly the marker line, the sourcing line that follows it, and the blank line inserted
# before it — leaving every other line in the rc untouched. A blunt `grep -v` would also delete a
# user's own unrelated line that happened to mention the same path.
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$rc" ] || continue
  grep -q "$MARKER" "$rc" || continue
  TMP="$(mktemp)"
  awk -v marker="$MARKER" '
    !inblock && /^[[:space:]]*$/ { pending = pending $0 "\n"; next }
    $0 == marker { inblock = 1; pending = ""; next }
    inblock { inblock = 0; next }
    { printf "%s", pending; pending = ""; print }
    END { printf "%s", pending }
  ' "$rc" > "$TMP"
  cp "$TMP" "$rc"
  rm -f "$TMP"
done

rm -f "$DEST"
rmdir "$(dirname "$DEST")" 2>/dev/null || true

echo "Shell aliases removed."
