#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Proton.ProtonVPN -e --accept-source-agreements --silent
