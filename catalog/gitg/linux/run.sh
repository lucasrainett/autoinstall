#!/usr/bin/env bash
# Starts the application. Optional operation: an entry without one simply cannot be launched from
# the tool, which is the honest answer for a command-line utility with nothing to open.
#
# Deliberately does not exec into the foreground or wait: the caller detaches this so the app
# outlives the tool, and a GUI app holding the terminal would freeze the interface behind it.
#
# Also deliberately unscoped, unlike this catalog's install and remove commands, which must name
# --user or --system because installing into the wrong one is a real mistake. `run` is the
# opposite: the app should be found wherever it actually lives. Scoping it to --user broke launch
# for every system-installed app — 83 of the 95 flatpaks on the machine this was found on.
set -euo pipefail

flatpak run org.gnome.gitg "$@"
