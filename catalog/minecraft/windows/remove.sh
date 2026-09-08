#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Mojang.MinecraftLauncher -e --accept-source-agreements --purge --silent
