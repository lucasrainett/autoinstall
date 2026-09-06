#!/usr/bin/env bash
# Exit 0 if Rust is already installed, non-zero otherwise.
[ -x "$HOME/.cargo/bin/rustc" ]
