#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Guru3D.Afterburner -e --accept-source-agreements --disable-interactivity --purge --silent
