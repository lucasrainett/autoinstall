#!/usr/bin/env bash
set -euo pipefail

winget install --id Zen-Team.Zen-Browser -e \
  --accept-source-agreements --accept-package-agreements --silent
