#!/usr/bin/env bash
set -euo pipefail

# Reuses the published installer rather than reimplementing it: it already resolves the right
# build for this machine, verifies the download against the release's SHA256SUMS, and refuses
# anything that does not match. A second copy of that logic would be a second thing to get wrong.
REPO="${AUTOINSTALL_REPO:-lucasrainett/autoinstall}"
curl -fsSL "https://raw.githubusercontent.com/${REPO}/master/install" | bash
