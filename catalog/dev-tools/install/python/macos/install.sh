#!/usr/bin/env bash
set -euo pipefail

# Homebrew no longer keeps an unversioned "python" alias — pinned to a specific version, which
# will need bumping to a newer release over time as Homebrew rotates supported versions.
brew install python@3.13
