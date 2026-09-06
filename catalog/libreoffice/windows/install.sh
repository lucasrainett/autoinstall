#!/usr/bin/env bash
set -euo pipefail

winget install --id TheDocumentFoundation.LibreOffice -e \\
  --accept-source-agreements --accept-package-agreements --silent
