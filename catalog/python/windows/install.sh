#!/usr/bin/env bash
set -euo pipefail

winget install --id Python.Python.3 -e \
  --accept-source-agreements --accept-package-agreements --silent
