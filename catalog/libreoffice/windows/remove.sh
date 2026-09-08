#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id TheDocumentFoundation.LibreOffice -e --accept-source-agreements --purge --silent
