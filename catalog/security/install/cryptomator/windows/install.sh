#!/usr/bin/env bash
set -euo pipefail

winget install --id Cryptomator.Cryptomator -e \
  --accept-source-agreements --accept-package-agreements --silent
