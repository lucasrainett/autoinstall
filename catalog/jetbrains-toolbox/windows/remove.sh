#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id JetBrains.Toolbox -e --accept-source-agreements --silent
