#!/usr/bin/env bash
# Install Rust via rustup.

[ "$AUTOINSTALL_UPDATE" != "true" ] && [ -x "$HOME/.cargo/bin/rustc" ] && echo "Rust already installed, skipping." && exit 0

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

source "$HOME/.cargo/env"

echo "Rust installed: $(rustc --version), Cargo: $(cargo --version)"
