#!/usr/bin/env bash
set -euo pipefail

winget install --id OBSProject.OBSStudio -e \
  --accept-source-agreements --accept-package-agreements --silent
