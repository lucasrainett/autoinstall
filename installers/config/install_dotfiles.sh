#!/usr/bin/env bash
# Deploy dotfiles from the dotfiles/ directory to the home folder.
#
# Copies files defined in the DOTFILES map (source -> destination).
# Skips files that are already identical (diff check).
# Also hooks a custom bashrc into ~/.bashrc if a bashrc dotfile exists.
# Add new dotfiles by placing them in the dotfiles/ folder and adding
# an entry to the DOTFILES associative array below.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$SCRIPT_DIR/../../dotfiles"

# map of source -> destination
declare -A DOTFILES=(
    ["bashrc"]="$HOME/.bashrc_custom"
    ["gitconfig"]="$HOME/.gitconfig"
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

# source custom bashrc from .bashrc if not already
if [ -f "$DOTFILES_DIR/bashrc" ]; then
    HOOK='[ -f ~/.bashrc_custom ] && source ~/.bashrc_custom'
    if ! grep -qF "$HOOK" "$HOME/.bashrc"; then
        echo "$HOOK" >> "$HOME/.bashrc"
        echo "Added bashrc_custom hook to .bashrc"
        CHANGED=true
    fi
fi

$CHANGED || echo "Dotfiles already up to date, skipping."
