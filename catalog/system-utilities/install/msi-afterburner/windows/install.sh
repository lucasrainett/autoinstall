#!/usr/bin/env bash
set -euo pipefail

# Bundles RivaTuner Statistics Server, which its installer offers separately; --silent accepts the
# vendor's defaults rather than leaving a dialog waiting for input on an unattended run.
winget install --id Guru3D.Afterburner -e \
  --accept-source-agreements --accept-package-agreements --silent
