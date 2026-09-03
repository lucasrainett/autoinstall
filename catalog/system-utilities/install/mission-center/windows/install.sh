#!/usr/bin/env bash
set -euo pipefail

winget install --id WinsiderSS.SystemInformer -e \
  --accept-source-agreements --accept-package-agreements --silent
