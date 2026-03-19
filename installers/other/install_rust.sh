#!/usr/bin/env bash
# Rust - Systems programming language focused on safety and performance.
# Memory-safe, concurrent, and fast. Installed via rustup.
# https://www.rust-lang.org/tools/install
#
# Installs via the official rustup installer (always latest stable).

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v rustc &>/dev/null && echo "Rust already installed, skipping." && exit 0

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version
cargo --version
