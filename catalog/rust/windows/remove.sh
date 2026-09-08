#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Rustlang.Rustup -e --accept-source-agreements --purge --silent
