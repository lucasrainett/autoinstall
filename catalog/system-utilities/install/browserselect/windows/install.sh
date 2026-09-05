#!/usr/bin/env bash
set -euo pipefail

winget install --id zumoshi.BrowserSelect -e \
  --accept-source-agreements --accept-package-agreements --silent
