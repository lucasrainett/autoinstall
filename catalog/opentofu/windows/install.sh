#!/usr/bin/env bash
set -euo pipefail

winget install --id OpenTofu.Tofu -e \
  --accept-source-agreements --accept-package-agreements --silent
