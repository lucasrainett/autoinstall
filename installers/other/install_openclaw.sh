#!/usr/bin/env bash
# OpenClaw - AI coding assistant.
# https://openclaw.ai

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v openclaw &>/dev/null && echo "OpenClaw already installed, skipping." && exit 0

curl -fsSL https://openclaw.ai/install.sh | bash
