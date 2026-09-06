#!/usr/bin/env bash
set -euo pipefail

winget install --id Hashicorp.Terraform -e \
  --accept-source-agreements --accept-package-agreements --silent
