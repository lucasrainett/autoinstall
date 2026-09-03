#!/usr/bin/env bash
set -euo pipefail

winget install --id Nickvision.Parabolic -e \
  --accept-source-agreements --accept-package-agreements --silent
