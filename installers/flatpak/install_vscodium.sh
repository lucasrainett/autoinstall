#!/usr/bin/env bash
# VSCodium - VS Code without Microsoft telemetry.
# Community-driven, freely-licensed build of VS Code.
# https://vscodium.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info com.vscodium.codium &>/dev/null && echo "Vscodium already installed, skipping." && exit 0
flatpak install com.vscodium.codium -y --noninteractive
