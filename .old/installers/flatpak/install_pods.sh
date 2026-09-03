#!/usr/bin/env bash
# Pods - Podman container manager with a GTK interface.
# Create, manage, and monitor containers and images.
# Requires podman (installed by DistroShelf step).
# https://github.com/marhkb/Pods

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.github.marhkb.Pods &>/dev/null && echo "Pods already installed, skipping." && exit 0
flatpak install com.github.marhkb.Pods -y --noninteractive
