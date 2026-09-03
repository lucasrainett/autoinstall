#!/usr/bin/env bash
set -euo pipefail

winget install --id JetBrains.Toolbox -e \
  --accept-source-agreements --accept-package-agreements --silent
