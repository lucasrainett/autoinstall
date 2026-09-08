#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id ElementLabs.LMStudio -e --accept-source-agreements --purge --silent
