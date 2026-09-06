#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id eloston.ungoogled-chromium -e --accept-source-agreements --silent
