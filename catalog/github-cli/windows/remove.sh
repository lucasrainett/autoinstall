#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id GitHub.cli -e --accept-source-agreements --disable-interactivity --purge --silent
