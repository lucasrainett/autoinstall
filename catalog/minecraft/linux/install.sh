#!/usr/bin/env bash
set -euo pipefail

# Checked explicitly: without it the script dies with a bare "command not found" and exit 127,
# which tells the user nothing about what to do. The startup scan also warns when a package
# manager the catalog needs is missing, but a script run by hand must explain itself too.
if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak is not installed; install it (and add the Flathub remote) then re-run this entry." >&2
  exit 1
fi

# Every flatpak command names its installation. Flathub is commonly configured in more than one
# installation at once — Zorin OS ships a system flathub alongside the per-user one — and an
# unscoped command then fails with "No remote chosen to resolve matches for <app>" under
# --noninteractive. That single omission accounted for 18 of the 22 failures on a real machine.
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub com.mojang.Minecraft -y --noninteractive
