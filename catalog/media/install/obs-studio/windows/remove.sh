#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id OBSProject.OBSStudio -e --accept-source-agreements --silent
