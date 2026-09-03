#!/usr/bin/env bash
# Exit 0 = both limits are raised, 1 = not.
#
# Reads the drop-in files rather than the live values: a live value could have been set by
# something else, and this entry should report on what it itself configured.
[ -f /etc/sysctl.d/99-autoinstall-dev.conf ] || exit 1
[ -f /etc/security/limits.d/99-autoinstall-dev.conf ] || exit 1
grep -q "^fs.inotify.max_user_watches" /etc/sysctl.d/99-autoinstall-dev.conf 2>/dev/null || exit 1
grep -q "nofile" /etc/security/limits.d/99-autoinstall-dev.conf 2>/dev/null || exit 1
exit 0
