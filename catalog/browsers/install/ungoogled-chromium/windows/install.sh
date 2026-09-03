#!/usr/bin/env bash
set -euo pipefail

winget install --id eloston.ungoogled-chromium -e \
  --accept-source-agreements --accept-package-agreements --silent
