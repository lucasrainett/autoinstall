#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Kitware.CMake -e --accept-source-agreements --disable-interactivity --purge --silent
