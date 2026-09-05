#!/usr/bin/env bash
set -euo pipefail

winget install --id KDE.KDEConnect -e \
  --accept-source-agreements --accept-package-agreements --silent
