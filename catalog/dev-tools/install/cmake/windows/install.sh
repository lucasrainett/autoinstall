#!/usr/bin/env bash
set -euo pipefail

winget install --id Kitware.CMake -e \
  --accept-source-agreements --accept-package-agreements --silent
