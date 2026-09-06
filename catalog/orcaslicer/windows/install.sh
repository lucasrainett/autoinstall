#!/usr/bin/env bash
set -euo pipefail

winget install --id SoftFever.OrcaSlicer -e \
  --accept-source-agreements --accept-package-agreements --silent
