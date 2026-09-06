#!/usr/bin/env bash
set -euo pipefail

winget install --id Element.Element -e \\
  --accept-source-agreements --accept-package-agreements --silent
