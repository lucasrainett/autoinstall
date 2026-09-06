#!/usr/bin/env bash
# Exit 0 = hardening applied, 1 = not applied.
# Checks for the drop-in this entry installs. Reading it needs no elevation: /etc/ssh/sshd_config.d
# is world-readable, which matters because the startup scan runs unelevated.
[ -f /etc/ssh/sshd_config.d/99-autoinstall-hardening.conf ]
