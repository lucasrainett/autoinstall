#!/usr/bin/env bash
set -euo pipefail

MARKER="# autoinstall: tracker block"

grep -q "^${MARKER}$" /etc/hosts 2>/dev/null || exit 0

# Deletes from the marker to its end marker inclusive. Anything the user added outside the block —
# their own entries, another tool's block — is untouched, which is the whole point of writing a
# delimited block rather than individual lines.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
sed "/^${MARKER}\$/,/^${MARKER} end\$/d" /etc/hosts > "$TMP"
sudo cp "$TMP" /etc/hosts

sudo dscacheutil -flushcache 2>/dev/null || true
sudo killall -HUP mDNSResponder 2>/dev/null || true

echo "Tracker blocking removed."
