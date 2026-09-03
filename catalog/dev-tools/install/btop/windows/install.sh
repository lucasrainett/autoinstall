#!/usr/bin/env bash
set -euo pipefail

winget install --id aristocratos.btop4win -e \
  --accept-source-agreements --accept-package-agreements --silent
