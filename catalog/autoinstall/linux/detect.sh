#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.
#
# This entry is the tool itself. That is not a novelty: the whole premise is "this is what should
# be on my machine", and the tool is on the machine. It also means self-update arrives through the
# same review-then-confirm path as everything else, instead of a separate mechanism nobody audits.

BIN="${AUTOINSTALL_INSTALL_DIR:-$HOME/.autoinstall/bin}/autoinstall"
[ -x "$BIN" ] || BIN=$(command -v autoinstall 2>/dev/null) || exit 1
[ -x "$BIN" ] || exit 1

# A build old enough not to understand --version does not fail cleanly: it treats the flag as no
# flag at all and launches the interface, which then dies with "Raw mode is not supported" and
# prints that on stdout. Taking the output at face value made this script read a stack trace as a
# version string and report "up to date" — found by running it against the actual beta.
#
# So the output is validated, not trusted: anything that is not a version number means a build too
# old to ask, which is itself the answer (exit 2, update available). stdin is closed so a build
# that does try to start an interface cannot sit waiting for a key.
current=$("$BIN" --version </dev/null 2>/dev/null | tr -d '[:space:]') || exit 2
if ! printf '%s' "$current" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$'; then
  exit 2
fi

# A working copy reports 0.0.0-dev and must never be told to overwrite itself with a release.
case "$current" in *-dev) exit 0 ;; esac

REPO="${AUTOINSTALL_REPO:-lucasrainett/autoinstall}"
latest=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null \
  | grep -m1 '"tag_name"' | cut -d'"' -f4 | sed 's/^v//')
# No published release, or no network: nothing can be claimed about being out of date, and
# guessing would nag on every start. Silence is the honest answer.
[ -n "$latest" ] || exit 0

[ "$current" = "$latest" ] && exit 0

# Pre-release suffixes are compared separately, because `sort -V` gets them backwards: it ranks
# 0.1.0-beta.1 *above* 0.1.0, so someone running a beta would never be offered the release it was
# a beta of. Found by exercising the comparison directly rather than trusting sort.
base_current=${current%%-*}
base_latest=${latest%%-*}

if [ "$base_current" = "$base_latest" ]; then
  # Same release; a suffix on the local one means it is a pre-release of it, so the plain release
  # is newer. The reverse cannot happen — /releases/latest never returns a pre-release.
  [ "$current" != "$base_current" ] && exit 2
  exit 0
fi

# Different releases: only ever newer-upstream counts. A local build ahead of the latest release
# is not "out of date".
newest=$(printf '%s\n%s\n' "$base_current" "$base_latest" | sort -V | tail -1)
[ "$newest" = "$base_current" ] && exit 0
exit 2
