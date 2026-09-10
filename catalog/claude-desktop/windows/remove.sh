#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Anthropic.Claude -e --accept-source-agreements --disable-interactivity --purge --silent
