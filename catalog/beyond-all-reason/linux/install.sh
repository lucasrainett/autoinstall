#!/usr/bin/env bash
set -euo pipefail

# Checked explicitly: without it the script dies with a bare "command not found" and exit 127,
# which tells the user nothing about what to do.
if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak is not installed; install it (and add the Flathub remote) then re-run this entry." >&2
  exit 1
fi

# Every flatpak command names its installation. Flathub is commonly configured in more than one
# installation at once — Zorin OS ships a system flathub alongside the per-user one — and an
# unscoped command then fails with "No remote chosen to resolve matches for <app>" under
# --noninteractive.
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub info.beyondallreason.bar -y --noninteractive
