#!/usr/bin/env bash
# Clean up installer files left in ~/Downloads after app installations.
# Removes .dmg, .pkg, and .tar.gz installer files.

cd ~/Downloads || exit 0

FOUND=false
for f in *.dmg *.pkg *.tar.gz; do
    [ -f "$f" ] || continue
    echo "Removing: $f"
    rm -f "$f"
    FOUND=true
done

$FOUND || echo "No installer files to clean up."
