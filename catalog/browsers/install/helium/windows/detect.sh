#!/usr/bin/env bash
# Exit 0 if Helium is already installed, non-zero otherwise. Helium has no winget package
# (verified against the winget-pkgs repo and winget's own search API — zero results), so this
# checks the Windows uninstall registry directly instead of querying winget, matching how
# Chromium-family installers (Helium is built on ungoogled-chromium-windows' packaging) register
# themselves for per-user installs. Unverified against a real Windows Helium install.
reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Helium" &>/dev/null
