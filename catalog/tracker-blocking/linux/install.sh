#!/usr/bin/env bash
set -euo pipefail

MARKER="# autoinstall: tracker block"
BLOCKLIST="$(dirname "$0")/../hosts-blocklist.txt"

if [ ! -f "$BLOCKLIST" ]; then
  echo "Blocklist not found next to this entry: $BLOCKLIST" >&2
  exit 1
fi

# Already applied: do nothing rather than appending a second copy. Re-running an entry must be
# safe, and appending would grow /etc/hosts without bound.
if grep -q "^${MARKER}$" /etc/hosts 2>/dev/null; then
  echo "Tracker blocking is already applied."
  exit 0
fi

# Built in one pass and appended once, as a single marked block: removal then strips exactly what
# was added, with no need to recognise individual lines that the user may since have edited.
# No blank separator before the marker: it would sit *outside* the deleted range and survive
# removal, leaving /etc/hosts one line longer after every apply/revert cycle. Instead the file is
# given a trailing newline first, so the marker can never be appended onto someone else's entry.
if [ -s /etc/hosts ] && [ "$(tail -c1 /etc/hosts | wc -l)" -eq 0 ]; then
  echo | sudo tee -a /etc/hosts > /dev/null
fi

{
  printf '%s\n' "$MARKER"
  grep -v '^\s*#' "$BLOCKLIST" | grep -v '^\s*$' | while read -r domain; do
    printf '0.0.0.0 %s\n' "$domain"
  done
  printf '%s end\n' "$MARKER"
} | sudo tee -a /etc/hosts > /dev/null

echo "Tracker blocking applied."
