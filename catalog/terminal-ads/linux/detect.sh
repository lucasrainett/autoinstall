#!/usr/bin/env bash
# Exit 0 = no terminal advertising is enabled, 1 = some is.
#
# A distribution that never shipped these — Zorin OS, Debian — has nothing to disable, and the
# desired state ("no adverts") already holds. Reporting that as unsatisfied would leave an entry
# permanently unfixable on machines that were never affected.
if [ -f /etc/default/motd-news ]; then
  grep -qE '^ENABLED=0' /etc/default/motd-news || exit 1
fi

if command -v pro >/dev/null 2>&1; then
  # `pro config show` prints the current value; anything but False means the upsell is on.
  news=$(pro config show apt_news 2>/dev/null | awk '{print $NF}')
  [ "$news" = "False" ] || [ -z "$news" ] || exit 1
fi
exit 0
