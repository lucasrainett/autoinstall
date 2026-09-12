#!/usr/bin/env bash
set -uo pipefail

# `winget uninstall Rustlang.Rustup` runs `rustup self uninstall`, which asks "Continue? (y/N)" and
# waits. Nothing can answer it: --silent and --disable-interactivity are winget's own switches and
# do not reach the vendor tool underneath. The uninstall sat at "Starting package uninstall..."
# until the harness killed it at ten minutes, and killing winget mid-uninstall leaves the Windows
# installer lock held — which then blocked every entry after it in the same shard.
#
# Git Bash cannot signal a native Windows process, so nothing the harness does can make this
# graceful. The only real fix is for the uninstall not to hang: rustup takes -y for exactly this.
if command -v rustup >/dev/null 2>&1; then
  echo "Running rustup self uninstall -y before winget, so nothing waits on a prompt."
  rustup self uninstall -y || echo "rustup self uninstall returned $?" >&2
fi

# Still ask winget, so its own record of the package is cleared even when rustup did the work.
winget uninstall --id Rustlang.Rustup -e \
  --accept-source-agreements --disable-interactivity --purge --silent || true

# `command -v` is answered from bash's own hash table, which still held the path after rustup had
# deleted itself — the uninstall logged "rustup is uninstalled" and this still called it a failure.
# The file on disk is the fact.
hash -r 2>/dev/null || true
CARGO_BIN="${CARGO_HOME:-$HOME/.cargo}/bin/rustup.exe"
if [ -f "$CARGO_BIN" ] || [ -f "${CARGO_BIN%.exe}" ]; then
  echo "rustup is still installed at $CARGO_BIN." >&2
  exit 1
fi
