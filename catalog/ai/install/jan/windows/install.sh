#!/usr/bin/env bash
set -euo pipefail

winget install --id Jan.Jan -e \
  --accept-source-agreements --accept-package-agreements --silent
