#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id jqlang.jq -e --accept-source-agreements --silent
