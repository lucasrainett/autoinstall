#!/usr/bin/env bash
set -euo pipefail

# Best-effort: the native installer's own binary handles final placement internally (its `install`
# subcommand isn't a shell script this project can read), so the exact symlink location isn't
# independently confirmed — this targets the standard, most likely location. Deliberately does
# NOT touch ~/.claude (config/history/credentials), only the executable itself.
rm -f "$HOME/.local/bin/claude"
