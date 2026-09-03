#!/usr/bin/env bash
set -euo pipefail

winget install --id GoLang.Go -e \
  --accept-source-agreements --accept-package-agreements --silent
