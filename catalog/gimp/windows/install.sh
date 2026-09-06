#!/usr/bin/env bash
set -euo pipefail

winget install --id GIMP.GIMP -e \
  --accept-source-agreements --accept-package-agreements --silent
