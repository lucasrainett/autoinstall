#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Git.Git -e --accept-source-agreements --silent
