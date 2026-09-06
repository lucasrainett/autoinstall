#!/usr/bin/env bash
set -euo pipefail

winget install --id ONLYOFFICE.DesktopEditors -e \
  --accept-source-agreements --accept-package-agreements --silent
