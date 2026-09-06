#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL -o "$TMP_DIR/awscli.zip" "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
unzip -o -q "$TMP_DIR/awscli.zip" -d "$TMP_DIR"

# AWS's installer refuses to run over an existing installation ("Found preexisting AWS CLI
# installation ... Please rerun install script with --update flag") and exits non-zero, so a plain
# re-run — an update, or a retry after a partly-finished run — would fail. Reproduced in a
# container before fixing. Pick the flag from what's actually on disk rather than assuming a clean
# machine.
if [ -d /usr/local/aws-cli ]; then
  sudo "$TMP_DIR/aws/install" --update
else
  sudo "$TMP_DIR/aws/install"
fi
