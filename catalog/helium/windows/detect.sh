#!/usr/bin/env bash
# Exit 0 if Helium is already installed, non-zero otherwise. Helium has no winget package
# (verified against the winget-pkgs repo and winget's own search API — zero results), so this
# checks the Windows uninstall registry directly instead of querying winget, matching how
# Chromium-family installers (Helium is built on ungoogled-chromium-windows' packaging) register
# themselves for per-user installs. Unverified against a real Windows Helium install.
# MSYS_NO_PATHCONV, because this runs under Git Bash: an argument that looks like a POSIX path is
# rewritten to a Windows one before the native program sees it, so /s becomes something like
# C:/Program Files/Git/s. reg.exe answered "ERROR: Invalid syntax", VLC's uninstaller took /S as a
# path and silently did nothing while still exiting 0, and Helium's installer ignored
# /silent /install the same way. The switch is passed through unchanged with this set.
MSYS_NO_PATHCONV=1 reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Helium" &>/dev/null
