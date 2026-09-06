#!/usr/bin/env bash
set -euo pipefail

winget uninstall --id Docker.DockerDesktop -e --accept-source-agreements --silent
