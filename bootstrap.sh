#!/usr/bin/env bash

TEMP_DIR=$(mktemp -d)
curl -sL https://github.com/lucasrainett/autoinstall/archive/master.tar.gz | tar xz -C "$TEMP_DIR"
"$TEMP_DIR/autoinstall-master/script.sh"
rm -rf "$TEMP_DIR"
