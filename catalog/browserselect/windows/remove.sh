#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id zumoshi.BrowserSelect -e --accept-source-agreements --purge --silent
