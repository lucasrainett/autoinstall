#!/usr/bin/env bash
# Deploy dotfiles from the dotfiles/ directory to the home folder.
#
# Copies files defined in the DOTFILES map (source -> destination).
# Skips files that are already identical (diff check).
# Hooks into ~/.zshrc (macOS default shell) and ~/.bashrc.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$SCRIPT_DIR/../../dotfiles"

# map of source -> destination
declare -A DOTFILES=(
    ["aliases"]="$HOME/.bash_aliases"
)

CHANGED=false

for SRC in "${!DOTFILES[@]}"; do
    SRC_PATH="$DOTFILES_DIR/$SRC"
    DEST_PATH="${DOTFILES[$SRC]}"

    [ ! -f "$SRC_PATH" ] && continue

    if [ -f "$DEST_PATH" ] && diff -q "$SRC_PATH" "$DEST_PATH" &>/dev/null; then
        echo "$SRC already up to date, skipping."
        continue
    fi

    cp "$SRC_PATH" "$DEST_PATH"
    echo "Installed $SRC -> $DEST_PATH"
    CHANGED=true
done

# source aliases from .zshrc (macOS default shell) if not already
ALIAS_HOOK='[ -f ~/.bash_aliases ] && source ~/.bash_aliases'
for RC_FILE in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC_FILE" ] || [ "$RC_FILE" = "$HOME/.zshrc" ]; then
        touch "$RC_FILE"
        if ! grep -qF "$ALIAS_HOOK" "$RC_FILE"; then
            echo "$ALIAS_HOOK" >> "$RC_FILE"
            echo "Added aliases hook to $(basename "$RC_FILE")"
            CHANGED=true
        fi
    fi
done

$CHANGED || echo "Dotfiles already up to date, skipping."
