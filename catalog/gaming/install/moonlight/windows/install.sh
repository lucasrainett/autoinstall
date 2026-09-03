#!/usr/bin/env bash
set -euo pipefail

winget install --id MoonlightGameStreamingProject.Moonlight -e \
  --accept-source-agreements --accept-package-agreements --silent
