#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Tailscale.Tailscale -e --accept-source-agreements --disable-interactivity --purge --silent
