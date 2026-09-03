#!/usr/bin/env bash
set -euo pipefail

# osascript rather than `defaults write`: setting the preference directly does not notify running
# applications, so the appearance only changes after a restart. Telling System Events to flip it
# applies immediately, the same as using the Settings pane.
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to true'
echo "Dark mode enabled."
