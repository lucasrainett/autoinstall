#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id GIMP.GIMP -e --accept-source-agreements --silent
