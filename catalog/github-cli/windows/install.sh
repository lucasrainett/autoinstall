#!/usr/bin/env bash
set -euo pipefail

winget install --id GitHub.cli -e \
  --accept-source-agreements --accept-package-agreements --silent
