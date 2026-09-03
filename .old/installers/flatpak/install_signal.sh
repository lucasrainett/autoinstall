#!/usr/bin/env bash
# Signal - End-to-end encrypted messaging app.
# Private messenger for text, voice, and video calls.
# https://signal.org

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info org.signal.Signal &>/dev/null && echo "Signal already installed, skipping." && exit 0
flatpak install org.signal.Signal -y --noninteractive

flatpak override --env=SIGNAL_PASSWORD_STORE=gnome-libsecret org.signal.Signal