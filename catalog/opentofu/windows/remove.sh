#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id OpenTofu.Tofu -e --accept-source-agreements --purge --silent
