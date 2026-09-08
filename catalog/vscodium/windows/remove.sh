#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id VSCodium.VSCodium -e --accept-source-agreements --purge --silent
