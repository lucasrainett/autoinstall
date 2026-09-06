#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id GoLang.Go -e --accept-source-agreements --silent
