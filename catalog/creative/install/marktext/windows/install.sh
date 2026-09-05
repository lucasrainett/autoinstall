#!/usr/bin/env bash
set -euo pipefail

winget install --id MarkText.MarkText -e \
  --accept-source-agreements --accept-package-agreements --silent
