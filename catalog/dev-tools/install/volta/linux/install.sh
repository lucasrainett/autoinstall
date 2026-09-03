#!/usr/bin/env bash
set -euo pipefail

curl -fsSL https://get.volta.sh | bash -s -- --skip-setup

export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

for RC_FILE in "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$RC_FILE" ] || continue
  grep -q "VOLTA_HOME" "$RC_FILE" || cat >> "$RC_FILE" <<'EOF'

# Volta
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
EOF
done

volta install node
