#!/usr/bin/env bash
set -euo pipefail

winget install --id cjpais.Handy -e \
  --accept-source-agreements --accept-package-agreements --silent
