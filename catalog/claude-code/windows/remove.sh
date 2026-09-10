#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Anthropic.ClaudeCode -e --accept-source-agreements --disable-interactivity --purge --silent
