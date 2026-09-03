#!/usr/bin/env bash
# Exit 0 = the hardening is applied, 1 = not.
#
# Checks the drop-in file *and* a representative sample of live values: the file alone could have
# been written and never loaded, and a live value alone could have been set by something else.
[ -f /etc/sysctl.d/99-autoinstall-network.conf ] || exit 1

[ "$(sysctl -n net.ipv4.conf.all.rp_filter 2>/dev/null)" = "1" ] || exit 1
[ "$(sysctl -n net.ipv4.conf.default.rp_filter 2>/dev/null)" = "1" ] || exit 1
[ "$(sysctl -n net.ipv4.tcp_syncookies 2>/dev/null)" = "1" ] || exit 1
[ "$(sysctl -n net.ipv4.conf.all.accept_redirects 2>/dev/null)" = "0" ] || exit 1
[ "$(sysctl -n net.ipv4.conf.default.accept_redirects 2>/dev/null)" = "0" ] || exit 1
exit 0
