#!/usr/bin/env bash
set -euo pipefail

winget install --id Amazon.AWSCLI -e \
  --accept-source-agreements --accept-package-agreements --silent
