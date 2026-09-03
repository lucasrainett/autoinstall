#!/usr/bin/env bash
set -euo pipefail

winget install --id jqlang.jq -e \
  --accept-source-agreements --accept-package-agreements --silent
