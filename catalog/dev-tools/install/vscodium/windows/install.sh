#!/usr/bin/env bash
set -euo pipefail

winget install --id VSCodium.VSCodium -e \
  --accept-source-agreements --accept-package-agreements --silent
