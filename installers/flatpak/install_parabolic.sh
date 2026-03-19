#!/usr/bin/env bash
# Parabolic - Video and audio downloader.
# Download from YouTube and other sites using yt-dlp with a GTK interface.
# https://github.com/NickvisionApps/Parabolic

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info org.nickvision.tubeconverter &>/dev/null && echo "Parabolic already installed, skipping." && exit 0
flatpak install org.nickvision.tubeconverter -y --noninteractive
