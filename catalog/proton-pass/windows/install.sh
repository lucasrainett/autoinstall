#!/usr/bin/env bash
set -euo pipefail

winget install --id Proton.ProtonPass -e \
  --accept-source-agreements --accept-package-agreements --silent
