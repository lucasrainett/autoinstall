#!/usr/bin/env bash
set -euo pipefail

winget install --id Oracle.VirtualBox -e \
  --accept-source-agreements --accept-package-agreements --silent
