#!/usr/bin/env bash
set -euo pipefail

winget install --id Microsoft.OneDrive -e \
  --accept-source-agreements --accept-package-agreements --silent
