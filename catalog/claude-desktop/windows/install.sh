#!/usr/bin/env bash
set -euo pipefail

winget install --id Anthropic.Claude -e \\
  --accept-source-agreements --accept-package-agreements --silent
