#!/usr/bin/env bash
# Install Volta (JavaScript tool manager).

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -x "$HOME/.volta/bin/volta" ] && echo "Volta already installed, skipping." && exit 0

curl https://get.volta.sh | bash -s -- --skip-setup

export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

# install latest Node LTS and pnpm
volta install node
volta install pnpm

# hook into shell configs
for RC_FILE in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$RC_FILE" ] || [ "$RC_FILE" = "$HOME/.zshrc" ]; then
        touch "$RC_FILE"
        if ! grep -q 'VOLTA_HOME' "$RC_FILE"; then
            cat >> "$RC_FILE" <<'EOF'

# Volta
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
EOF
        fi
    fi
done

echo "Volta installed: $(volta --version)"
