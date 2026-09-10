#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id MoonlightGameStreamingProject.Moonlight -e --accept-source-agreements --disable-interactivity --purge --silent
