#!/usr/bin/env bash
set -euo pipefail

# Own files rather than appending to /etc/sysctl.conf: appending cannot be undone precisely, and a
# package update replacing the main file would silently drop the setting.
sudo tee /etc/sysctl.d/99-autoinstall-dev.conf > /dev/null <<'CONF'
# Written by autoinstall (dev-tools/configure/system-limits). Delete this file to revert.
# The kernel default of 8192 watchers is exhausted by a single large node_modules tree, and the
# symptom is silent: the editor simply stops seeing file changes.
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 1024
CONF

sudo tee /etc/security/limits.d/99-autoinstall-dev.conf > /dev/null <<'CONF'
# Written by autoinstall (dev-tools/configure/system-limits). Delete this file to revert.
* soft nofile 65536
* hard nofile 65536
CONF

sudo sysctl --system > /dev/null

echo "Developer limits raised. The open-file limit applies to new sessions."
