#!/usr/bin/env bash
# Exit 0 = installed and current, 1 = not installed, 2 = update available.
# The exit-2 path is what makes the plan engine able to offer an update at all; without it an
# installed entry is always "already satisfied" and can never be brought up to date.
# `Python.Python.3` is not a package. In winget-pkgs it is a namespace directory whose children
# are the real packages — Python.Python.3.12, .3.13, .3.14 — so `-e` (exact) matched nothing and
# every install reported "No package found matching input criteria". It had never worked; nothing
# noticed because no Windows lifecycle run had ever completed.
#
# Presence and removal deliberately match the family rather than one minor version: a machine with
# 3.13 already on it should read as "Python is installed", not as "the wrong Python". Only the
# install has to name a concrete package, and that is the current stable series.
#
# No -e here, so `--id Python.Python.3` matches any Python.Python.3.x by prefix.
winget list --id Python.Python.3 --accept-source-agreements 2>/dev/null | grep -qi "Python.Python.3\." || exit 1

# `winget upgrade --id` lists the package only when an upgrade is actually available.
if winget upgrade --id Python.Python.3 --accept-source-agreements --disable-interactivity 2>/dev/null | grep -qi "Python.Python.3\."; then
  exit 2
fi
exit 0
