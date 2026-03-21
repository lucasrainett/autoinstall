#!/usr/bin/env bash
# Install Go via Homebrew.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v go &>/dev/null && echo "Go already installed, skipping." && exit 0

brew install go

# add GOPATH to shell configs
for RC_FILE in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC_FILE" ] || [ "$RC_FILE" = "$HOME/.zshrc" ]; then
        touch "$RC_FILE"
        if ! grep -q 'GOPATH' "$RC_FILE"; then
            cat >> "$RC_FILE" <<'EOF'

# Go
export GOPATH="$HOME/go"
export PATH="$GOPATH/bin:$PATH"
EOF
        fi
    fi
done

echo "Go installed: $(go version)"
