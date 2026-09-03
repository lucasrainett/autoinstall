#!/usr/bin/env bash
set -euo pipefail

winget install --id Freeplane.Freeplane -e \
  --accept-source-agreements --accept-package-agreements --silent
