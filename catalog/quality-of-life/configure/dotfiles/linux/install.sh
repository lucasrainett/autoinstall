#!/usr/bin/env bash
set -euo pipefail

MARKER="# autoinstall: shell aliases"
DEST_DIR="$HOME/.config/autoinstall/dotfiles"
DEST="$DEST_DIR/aliases.sh"

# The asset ships beside meta.toml (shared across platforms), so it is one level up from this
# script. Resolved from BASH_SOURCE rather than the working directory, because the engine runs
# scripts from wherever it happens to be.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/aliases.sh"
[ -f "$SRC" ] || { echo "aliases.sh is missing next to this entry's meta.toml." >&2; exit 1; }

# Deliberately writes to a namespaced path this entry owns, rather than to ~/.bash_aliases.
# That file is a well-known location a user may already be using; overwriting it would destroy
# their work. Nothing here ever touches .bashrc, .bash_aliases or .gitconfig directly — the old
# bash tool copied over ~/.gitconfig wholesale, which would wipe out both the user's git settings
# and the git-identity entry's work.
mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"

# One sourcing line per shell rc, guarded by a marker so re-running cannot append it twice.
added=false
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$rc" ] || continue
  if ! grep -q "$MARKER" "$rc"; then
    printf '\n%s\n[ -f "%s" ] && . "%s"\n' "$MARKER" "$DEST" "$DEST" >> "$rc"
    added=true
  fi
done

if [ "$added" = false ] && ! grep -qs "$MARKER" "$HOME/.bashrc" "$HOME/.zshrc"; then
  echo "No .bashrc or .zshrc found; wrote $DEST but nothing sources it yet." >&2
  echo "Add this line to your shell startup file:  . \"$DEST\"" >&2
fi

echo "Shell aliases installed at $DEST."
