#!/usr/bin/env bash
# Clean up installer files left in ~/Downloads after app installations.
# Removes .dmg, .pkg, .tar.gz, and .zip installer files.

cd ~/Downloads || exit 0

PATTERNS=(
    "*.dmg"
    "*.pkg"
    "*.tar.gz"
)

FOUND=false
for PATTERN in "${PATTERNS[@]}"; do
    FILES=$(ls $PATTERN 2>/dev/null)
    if [ -n "$FILES" ]; then
        echo "Removing: $FILES"
        rm -f $PATTERN
        FOUND=true
    fi
done

$FOUND || echo "No installer files to clean up."
