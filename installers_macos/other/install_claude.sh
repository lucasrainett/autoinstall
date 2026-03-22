#!/usr/bin/env bash
# Install Claude Code via npm (requires Volta/Node).

export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v claude &>/dev/null && echo "Claude Code already installed, skipping." && exit 0

if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js not found. Install Volta first."
    exit 1
fi

npm install -g @anthropic-ai/claude-code

echo "Claude Code installed: $(claude --version 2>/dev/null || echo 'OK')"
