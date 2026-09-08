#!/usr/bin/env bash
# Starts the application. Optional operation: an entry without one simply cannot be started from
# the tool, which is the honest answer for a command-line utility with nothing to open.
#
# The bundle name comes from the cask's own artifact list (formulae.brew.sh), not from the entry
# name — they differ more often than you would expect. This one installs "Finicky.app".
set -euo pipefail

open -a "Finicky.app" --args "$@"
