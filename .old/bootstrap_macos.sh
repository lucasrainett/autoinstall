#!/usr/bin/env bash
# Bootstrap script for running autoinstall on macOS without cloning the repo.
# Downloads the full project to a temp directory, runs script_macos.sh, then cleans up.
# Usage: curl -sL https://raw.githubusercontent.com/lucasrainett/autoinstall/master/bootstrap_macos.sh | bash

TEMP_DIR=$(mktemp -d)
curl -sL https://github.com/lucasrainett/autoinstall/archive/master.tar.gz | tar xz -C "$TEMP_DIR"
"$TEMP_DIR/autoinstall-master/script_macos.sh" "$@"
rm -rf "$TEMP_DIR"
