#!/usr/bin/env bash
# Claude Code - AI coding assistant by Anthropic.
# Terminal-based AI pair programmer that can edit files, run commands, and search code.
# https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview
#
# Requires Node.js 18+ (installed via Volta).

export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v claude &>/dev/null && echo "Claude Code already installed, skipping." && exit 0

npm install -g @anthropic-ai/claude-code
claude --version
