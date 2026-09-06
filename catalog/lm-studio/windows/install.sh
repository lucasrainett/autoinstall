#!/usr/bin/env bash
set -euo pipefail

winget install --id ElementLabs.LMStudio -e \
  --accept-source-agreements --accept-package-agreements --silent
