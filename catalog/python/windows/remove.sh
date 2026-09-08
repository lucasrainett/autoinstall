#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Python.Python.3 -e --accept-source-agreements --purge --silent
