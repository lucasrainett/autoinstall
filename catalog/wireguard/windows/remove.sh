#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id WireGuard.WireGuard -e --accept-source-agreements --purge --silent
