#!/usr/bin/env bash
set -euo pipefail

winget install --id Mojang.MinecraftLauncher -e \
  --accept-source-agreements --accept-package-agreements --silent
