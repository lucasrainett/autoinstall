#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Valve.Steam -e --accept-source-agreements --silent
