#!/usr/bin/env bash
set -euo pipefail

winget install --id Brave.Brave -e \
  --accept-source-agreements --accept-package-agreements --silent
